"""
Décor de la piscine en couches (DP.1) : au lieu d'une image plein écran où le bassin tombe
n'importe où selon la forme du téléphone, on fabrique des morceaux que le jeu pose autour de la
zone de jeu. Tout est dessiné à 3 × l'échelle du jeu (1 px de jeu = 3 px de texture).

  sol.png     carrelage qui se répète (4 × 4 carreaux de 36 px de jeu)

Le bassin est dessiné en code (`ui/decorPiscine.ts`) et les accessoires par
`scripts/accessoires-piscine.py` (DP.5–DP.7).

Usage : python3 scripts/couches-piscine.py public/decor/piscine.jpg public/cartes/piscine
"""
import math
import sys

from PIL import Image, ImageDraw

source, dossier = sys.argv[1], sys.argv[2]
K = 3  # px de texture par px de jeu

CREME = (254, 242, 216)
JOINT = (150, 139, 120)





def onde(t: float, graine: float) -> float:
    """Petit tremblé périodique (période 1) pour un trait fait main."""
    return math.sin(2 * math.pi * (t + graine)) * 0.6 + math.sin(4 * math.pi * (t + graine * 1.7)) * 0.4


# --- Sol : carreaux de 36 px de jeu, joints de 2 px, tremblé qui se raccorde ---------------
C = 36 * K
N = 4
T = C * N
sol = Image.new('RGB', (T, T), CREME)
d = ImageDraw.Draw(sol)
for i in range(N):
    for vertical in (True, False):
        pts = []
        for s in range(0, T + 1, 6):
            dec = onde(s / T, i * 0.37 + (0.5 if vertical else 0)) * 1.6
            p = i * C + dec
            pts.append((p, s) if vertical else (s, p))
        d.line(pts, fill=JOINT, width=2 * K)
        # Le joint qui touche le bord se répète de l'autre côté pour raccorder.
        if i == 0:
            d.line([(x + T, y) if vertical else (x, y + T) for x, y in pts], fill=JOINT, width=2 * K)
sol.save(f'{dossier}/sol.png', optimize=True)

print('ok')
