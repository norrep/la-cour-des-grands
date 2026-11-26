/**
 * Skin « Cartoon » : les huit élèves dessinés en SVG, gros trait noir un peu tremblé, aplats
 * pastel vifs, corps mous et bras en spaghetti. Chaque élève est fait de pièces séparées
 * (tête, corps avec la chasuble) pour que le pantin puisse ballotter quand on le tient.
 *
 * Repères (en pixels pour un élève de taille 100) :
 * - le cou est en (0, 0) pour la tête (qui monte) comme pour le corps (qui descend) ;
 * - le centre du numéro de la chasuble est à (0, NUMERO_Y) sous le cou.
 */
import type { Bande, RoleId } from '../../../engine/types';
import { forme, tache, trait, type P } from '../trace';

export const NOIR = '#231c26';
export const CREME = '#fff7e3';
const BLANC = '#ffffff';
const JOUES = '#ff9fb0';
export const TRAIT = 5;

export const CHASUBLE: Record<Bande, string> = { rouge: '#f0644f', bleu: '#6d84ec' };
const CHASUBLE_OMBRE: Record<Bande, string> = { rouge: '#c94a3a', bleu: '#4f64c4' };

/** Le centre du numéro, sous le cou. */
export const NUMERO_Y = 38;

/** Gabarit d'un rôle : proportions et couleurs, partagés par le portrait et le pantin. */
export interface Gabarit {
  peau: string;
  /** Couleur des bras (manches ou peau). */
  bras: string;
  pantalon: string;
  chaussure: string;
  /** Demi-largeur du corps aux épaules. */
  largeur: number;
  /** Du cou au bas de la chasuble. */
  hauteur: number;
  /** Longueur des jambes. */
  jambe: number;
  /** Longueur des bras. */
  brasLongueur: number;
  /** Bas du corps plus large (>0) ou plus étroit (<0) que les épaules : la silhouette. */
  ventre: number;
}

export const GABARITS: Record<RoleId, Gabarit> = {
  petit: {
    peau: '#ffd9b8',
    bras: '#ffd9b8',
    pantalon: '#ffd166',
    chaussure: '#e85d75',
    largeur: 31,
    hauteur: 70,
    jambe: 20,
    brasLongueur: 30,
    ventre: 0.16,
  },
  populaire: {
    peau: '#c98a5e',
    bras: '#c98a5e',
    pantalon: '#f49ac1',
    chaussure: '#ffffff',
    largeur: 28,
    hauteur: 76,
    jambe: 36,
    brasLongueur: 40,
    ventre: 0.04,
  },
  chouchou: {
    peau: '#ffe2c6',
    bras: '#fff1a8',
    pantalon: '#d9b98a',
    chaussure: '#5b3a29',
    largeur: 30,
    hauteur: 74,
    jambe: 32,
    brasLongueur: 38,
    ventre: 0.12,
  },
  rapporteuse: {
    peau: '#f6c79b',
    bras: '#f6c79b',
    pantalon: '#4fb6a8',
    chaussure: '#f0644f',
    largeur: 28,
    hauteur: 74,
    jambe: 34,
    brasLongueur: 40,
    ventre: 0.08,
  },
  fouine: {
    peau: '#e9b28a',
    bras: '#a99cd6',
    pantalon: '#3d4a7a',
    chaussure: '#231c26',
    largeur: 27,
    hauteur: 78,
    jambe: 38,
    brasLongueur: 44,
    ventre: -0.02,
  },
  contagieux: {
    peau: '#c6e6a0',
    bras: '#c6e6a0',
    pantalon: '#8a7fc0',
    chaussure: '#ffffff',
    largeur: 31,
    hauteur: 76,
    jambe: 32,
    brasLongueur: 38,
    ventre: 0.22,
  },
  delegue: {
    peau: '#a8714d',
    bras: '#e9f1ff',
    pantalon: '#3d4a7a',
    chaussure: '#231c26',
    largeur: 30,
    hauteur: 78,
    jambe: 38,
    brasLongueur: 40,
    ventre: 0.06,
  },
  grand: {
    peau: '#f3c49b',
    bras: '#f3c49b',
    pantalon: '#3d4a7a',
    chaussure: '#ffffff',
    largeur: 29,
    hauteur: 84,
    jambe: 50,
    brasLongueur: 50,
    ventre: -0.06,
  },
};

