"""
Découpe un élève dessiné en T-pose (fond blanc) en marionnette articulée de six pièces.

Usage : python3 scripts/decoupe.py <image source> <nom> <hauteur cible> <sortie.png> [--ver]
Écrit la texture (2048 × 512, pièces côte à côte) et affiche l'entrée de `rig.ts` en JSON.

- Le trait est égalisé à l'échelle finale : le squelette de l'encre est redessiné à TRAIT pixels.
- Humanoïde (aliens) : tête, tronc, deux bras, deux jambes, coupés droit aux attaches
  (cou, épaules, hanches) ; les bouts coupés passent derrière le tronc ou sous la tête.
- `--ver` (vers de terre, sans bras ni jambes) : la tête au-dessus de la chasuble, le tronc
  jusqu'au bas de la chasuble, la queue en guise de jambe gauche ; bras et jambe droite vides.
  L'attache du bras gauche est le haut de la tête : on attrape le ver par la tête.
"""

import json
import sys

import cv2
import numpy as np
from skimage.morphology import skeletonize

TRAIT = 9
LARGEUR, HAUTEUR = 2048, 512
ECART = 16


def charger(src, hauteur):
    im = cv2.imread(src)
    rgb = im.astype(int)
    # Fond : remplissage depuis les bords sur le quasi-blanc.
    h, w = im.shape[:2]
    masque = np.zeros((h + 2, w + 2), np.uint8)
    fl = im.copy()
    for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        cv2.floodFill(fl, masque, p, (255, 0, 255), (18,) * 3, (18,) * 3, flags=4 | cv2.FLOODFILL_FIXED_RANGE)
    alpha = np.where(masque[1:-1, 1:-1] > 0, 0, 255).astype(np.uint8)
    ys, xs = np.nonzero(alpha)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im, alpha = im[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
    k = hauteur / im.shape[0]
    taille = (round(im.shape[1] * k), round(im.shape[0] * k))
    im = cv2.resize(im, taille, interpolation=cv2.INTER_AREA)
    alpha = cv2.resize(alpha, taille, interpolation=cv2.INTER_AREA)
    # Trait égalisé : l'encre (sombre et peu saturée) est redessinée à TRAIT pixels.
    rgb = im.astype(int)
    encre = ((rgb.max(2) < 100) & ((rgb.max(2) - rgb.min(2)) < 45) & (alpha > 128)).astype(np.uint8)
    sq = skeletonize(encre > 0).astype(np.uint8)
    neuve = cv2.dilate(sq, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (TRAIT, TRAIT))) | encre
    im[neuve > 0] = (25, 25, 25)
    # Le contour extérieur aussi : un liseré d'encre autour de la silhouette.
    plein = (alpha > 128).astype(np.uint8)
    bord = plein - cv2.erode(plein, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (TRAIT, TRAIT)))
    im[bord > 0] = (25, 25, 25)
    rgba = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA)
    rgba[..., 3] = np.where(alpha > 128, 255, 0)
    return rgba


def runs(ligne):
    """Plages [début, fin) des pixels pleins d'une ligne."""
    d = np.diff(np.concatenate([[0], ligne.astype(np.int8), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]))


