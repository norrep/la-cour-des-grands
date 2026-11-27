"""Tenue miroir d'une bande (DE.1) : recolore la chasuble des élèves d'une équipe, pour le seul
cas où deux bandes identiques s'affrontent. Seuls les pixels de la teinte de la chasuble changent
(le corps, le trait et les accessoires restent) ; ombres et lumières sont gardées.

    python3 scripts/tenue-miroir.py vers   # public/skins/dodu/vers-*-corps.png  -> vers2-*-corps.png
    python3 scripts/tenue-miroir.py aliens # public/skins/dodu/aliens-*.png      -> aliens2-*.png
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Équipe : (teinte de la chasuble, de, à, sur l'échelle 0-255 de PIL), teinte visée, saturation ×.
REGLAGES = {
    'vers': (16, 44, 128, 0.95),  # jaune moutarde -> turquoise
    'aliens': (168, 214, 14, 1.05),  # violet -> orange
}
ROLES = ['chouchou', 'contagieux', 'delegue', 'fouine', 'grand', 'petit', 'populaire', 'rapporteuse']
DOSSIER = Path(__file__).resolve().parent.parent / 'public/skins/dodu'


def recolorer(chemin: Path, sortie: Path, de: int, a: int, vise: int, sat: float) -> None:
    im = Image.open(chemin).convert('RGBA')
    alpha = im.getchannel('A')
    hsv = np.array(im.convert('RGB').convert('HSV')).astype(np.int32)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    zone = (h >= de) & (h <= a) & (s > 30) & (v > 40)
    centre = (de + a) // 2
    h2 = np.where(zone, (h - centre + vise) % 256, h)
    s2 = np.where(zone, np.clip(s * sat, 0, 255), s)
    rgb = Image.fromarray(np.stack([h2, s2, v], -1).astype(np.uint8), 'HSV').convert('RGB')
    rgb.putalpha(alpha)
    rgb.save(sortie, optimize=True)


def main() -> None:
    equipe = sys.argv[1]
    de, a, vise, sat = REGLAGES[equipe]
    suffixe = '-corps' if equipe == 'vers' else ''
    for role in ROLES:
        src = DOSSIER / f'{equipe}-{role}{suffixe}.png'
        recolorer(src, DOSSIER / f'{equipe}2-{role}{suffixe}.png', de, a, vise, sat)
        print(src.name)


if __name__ == '__main__':
    main()
