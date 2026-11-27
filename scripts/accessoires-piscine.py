"""
Piscine v3 (DP.5–DP.7) : le casier qui remplace la cabane, et les accessoires qui animent les
côtés (serviettes, tongs, ballon, plante). Dessinés ici, au trait noir épais des îlots, sans rien
générer. Chaque image fait 512 × 512 (dessinée à 4 × puis réduite pour un trait lisse).

  casier.png / casier-murs.png  la base d'une bande ; les murs se teintent à la couleur de l'équipe
  serviette-a.png, serviette-b.png, tongs.png, ballon.png, plante.png

Usage : python3 scripts/accessoires-piscine.py public/cartes/piscine
"""
import math
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

dossier = sys.argv[1]
S = 4
T = 512 * S
ENCRE = (29, 29, 27, 255)
TRAIT = 13 * S


def toile():
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def P(pts):
    return [(x * S, y * S) for x, y in pts]


def contour(d, pts, largeur=TRAIT):
    pts = P(pts)
    d.line(pts + [pts[0]], fill=ENCRE, width=largeur, joint='curve')
    for x, y in pts:
        d.ellipse([x - largeur / 2, y - largeur / 2, x + largeur / 2, y + largeur / 2], fill=ENCRE)


def trait(d, pts, largeur=TRAIT):
    pts = P(pts)
    d.line(pts, fill=ENCRE, width=largeur, joint='curve')
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - largeur / 2, y - largeur / 2, x + largeur / 2, y + largeur / 2], fill=ENCRE)


def face(d, pts, couleur):
    d.polygon(P(pts), fill=couleur)


def finir(im, nom):
    im.resize((512, 512), Image.LANCZOS).save(f'{dossier}/{nom}.png', optimize=True)


def add(a, b, k=1.0):
    return (a[0] + b[0] * k, a[1] + b[1] * k)


def ovale(d, cx, cy, rx, ry, couleur, largeur=TRAIT, n=48, rot=0.0):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot)))
    face(d, pts, couleur)
    if largeur:
        contour(d, pts, largeur)
    return pts


# --- Le casier : une grande boîte en perspective, porte à aérations côté gauche --------------
u = (150, 76)  # largeur de la porte (vers la droite et le bas)
v = (112, -62)  # profondeur
h = 340
A = (100, 412)
B = add(A, u)
C = add(B, v)
A2, B2, C2 = (A[0], A[1] - h), (B[0], B[1] - h), (C[0], C[1] - h)
D2 = add(A2, v)
avant = [A, B, B2, A2]
cote = [B, C, C2, B2]
dessus = [A2, B2, C2, D2]

BLANC, GRIS_COTE, GRIS_DESSUS = (250, 250, 250, 255), (205, 210, 222, 255), (238, 240, 246, 255)
im, d = toile()
murs, dm = toile()
for pts, c, cm in ((avant, BLANC, (242, 242, 242, 255)), (cote, GRIS_COTE, (205, 205, 205, 255)),
                   (dessus, GRIS_DESSUS, (250, 250, 250, 255))):
    face(d, pts, c)
    face(dm, pts, cm)


def sur_porte(s, t):
    """Point de la porte : s le long de la largeur (0..1), t en hauteur depuis le bas (0..1)."""
    return (A[0] + u[0] * s, A[1] + u[1] * s - h * t)


# Porte en retrait, aérations, poignée, petite étiquette.
porte = [sur_porte(0.13, 0.05), sur_porte(0.87, 0.05), sur_porte(0.87, 0.95), sur_porte(0.13, 0.95)]
contour(d, porte, 8 * S)
for t in (0.86, 0.80, 0.74):
    trait(d, [sur_porte(0.3, t), sur_porte(0.7, t)], 9 * S)
for t in (0.20, 0.14):
    trait(d, [sur_porte(0.3, t), sur_porte(0.7, t)], 9 * S)
trait(d, [sur_porte(0.76, 0.56), sur_porte(0.76, 0.44)], 12 * S)
etiquette = [sur_porte(0.3, 0.67), sur_porte(0.58, 0.67), sur_porte(0.58, 0.61), sur_porte(0.3, 0.61)]
face(d, etiquette, (255, 244, 200, 255))
contour(d, etiquette, 6 * S)
# Pieds sous la boîte.
for s in (0.12, 0.88):
    x, y = sur_porte(s, 0)
    trait(d, [(x, y), (x, y + 18)], 14 * S)
x, y = C
trait(d, [(x - 12, y - 4), (x - 12, y + 14)], 14 * S)
# Arêtes.
for pts in (avant, cote, dessus):
    contour(d, pts)
# Les murs ne doivent pas couvrir l'encre : on retire tout pixel sombre (élargi d'un rien).
encre = im.split()[3].point(lambda a: 0)
gris = im.convert('L')
masque = Image.eval(gris, lambda g: 255 if g < 120 else 0)
masque = ImageChops.multiply(masque, im.split()[3])
masque = masque.filter(ImageFilter.MaxFilter(9))
al = ImageChops.subtract(murs.split()[3], masque)
# On ne teinte pas l'étiquette, ni la porte en retrait (elle garde le blanc de la boîte).
mz, dz = toile()
face(dz, etiquette, (255, 255, 255, 255))
al = ImageChops.subtract(al, mz.split()[3].filter(ImageFilter.MaxFilter(9)))
murs.putalpha(al)
finir(im, 'casier')
finir(murs, 'casier-murs')