def humanoide(img):
    a = img[..., 3] > 0
    h, w = a.shape
    largeur = a.sum(1)
    # Bande des bras : les lignes les plus larges (T-pose).
    # (les lignes contiguës autour de la plus large : une jupe large n'en fait pas partie).
    lmax = largeur.max()
    yb = int(np.argmax(largeur))
    by0 = by1 = yb
    while by0 > 0 and largeur[by0 - 1] > lmax * 0.7:
        by0 -= 1
    while by1 < h - 1 and largeur[by1 + 1] > lmax * 0.7:
        by1 += 1
    by1 += 1
    # Tronc : les colonnes pleines juste sous les bras.
    # (on descend un peu, sous les mains qui pendent, et on garde la plage du milieu).
    centre = int(np.nonzero(a[by1:])[1].mean())
    y_t = min(h - 1, by1 + max(8, int(h * 0.07)))
    plages = runs(a[y_t])
    tx0, tx1 = min(plages, key=lambda r: 0 if r[0] <= centre < r[1] else abs((r[0] + r[1]) / 2 - centre))
    tx0, tx1 = int(tx0), int(tx1)
    # Cou : la ligne la plus étroite entre le haut et les bras (dans le tiers du bas de cette zone).
    haut = np.nonzero(a.any(1))[0].min()
    zone = range(haut + (by0 - haut) // 3, by0)
    cou = min(zone, key=lambda y: largeur[y] if largeur[y] > 0 else 10**9)
    # Entrejambe : première ligne sous les bras où le bas du corps se sépare en deux.
    milieu = (tx0 + tx1) // 2
    entre = None
    for y in range(by1 + (h - by1) // 4, h):
        if not a[y, milieu - 2 : milieu + 3].any() and len(runs(a[y])) >= 2:
            entre = y
            break
    # Jambes collées (pantalon, jupe) : on coupe quand même aux hanches, au même endroit que chez
    # les autres élèves, et les jambes se séparent par le milieu.
    plafond = by1 + int((h - by1) * 0.5)
    if entre is None or entre > plafond:
        entre = plafond
    pieds_x = milieu
    pieces = {}

    def piece(nom, y0, y1, x0, x1, pivot, masque=None):
        sel = np.zeros_like(a)
        sel[y0:y1, x0:x1] = True
        if masque is not None:
            sel &= masque
        ys, xs = np.nonzero(sel & a)
        cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        morceau = img[cy0:cy1, cx0:cx1].copy()
        morceau[..., 3] = np.where(sel[cy0:cy1, cx0:cx1], morceau[..., 3], 0)
        pieces[nom] = (morceau, (pivot[0] - cx0, pivot[1] - cy0), pivot)

    marge = TRAIT
    ym = (by0 + by1) // 2
    piece('brasG', by0 - marge, by1 + marge, 0, tx0 + marge, (tx0 + marge * 0.5, ym))
    piece('brasD', by0 - marge, by1 + marge, tx1 - marge, w, (tx1 - marge * 0.5, ym))
    # La tête ne prend rien des bras s'ils montent jusqu'au cou.
    sans_bras = np.ones_like(a)
    sans_bras[by0 - marge :, :tx0] = False
    sans_bras[by0 - marge :, tx1:] = False
    piece('tete', 0, cou + marge, 0, w, (milieu, cou), sans_bras)
    piece('tronc', cou, entre + marge, tx0, tx1, (milieu, entre))
    piece('jambeG', entre - marge, h, 0, milieu, ((tx0 + milieu) // 2, entre))
    piece('jambeD', entre - marge, h, milieu, w, ((milieu + tx1) // 2, entre))
    bout = np.nonzero(a[by0:by1, : tx0].any(0))[0].min()
    main = [float(bout - pieces['brasG'][2][0]), 0.0]
    return pieces, pieds_x, float(by1 - by0), main


def ver(img):
    a = img[..., 3] > 0
    h, w = a.shape
    rgb = img[..., :3].astype(int)
    # La chasuble : pixels jaune moutarde (B < 110, R > 170, G > 130).
    chas = (rgb[..., 0] < 110) & (rgb[..., 2] > 170) & (rgb[..., 1] > 130) & a
    lignes = np.nonzero(chas.sum(1) > 6)[0]
    c0, c1 = lignes.min(), lignes.max() + 1
    xs = np.nonzero(a.any(0))[0]
    milieu = int(np.nonzero(a[c0])[0].mean())
    pieces = {}

    def piece(nom, y0, y1, pivot):
        ys, xs2 = np.nonzero(a[y0:y1])
        cy0, cy1 = y0 + ys.min(), y0 + ys.max() + 1
        cx0, cx1 = xs2.min(), xs2.max() + 1
        morceau = img[cy0:cy1, cx0:cx1].copy()
        pieces[nom] = (morceau, (pivot[0] - cx0, pivot[1] - cy0), pivot)

    marge = TRAIT
    haut = np.nonzero(a.any(1))[0].min()
    piece('tete', 0, c0 + marge * 2, (milieu, c0 + marge))
    piece('tronc', c0, c1 + marge, (milieu, c1))
    piece('jambeG', c1 - marge, h, (milieu, c1))
    vide = np.zeros((2, 2, 4), np.uint8)
    for nom in ['jambeD', 'brasD']:
        pieces[nom] = (vide, (1, 1), (milieu, c1))
    # On attrape le ver par le haut de la tête.
    pieces['brasG'] = (vide, (1, 1), (milieu, haut + marge * 2))
    return pieces, int(xs.mean()), 40.0, [0.0, -1.0]


def main():
    src, nom, hauteur, sortie = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    est_ver = '--ver' in sys.argv
    img = charger(src, hauteur)
    pieces, pieds_x, bras, main_ = (ver if est_ver else humanoide)(img)
    h = img.shape[0]
    tex = np.zeros((HAUTEUR, LARGEUR, 4), np.uint8)
    x = 0
    rig = {'hauteur': h, 'bras': round(bras, 1), 'main': [round(v, 1) for v in main_], 'pieces': {}}
    for n in ['jambeG', 'jambeD', 'brasG', 'brasD', 'tronc', 'tete']:
        morceau, piv, abs_ = pieces[n]
        ph, pw = morceau.shape[:2]
        if ph > HAUTEUR or x + pw > LARGEUR:
            raise SystemExit(f'{nom} : la pièce {n} ne tient pas dans la texture ({pw}×{ph})')
        tex[:ph, x : x + pw] = morceau
        rig['pieces'][n] = {
            'cadre': [x, 0, pw, ph],
            'pivot': [round(float(piv[0]), 1), round(float(piv[1]), 1)],
            'pos': [round(float(abs_[0] - pieds_x), 1), round(float(abs_[1] - h), 1)],
        }
        x += pw + ECART
    cv2.imwrite(sortie, tex)
    print(json.dumps({nom: rig}))


if __name__ == '__main__':
    main()
