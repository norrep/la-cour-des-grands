"""
Vers de terre en un seul morceau (DG.19) : le ver n'a ni bras ni jambes, il n'est plus découpé.
Le corps entier, trait égalisé comme les autres élèves (`decoupe.charger`), est déformé en jeu le
long d'une colonne souple (`ui/ver.ts`) : il ondule, s'étire, s'écrase, sans jointure visible.

Usage : python3 scripts/ver-entier.py <dossier des dessins ver-<rôle>.png> <dossier de sortie>
Écrit `vers-<rôle>-corps.png` : la silhouette centrée sur l'axe des pieds, les pieds en bas.
"""

import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from decoupe import charger  # noqa: E402

# Hauteurs des marionnettes (rigEquipes.ts) : le ver entier garde la même taille.
HAUTEURS = {
    'chouchou': 748,
    'contagieux': 748,
    'delegue': 766,
    'fouine': 722,
    'grand': 880,
    'petit': 581,
    'populaire': 757,
    'rapporteuse': 730,
}


def main():
    src, sortie = sys.argv[1], sys.argv[2]
    for role, h in HAUTEURS.items():
        img = charger(os.path.join(src, f'ver-{role}.png'), h)
        a = img[..., 3] > 0
        xs = np.nonzero(a.any(0))[0]
        axe = int(xs.mean())  # comme `decoupe.ver` : l'axe des pieds des marionnettes
        demi = max(axe - xs.min(), xs.max() + 1 - axe) + 2
        tex = np.zeros((img.shape[0], demi * 2, 4), np.uint8)
        x0 = demi - axe
        tex[:, x0 : x0 + img.shape[1]] = img
        cv2.imwrite(os.path.join(sortie, f'vers-{role}-corps.png'), tex)
        print(role, tex.shape[1], tex.shape[0])


if __name__ == '__main__':
    main()