const GRAINES: Record<RoleId, number> = {
  petit: 11,
  populaire: 23,
  chouchou: 37,
  rapporteuse: 41,
  fouine: 53,
  contagieux: 67,
  delegue: 79,
  grand: 97,
};

const VALEURS: Record<RoleId, string> = {
  petit: 'J',
  populaire: '1',
  chouchou: '2',
  rapporteuse: '3',
  fouine: '4',
  contagieux: '5',
  delegue: '6',
  grand: '7',
};

// ---------------------------------------------------------------- petites briques SVG

const plein = (d: string, couleur: string, epaisseur = TRAIT) =>
  `<path d="${d}" fill="${couleur}" stroke="${NOIR}" stroke-width="${epaisseur}" stroke-linejoin="round"/>`;
const sansTrait = (d: string, couleur: string) => `<path d="${d}" fill="${couleur}"/>`;
const ligne = (d: string, epaisseur = TRAIT - 1.5, couleur = NOIR) =>
  `<path d="${d}" fill="none" stroke="${couleur}" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rond = (x: number, y: number, r: number, couleur = NOIR) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${couleur}"/>`;
const rondCerne = (x: number, y: number, r: number, couleur: string, epaisseur = TRAIT - 1) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${couleur}" stroke="${NOIR}" stroke-width="${epaisseur}"/>`;

/** Œil blanc rond avec une pupille (dx, dy : où il regarde). */
function oeil(x: number, y: number, r: number, dx = 0, dy = 0): string {
  return rondCerne(x, y, r, BLANC, 2.6) + rond(x + dx, y + dy, r * 0.48);
}

/** Paupière tombante : cache le haut de l'œil, avec un trait. */
function paupiere(x: number, y: number, r: number, couleur: string): string {
  const d = `M${x - r - 1.5} ${y + 0.5} A${r + 1.5} ${r + 1.5} 0 0 1 ${x + r + 1.5} ${y + 0.5} Z`;
  return (
    sansTrait(d, couleur) + ligne(`M${x - r - 1.5} ${y + 0.5} L${x + r + 1.5} ${y + 0.5}`, 3.5)
  );
}

/** Bras ou jambe « spaghetti » : un gros trait noir, puis la couleur par-dessus. */
export function nouille(points: readonly P[], couleur: string, epaisseur: number, graine: number) {
  const d = trait(points, graine, 0.6);
  return ligne(d, epaisseur + TRAIT * 1.4, NOIR) + ligne(d, epaisseur, couleur);
}

const main = (p: P, couleur: string) => rondCerne(p.x, p.y, 6, couleur, 3.2);
function chaussure(p: P, couleur: string, cote: number, graine: number): string {
  return plein(
    tache(p.x + cote * 4, p.y + 2, 11, 7, graine, { amp: 0.06, points: 10 }),
    couleur,
    4,
  );
}

// ---------------------------------------------------------------- têtes (cou en 0,0)

