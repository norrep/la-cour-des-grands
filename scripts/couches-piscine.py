"""
Décor de la piscine en couches (DP.1) : au lieu d'une image plein écran où le bassin tombe
n'importe où selon la forme du téléphone, on fabrique des morceaux que le jeu pose autour de la
zone de jeu. Tout est dessiné à 3 × l'échelle du jeu (1 px de jeu = 3 px de texture).

  sol.png     carrelage qui se répète (4 × 4 carreaux de 36 px de jeu)
  bassin.png  bord du bassin + eau, découpé en 9 morceaux par le jeu (coins fixes)
  vague.png   la ligne d'eau du bord du haut, qui se répète en largeur
  casiers.png une rangée de casiers prise dans l'ancien décor, pour habiller les côtés

Usage : python3 scripts/couches-piscine.py public/decor/piscine.jpg public/cartes/piscine
"""
import math
import sys

from PIL import Image, ImageDraw

source, dossier = sys.argv[1], sys.argv[2]
K = 3  # px de texture par px de jeu

CREME = (254, 242, 216)
JOINT = (150, 139, 120)
ENCRE = (29, 26, 22)
EAU = (88, 201, 203)
BEIGE = (232, 216, 180)


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

# --- Bassin : trait, margelle crème, trait, eau. 9 morceaux de 100 px -----------------------
B = 480
bassin = Image.new('RGBA', (B, B), (0, 0, 0, 0))
d = ImageDraw.Draw(bassin)
trait = 2 * K
margelle = 23 * K
d.rounded_rectangle([0, 0, B - 1, B - 1], radius=8 * K, fill=ENCRE)
d.rounded_rectangle([trait, trait, B - 1 - trait, B - 1 - trait], radius=7 * K, fill=CREME)
e = trait + margelle
d.rounded_rectangle([e, e, B - 1 - e, B - 1 - e], radius=4 * K, fill=ENCRE)
d.rounded_rectangle([e + trait, e + trait, B - 1 - e - trait, B - 1 - e - trait], radius=3 * K, fill=EAU)
bassin.save(f'{dossier}/bassin.png', optimize=True)

# --- Ligne d'eau : bande beige au bord du haut, bas ondulé, se répète tous les 200 px ------
LV, HV = 400, 16 * K
vague = Image.new('RGBA', (LV, HV), (0, 0, 0, 0))
d = ImageDraw.Draw(vague)
pts = [(x, HV - 4 * K - 3 * K * (0.5 + 0.5 * math.sin(2 * math.pi * x / 200))) for x in range(0, LV + 1, 4)]
d.polygon([(0, 0), (LV, 0)] + pts[::-1], fill=BEIGE)
d.line(pts, fill=ENCRE, width=2 * K)
vague.save(f'{dossier}/vague.png', optimize=True)

# --- Casiers : une porte de l'ancien décor répétée, bouclée par le cadre, tournée -----------
deco = Image.open(source).convert('RGB')
# Coordonnées dans l'image 1080 × 1920 : rangée du haut à gauche.
porte = deco.crop((66, 30, 147, 246))
cadre_d = deco.crop((375, 30, 394, 246))
cadre_g = cadre_d.transpose(Image.FLIP_LEFT_RIGHT)
n = 6
rangee = Image.new('RGB', (cadre_g.width + n * porte.width + cadre_d.width, porte.height), CREME)
rangee.paste(cadre_g, (0, 0))
for k in range(n):
    rangee.paste(porte, (cadre_g.width + k * porte.width, 0))
rangee.paste(cadre_d, (cadre_g.width + n * porte.width, 0))
# Échelle du jeu (720 / 1080) puis × K ; portes tournées vers le bassin (rangée du côté gauche de l’écran).
f = 720 / 1080 * K
rangee = rangee.resize((round(rangee.width * f), round(rangee.height * f)), Image.LANCZOS)
rangee.rotate(90, expand=True).save(f'{dossier}/casiers.png', optimize=True)
print('ok')