# --- Serviettes à rayures, posées à plat (vues un peu de biais) -------------------------------
def serviette(nom, fond, raie):
    im, d = toile()
    a, b = (60, 150), (452, 150)
    l, k = 210, 0.0
    coins = [(70, 140), (442, 110), (458, 330), (86, 370)]
    face(d, coins, fond)
    # Rayures parallèles aux petits côtés.
    for f in (0.18, 0.30, 0.70, 0.82):
        p0 = (coins[0][0] + (coins[1][0] - coins[0][0]) * f, coins[0][1] + (coins[1][1] - coins[0][1]) * f)
        p1 = (coins[3][0] + (coins[2][0] - coins[3][0]) * f, coins[3][1] + (coins[2][1] - coins[3][1]) * f)
        w = 0.06
        q0 = (coins[0][0] + (coins[1][0] - coins[0][0]) * (f + w), coins[0][1] + (coins[1][1] - coins[0][1]) * (f + w))
        q1 = (coins[3][0] + (coins[2][0] - coins[3][0]) * (f + w), coins[3][1] + (coins[2][1] - coins[3][1]) * (f + w))
        face(d, [p0, q0, q1, p1], raie)
    contour(d, coins)
    # Franges aux deux bouts.
    for (x0, y0), (x1, y1), sens in (((70, 140), (86, 370), -1), ((442, 110), (458, 330), 1)):
        for i in range(1, 7):
            t = i / 7
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            trait(d, [(x, y), (x + sens * 26, y + 2)], 8 * S)
    finir(im, nom)


serviette('serviette-a', (255, 170, 190, 255), (255, 250, 240, 255))
serviette('serviette-b', (120, 200, 235, 255), (255, 216, 77, 255))

# --- Tongs -----------------------------------------------------------------------------------
im, d = toile()
for cx, cy, rot, c in ((190, 250, -0.25, (255, 120, 90, 255)), (330, 270, 0.2, (255, 120, 90, 255))):
    ovale(d, cx, cy, 62, 150, c, rot=rot)
    # Bride en V.
    s, co = math.sin(rot), math.cos(rot)
    pt = lambda x, y: (cx + x * co - y * s, cy + x * s + y * co)
    trait(d, [pt(-46, 10), pt(0, -92), pt(46, 10)], 16 * S)
    d.ellipse([*(p * S for p in pt(-9, -101)), *(p * S for p in pt(9, -83))], fill=ENCRE)
finir(im, 'tongs')

# --- Ballon de plage -------------------------------------------------------------------------
im, d = toile()
cx, cy, r = 256, 256, 170
couleurs = [(255, 216, 77, 255), (255, 255, 255, 255), (111, 132, 222, 255), (255, 255, 255, 255),
            (240, 112, 95, 255), (255, 255, 255, 255)]
for i, c in enumerate(couleurs):
    a0, a1 = i * 60 - 90, (i + 1) * 60 - 90
    d.pieslice([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], a0, a1, fill=c)
for i in range(6):
    a = math.radians(i * 60 - 90)
    trait(d, [(cx, cy), (cx + r * math.cos(a), cy + r * math.sin(a))], 9 * S)
ovale(d, cx, cy, 34, 34, (255, 255, 255, 255), largeur=9 * S)
d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], outline=ENCRE, width=TRAIT)
# Reflet.
d.ellipse([(cx - 110) * S, (cy - 120) * S, (cx - 70) * S, (cy - 90) * S], fill=(255, 255, 255, 200))
finir(im, 'ballon')

# --- Plante en pot (vue de dessus, feuilles en étoile) -----------------------------------------
im, d = toile()
cx, cy = 256, 256
for i in range(9):
    a = 2 * math.pi * i / 9 + 0.3
    L = 215 if i % 2 else 185
    pointe = (cx + L * math.cos(a), cy + L * math.sin(a))
    feuille = []
    for k in range(13):
        t = k / 12
        # Feuille en goutte : large au milieu, pointue au bout.
        w = math.sin(math.pi * min(1, t * 1.15)) * 0.32 * (1 - t * 0.4)
        r = 60 + (L - 60) * t
        feuille.append((cx + r * math.cos(a - w), cy + r * math.sin(a - w)))
    for k in range(12, -1, -1):
        t = k / 12
        w = math.sin(math.pi * min(1, t * 1.15)) * 0.32 * (1 - t * 0.4)
        r = 60 + (L - 60) * t
        feuille.append((cx + r * math.cos(a + w), cy + r * math.sin(a + w)))
    face(d, feuille, (126, 200, 120, 255) if i % 2 else (98, 178, 104, 255))
    contour(d, feuille, 10 * S)
    trait(d, [(cx, cy), (cx + L * 0.8 * math.cos(a), cy + L * 0.8 * math.sin(a))], 6 * S)
ovale(d, cx, cy, 78, 78, (232, 140, 90, 255))
ovale(d, cx, cy, 56, 56, (140, 96, 70, 255), largeur=8 * S)
finir(im, 'plante')
print('ok')