function tete(role: RoleId): string {
  const g = GABARITS[role];
  const s = GRAINES[role];
  switch (role) {
    case 'petit': {
      // Tête énorme, une seule mèche en boucle, grands yeux, sucette dans la joue.
      const t = tache(0, -30, 36, 33, s, { amp: 0.035 });
      return (
        plein(t, g.peau) +
        ligne(
          trait(
            [
              { x: 2, y: -62 },
              { x: 6, y: -76 },
              { x: -4, y: -80 },
              { x: -6, y: -70 },
              { x: 2, y: -68 },
            ],
            s,
          ),
        ) +
        rond(-24, -20, 6, JOUES) +
        rond(24, -20, 6, JOUES) +
        oeil(-13, -32, 9, 1.5, 2) +
        oeil(13, -32, 9, 1.5, 2) +
        ligne(
          trait(
            [
              { x: -6, y: -15 },
              { x: 0, y: -11 },
              { x: 6, y: -15 },
            ],
            s + 1,
          ),
        )
      );
    }
    case 'populaire': {
      // Grosse touffe en chignon, chouchou rose, lunettes cœur relevées sur le front.
      const t = tache(0, -27, 25, 27, s);
      const touffe = tache(4, -72, 22, 18, s + 2, { amp: 0.12, points: 14 });
      const cheveux = forme(
        [
          { x: -26, y: -28 },
          { x: -24, y: -48 },
          { x: -8, y: -56 },
          { x: 14, y: -56 },
          { x: 26, y: -44 },
          { x: 27, y: -28 },
          { x: 16, y: -42 },
          { x: -6, y: -44 },
        ],
        s + 3,
      );
      const coeur = (x: number) =>
        plein(
          forme(
            [
              { x, y: -40 },
              { x: x - 9, y: -48 },
              { x: x - 7, y: -55 },
              { x, y: -52 },
              { x: x + 7, y: -55 },
              { x: x + 9, y: -48 },
            ],
            s + x,
            0.4,
          ),
          '#ff6fa3',
          3,
        );
      return (
        plein(touffe, '#3a2622') +
        plein(tache(2, -56, 9, 5, s + 4, { amp: 0.04 }), '#ff6fa3', 3.5) +
        plein(t, g.peau) +
        plein(cheveux, '#3a2622') +
        coeur(-10) +
        coeur(10) +
        ligne(`M-1 -48 L1 -48`, 3) +
        ligne(
          trait(
            [
              { x: -15, y: -27 },
              { x: -9, y: -30 },
              { x: -4, y: -27 },
            ],
            s + 5,
          ),
        ) +
        ligne(
          trait(
            [
              { x: 4, y: -27 },
              { x: 9, y: -30 },
              { x: 15, y: -27 },
            ],
            s + 6,
          ),
        ) +
        plein(
          forme(
            [
              { x: -9, y: -16 },
              { x: 9, y: -16 },
              { x: 0, y: -7 },
            ],
            s + 7,
            0.5,
          ),
          '#ff8f9e',
          3,
        )
      );
    }
    case 'chouchou': {
      // Raie sur le côté bien peignée, grosses lunettes rondes, sourire satisfait.
      const t = tache(0, -27, 26, 26, s);
      const cheveux = forme(
        [
          { x: -27, y: -24 },
          { x: -26, y: -46 },
          { x: -6, y: -57 },
          { x: 18, y: -54 },
          { x: 28, y: -38 },
          { x: 27, y: -26 },
          { x: 12, y: -40 },
          { x: -4, y: -44 },
          { x: -18, y: -38 },
        ],
        s,
      );
      return (
        plein(t, g.peau) +
        plein(cheveux, '#8a5a35') +
        rondCerne(-10, -27, 10, '#e8f7ff', 3.5) +
        rondCerne(11, -27, 10, '#e8f7ff', 3.5) +
        ligne('M-0.5 -28 L1.5 -28', 3) +
        rond(-9, -26, 3.4) +
        rond(12, -26, 3.4) +
        rond(-20, -14, 5, JOUES) +
        rond(21, -14, 5, JOUES) +
        ligne(
          trait(
            [
              { x: -7, y: -12 },
              { x: 1, y: -8 },
              { x: 9, y: -13 },
            ],
            s + 1,
          ),
        )
      );
    }
    case 'rapporteuse': {
      // Deux couettes en l'air, sourcils levés, bouche ouverte : « Maîtresse !! »
      const t = tache(0, -27, 25, 26, s);
      const couette = (cote: number) =>
        plein(
          forme(
            [
              { x: cote * 20, y: -44 },
              { x: cote * 44, y: -64 },
              { x: cote * 52, y: -52 },
              { x: cote * 40, y: -46 },
              { x: cote * 24, y: -34 },
            ],
            s + cote + 5,
          ),
          '#f2c94c',
        );
      const frange = forme(
        [
          { x: -26, y: -28 },
          { x: -22, y: -48 },
          { x: 0, y: -56 },
          { x: 22, y: -48 },
          { x: 26, y: -28 },
          { x: 14, y: -40 },
          { x: 2, y: -38 },
          { x: -12, y: -40 },
        ],
        s + 2,
      );
      return (
        couette(-1) +
        couette(1) +
        plein(tache(-24, -42, 5, 5, s + 8), '#4fb6a8', 3) +
        plein(tache(24, -42, 5, 5, s + 9), '#4fb6a8', 3) +
        plein(t, g.peau) +
        plein(frange, '#f2c94c') +
        ligne(
          trait(
            [
              { x: -15, y: -38 },
              { x: -7, y: -41 },
            ],
            s + 3,
          ),
        ) +
        ligne(
          trait(
            [
              { x: 7, y: -41 },
              { x: 15, y: -38 },
            ],
            s + 4,
          ),
        ) +
        rond(-9, -30, 3.6) +
        rond(9, -30, 3.6) +
        plein(tache(0, -13, 6, 7, s + 6, { amp: 0.05 }), '#8c2f3a', 3.5)
      );
    }
    case 'fouine': {
      // Capuche, long nez pointu qui dépasse, regard en coin.
      const capuche = tache(-2, -30, 31, 32, s, { amp: 0.05 });
      const visage = tache(2, -26, 20, 21, s + 1);
      const nez = forme(
        [
          { x: 8, y: -28 },
          { x: 40, y: -22 },
          { x: 8, y: -18 },
        ],
        s + 2,
        0.6,
      );
      return (
        plein(capuche, '#a99cd6') +
        plein(visage, g.peau) +
        ligne(
          trait(
            [
              { x: -11, y: -33 },
              { x: -2, y: -31 },
            ],
            s + 3,
          ),
        ) +
        ligne(
          trait(
            [
              { x: 6, y: -33 },
              { x: 15, y: -35 },
            ],
            s + 4,
          ),
        ) +
        rond(-4, -29, 3.2) +
        rond(13, -30, 3.2) +
        plein(nez, g.peau, 4) +
        ligne(
          trait(
            [
              { x: -5, y: -12 },
              { x: 4, y: -11 },
              { x: 9, y: -14 },
            ],
            s + 5,
          ),
        ) +
        ligne(
          trait(
            [
              { x: -22, y: -6 },
              { x: -18, y: 4 },
            ],
            s + 6,
          ),
          3,
        ) +
        ligne(
          trait(
            [
              { x: 18, y: -4 },
              { x: 16, y: 6 },
            ],
            s + 7,
          ),
          3,
        )
      );
    }
    case 'contagieux': {
      // Teint verdâtre, boutons rouges, nez qui coule, écharpe rayée.
      const t = tache(0, -27, 26, 26, s, { bosse: 0.05 });
      const meches = tache(0, -46, 22, 14, s + 2, { amp: 0.2, points: 16 });
      const echarpe = forme(
        [
          { x: -26, y: -6 },
          { x: 26, y: -6 },
          { x: 28, y: 8 },
          { x: -28, y: 8 },
        ],
        s + 3,
      );
      return (
        plein(meches, '#7a5a3a') +
        plein(t, g.peau) +
        rond(-16, -14, 3, '#e85d5d') +
        rond(15, -38, 2.6, '#e85d5d') +
        rond(18, -16, 3.2, '#e85d5d') +
        ligne(
          trait(
            [
              { x: -15, y: -30 },
              { x: -6, y: -29 },
            ],
            s + 4,
          ),
        ) +
        ligne(
          trait(
            [
              { x: 6, y: -29 },
              { x: 15, y: -30 },
            ],
            s + 5,
          ),
        ) +
        rond(-10, -25, 3) +
        rond(10, -25, 3) +
        plein(tache(4, -13, 3, 5, s + 6, { amp: 0.04 }), '#9fd7ff', 2.5) +
        ligne(
          trait(
            [
              { x: -8, y: -8 },
              { x: -3, y: -10 },
              { x: 2, y: -7 },
              { x: 7, y: -9 },
            ],
            s + 7,
          ),
        ) +
        plein(echarpe, '#ffd166') +
        ligne('M-14 -5 L-12 7', 4, '#f0644f') +
        ligne('M0 -5 L1 7', 4, '#f0644f') +
        ligne('M14 -5 L15 7', 4, '#f0644f')
      );
    }
    case 'delegue': {
      // Coupe en brosse, sourcils sérieux, petite bouche droite.
      const t = tache(0, -27, 26, 27, s);
      const brosse = forme(
        [
          { x: -26, y: -32 },
          { x: -25, y: -56 },
          { x: 25, y: -56 },
          { x: 26, y: -32 },
          { x: 18, y: -46 },
          { x: -18, y: -46 },
        ],
        s + 2,
        0.8,
      );
      return (
        plein(t, g.peau) +
        plein(brosse, '#231c26') +
        ligne(
          trait(
            [
              { x: -16, y: -37 },
              { x: -6, y: -34 },
            ],
            s + 3,
          ),
          4,
        ) +
        ligne(
          trait(
            [
              { x: 6, y: -34 },
              { x: 16, y: -37 },
            ],
            s + 4,
          ),
          4,
        ) +
        rond(-10, -27, 3.4, BLANC) +
        rond(10, -27, 3.4, BLANC) +
        rond(-10, -27, 2.2) +
        rond(10, -27, 2.2) +
        ligne(
          trait(
            [
              { x: -5, y: -11 },
              { x: 5, y: -11 },
            ],
            s + 5,
          ),
        )
      );
    }
    case 'grand': {
      // Casquette à l'envers, paupières mi-closes de celui qui en a vu d'autres.
      const t = tache(0, -26, 24, 27, s);
      const casquette = forme(
        [
          { x: -25, y: -32 },
          { x: -22, y: -52 },
          { x: 0, y: -60 },
          { x: 22, y: -52 },
          { x: 26, y: -34 },
        ],
        s + 2,
      );
      const visiere = forme(
        [
          { x: -20, y: -38 },
          { x: -44, y: -32 },
          { x: -40, y: -24 },
          { x: -18, y: -30 },
        ],
        s + 3,
      );
      return (
        plein(visiere, '#5fb84a') +
        plein(t, g.peau) +
        plein(casquette, '#8fd16a') +
        rond(0, -60, 3.5, '#5fb84a') +
        rondCerne(-9, -24, 7, BLANC, 2.6) +
        rondCerne(10, -24, 7, BLANC, 2.6) +
        rond(-8, -22, 3.2) +
        rond(11, -22, 3.2) +
        paupiere(-9, -24, 7, g.peau) +
        paupiere(10, -24, 7, g.peau) +
        ligne(
          trait(
            [
              { x: -4, y: -9 },
              { x: 4, y: -9 },
              { x: 10, y: -12 },
            ],
            s + 4,
          ),
        )
      );
    }
  }
}

// ---------------------------------------------------------------- corps (cou en 0,0)

function numero(role: RoleId, bande: Bande): string {
  const y = NUMERO_Y;
  const s = GRAINES[role] + (bande === 'rouge' ? 0 : 100);
  // Pastille ronde pour la bande rouge, carrée pour la bleue : lisible sans les couleurs.
  const pastille =
    bande === 'rouge'
      ? plein(tache(0, y, 21, 21, s, { amp: 0.035 }), CREME, 4)
      : plein(
          forme(
            [
              { x: -19, y: y - 19 },
              { x: 19, y: y - 19 },
              { x: 19, y: y + 19 },
              { x: -19, y: y + 19 },
            ],
            s,
            1,
          ),
          CREME,
          4,
        );
  return (
    pastille +
    `<text x="0" y="${y + 12.5}" text-anchor="middle" font-family="Trebuchet MS, Arial, sans-serif" font-weight="bold" font-size="36" fill="${NOIR}">${VALEURS[role]}</text>`
  );
}

function corps(role: RoleId, bande: Bande): string {
  const g = GABARITS[role];
  const s = GRAINES[role] + 5;
  const w = g.largeur;
  const h = g.hauteur;
  const b = w * (1 + g.ventre);
  const chasuble = forme(
    [
      { x: -w + 6, y: 0 },
      { x: -10, y: -2 },
      { x: 0, y: 8 },
      { x: 10, y: -2 },
      { x: w - 6, y: 0 },
      { x: w, y: 14 },
      { x: (w + b) / 2 + 2, y: h * 0.55 },
      { x: b + 1, y: h - 6 },
      { x: b * 0.4, y: h + 1 },
      { x: -b * 0.4, y: h - 1 },
      { x: -b - 1, y: h - 6 },
      { x: -(w + b) / 2 - 2, y: h * 0.55 },
      { x: -w, y: 14 },
    ],
    s,
  );
  const ombre = sansTrait(
    forme(
      [
        { x: w - 8, y: 18 },
        { x: (w + b) / 2 - 2, y: h * 0.55 },
        { x: b - 3, y: h - 8 },
        { x: b * 0.4, y: h - 3 },
        { x: w - 10, y: h * 0.6 },
      ],
      s + 1,
    ),
    CHASUBLE_OMBRE[bande],
  );
  // Col du t-shirt et détails propres au rôle, par-dessus ou par-dessous la chasuble.
  const col = plein(
    tache(0, 2, 12, 6, s + 2, { amp: 0.04 }),
    g.bras === g.peau ? '#fff1d6' : g.bras,
    3.5,
  );
  let details = '';
  if (role === 'delegue') {
    details =
      plein(
        forme(
          [
            { x: -4, y: 4 },
            { x: 4, y: 4 },
            { x: 5, y: 20 },
            { x: 0, y: 25 },
            { x: -5, y: 20 },
          ],
          s + 3,
          0.4,
        ),
        '#f0644f',
        3,
      ) + plein(tache(-w + 12, 18, 6, 6, s + 4), '#ffd166', 3);
  }
  if (role === 'fouine') {
    details =
      ligne(
        trait(
          [
            { x: -6, y: 6 },
            { x: -7, y: 18 },
          ],
          s + 5,
        ),
        3,
      ) +
      ligne(
        trait(
          [
            { x: 6, y: 6 },
            { x: 7, y: 18 },
          ],
          s + 6,
        ),
        3,
      );
  }
  return col + plein(chasuble, CHASUBLE[bande]) + ombre + details + numero(role, bande);
}

// ---------------------------------------------------------------- objets tenus

function objetEnMain(role: RoleId, p: P): string {
  const s = GRAINES[role] + 40;
  switch (role) {
    case 'petit':
      return (
        ligne(`M${p.x} ${p.y} L${p.x + 2} ${p.y - 24}`, 3.5) +
        plein(tache(p.x + 2, p.y - 32, 10, 10, s), '#ff8fc7', 3.5) +
        ligne(
          trait(
            [
              { x: p.x - 4, y: p.y - 34 },
              { x: p.x + 2, y: p.y - 28 },
              { x: p.x + 8, y: p.y - 34 },
            ],
            s + 1,
          ),
          2.5,
          BLANC,
        )
      );
    case 'chouchou':
      return (
        plein(tache(p.x + 4, p.y - 10, 11, 10, s, { amp: 0.04 }), '#f0644f', 3.5) +
        ligne(`M${p.x + 4} ${p.y - 20} L${p.x + 6} ${p.y - 26}`, 3) +
        plein(tache(p.x + 11, p.y - 24, 5, 3, s + 1), '#8fd16a', 2.5)
      );
    case 'delegue':
      return (
        plein(
          forme(
            [
              { x: p.x - 2, y: p.y - 30 },
              { x: p.x + 24, y: p.y - 30 },
              { x: p.x + 24, y: p.y + 4 },
              { x: p.x - 2, y: p.y + 4 },
            ],
            s,
            0.6,
          ),
          '#d9b98a',
          3.5,
        ) +
        plein(
          forme(
            [
              { x: p.x + 2, y: p.y - 26 },
              { x: p.x + 20, y: p.y - 26 },
              { x: p.x + 20, y: p.y },
              { x: p.x + 2, y: p.y },
            ],
            s + 1,
            0.5,
          ),
          BLANC,
          2.5,
        ) +
        ligne(`M${p.x + 6} ${p.y - 19} L${p.x + 16} ${p.y - 19}`, 2) +
        ligne(`M${p.x + 6} ${p.y - 13} L${p.x + 16} ${p.y - 13}`, 2) +
        ligne(`M${p.x + 6} ${p.y - 7} L${p.x + 13} ${p.y - 7}`, 2)
      );
    case 'contagieux':
      return plein(tache(p.x + 6, p.y - 4, 9, 7, s), BLANC, 3);
    default:
      return '';
  }
}

interface Pose {
  /** Bout de chaque bras (main), relatif à l'épaule. */
  bras: [P[], P[]];
  /** Écart des pieds par rapport aux hanches. */
  pieds: [number, number];
}

const POSES: Record<RoleId, Pose> = {
  petit: {
    bras: [
      [
        { x: -10, y: 10 },
        { x: -18, y: 22 },
      ],
      [
        { x: 12, y: 4 },
        { x: 20, y: -6 },
      ],
    ],
    pieds: [-4, 4],
  },
  populaire: {
    bras: [
      [
        { x: -10, y: 16 },
        { x: 2, y: 30 },
      ],
      [
        { x: 14, y: -6 },
        { x: 22, y: -24 },
      ],
    ],
    pieds: [-6, 8],
  },
  chouchou: {
    bras: [
      [
        { x: -6, y: 18 },
        { x: -10, y: 36 },
      ],
      [
        { x: 14, y: 8 },
        { x: 18, y: -4 },
      ],
    ],
    pieds: [-2, 2],
  },
  rapporteuse: {
    bras: [
      [
        { x: -8, y: 18 },
        { x: -6, y: 36 },
      ],
      [
        { x: 16, y: -10 },
        { x: 18, y: -34 },
      ],
    ],
    pieds: [-8, 4],
  },
  fouine: {
    bras: [
      [
        { x: -12, y: 14 },
        { x: -2, y: 26 },
      ],
      [
        { x: 10, y: 16 },
        { x: 4, y: 28 },
      ],
    ],
    pieds: [-10, 6],
  },
  contagieux: {
    bras: [
      [
        { x: -10, y: 18 },
        { x: -12, y: 36 },
      ],
      [
        { x: 14, y: 6 },
        { x: 10, y: -8 },
      ],
    ],
    pieds: [-4, 10],
  },
  delegue: {
    bras: [
      [
        { x: -8, y: 20 },
        { x: -10, y: 38 },
      ],
      [
        { x: 14, y: 10 },
        { x: 22, y: 6 },
      ],
    ],
    pieds: [-4, 4],
  },
  grand: {
    bras: [
      [
        { x: -14, y: 20 },
        { x: -14, y: 46 },
      ],
      [
        { x: 16, y: 18 },
        { x: 18, y: 46 },
      ],
    ],
    pieds: [-10, 10],
  },
};

// ---------------------------------------------------------------- assemblages

const enSvg = (vue: [number, number, number, number], largeurPx: number, contenu: string) => {
  const [x, y, l, h] = vue;
  const hauteurPx = Math.round((largeurPx * h) / l);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largeurPx}" height="${hauteurPx}" viewBox="${x} ${y} ${l} ${h}">${contenu}</svg>`;
};

/** Cadre du portrait : l'origine (0, 0) est le centre du numéro. */
export const VUE_PORTRAIT: [number, number, number, number] = [-80, -150, 160, 260];
/** Cadre de la tête seule : le cou est en (0, 0). */
export const VUE_TETE: [number, number, number, number] = [-60, -100, 120, 116];
/** Cadre du corps seul : le cou est en (0, 0). */
export const VUE_CORPS: [number, number, number, number] = [-48, -8, 96, 104];

/** L'élève debout, entier, prêt à poser sur un îlot ou une carte. */
export function svgPortrait(role: RoleId, bande: Bande, echelle = 1): string {
  const g = GABARITS[role];
  const pose = POSES[role];
  const s = GRAINES[role] + 200;
  const cou = -NUMERO_Y;
  const hanches: [P, P] = [
    { x: -g.largeur * 0.45, y: cou + g.hauteur - 6 },
    { x: g.largeur * 0.45, y: cou + g.hauteur - 6 },
  ];
  const sol = cou + g.hauteur + g.jambe;
  const jambes = hanches
    .map((h, i) => {
      const pied = { x: h.x + (pose.pieds[i] ?? 0), y: sol };
      const milieu = { x: (h.x + pied.x) / 2 + (i === 0 ? -2 : 2), y: (h.y + sol) / 2 };
      return (
        nouille([h, milieu, pied], g.pantalon, 9, s + i) +
        chaussure(pied, g.chaussure, i === 0 ? -1 : 1, s + 10 + i)
      );
    })
    .join('');
  const epaules: [P, P] = [
    { x: -g.largeur + 5, y: cou + 14 },
    { x: g.largeur - 5, y: cou + 14 },
  ];
  const bras = epaules.map((e, i) => {
    const pts = (pose.bras[i] ?? []).map((p) => ({ x: e.x + p.x, y: e.y + p.y }));
    const bout = pts[pts.length - 1] ?? e;
    return { trace: nouille([e, ...pts], g.bras, 7, s + 20 + i) + main(bout, g.peau), bout };
  });
  const objet = objetEnMain(role, bras[1]?.bout ?? { x: 0, y: 0 });
  const ombreSol = sansTrait(
    tache(0, sol + 8, 34, 6, s + 30, { amp: 0.03 }),
    'rgba(35,28,38,0.22)',
  );
  const contenu =
    ombreSol +
    jambes +
    (bras[0]?.trace ?? '') +
    `<g transform="translate(0 ${cou})">${corps(role, bande)}${tete(role)}</g>` +
    (bras[1]?.trace ?? '') +
    objet;
  return enSvg(VUE_PORTRAIT, Math.round(VUE_PORTRAIT[2] * echelle), contenu);
}

export function svgTete(role: RoleId, echelle = 1): string {
  return enSvg(VUE_TETE, Math.round(VUE_TETE[2] * echelle), tete(role));
}

export function svgCorps(role: RoleId, bande: Bande, echelle = 1): string {
  return enSvg(VUE_CORPS, Math.round(VUE_CORPS[2] * echelle), corps(role, bande));
}
