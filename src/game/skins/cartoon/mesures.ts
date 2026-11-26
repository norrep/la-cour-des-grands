/**
 * Mesures des images des élèves (fichiers `public/skins/dessin/<bande>-<rôle>.png`), relevées
 * au détourage : taille en pixels, main gauche, couleur de sa peau,
 * et hauteur du débardeur (relevée à la couleur de la bande).
 */
export interface MesureDessin {
  largeur: number;
  hauteur: number;
  main: { x: number; y: number };
  peau: string;
  /** Haut du débardeur (encolure), en pixels : c'est là qu'on attrape l'élève par le col. */
  col: number;
  /** Bas du débardeur : le buste des cartes du rang s'arrête juste dessous. */
  basMaillot: number;
  /**
   * Bras gauche découpé à part (`<nom>-bras.png`, le reste dans `<nom>-corps.png`) : il se lève
   * quand on tient l'élève par la main. `aisselle` est son attache, `basBras` le bout des doigts.
   */
  aisselle: { x: number; y: number };
  basBras: number;
}

export const MESURES: Record<string, MesureDessin> = {
  'bleu-chouchou': {
    largeur: 142,
    hauteur: 438,
    main: { x: 9, y: 295 },
    peau: '#f8c8b0',
    col: 136,
    basMaillot: 228,
    aisselle: { x: 23, y: 171 },
    basBras: 310,
  },
  'bleu-contagieux': {
    largeur: 128,
    hauteur: 426,
    main: { x: 3, y: 295 },
    peau: '#d8e0c0',
    col: 140,
    basMaillot: 227,
    aisselle: { x: 21, y: 153 },
    basBras: 310,
  },
  'bleu-delegue': {
    largeur: 128,
    hauteur: 412,
    main: { x: 3, y: 285 },
    peau: '#b07858',
    col: 135,
    basMaillot: 218,
    aisselle: { x: 21, y: 145 },
    basBras: 300,
  },
  'bleu-fouine': {
    largeur: 140,
    hauteur: 369,
    main: { x: 3, y: 224 },
    peau: '#c090c0',
    col: 133,
    basMaillot: 215,
    aisselle: { x: 18, y: 168 },
    basBras: 271,
  },
  'bleu-grand': {
    largeur: 141,
    hauteur: 440,
    main: { x: 10, y: 297 },
    peau: '#f0c8b8',
    col: 136,
    basMaillot: 228,
    aisselle: { x: 27, y: 155 },
    basBras: 311,
  },
  'bleu-petit': {
    largeur: 160,
    hauteur: 372,
    main: { x: 3, y: 284 },
    peau: '#f0c8b0',
    col: 165,
    basMaillot: 256,
    aisselle: { x: 23, y: 188 },
    basBras: 294,
  },
  'bleu-populaire': {
    largeur: 120,
    hauteur: 440,
    main: { x: 5, y: 316 },
    peau: '#986048',
    col: 172,
    basMaillot: 255,
    aisselle: { x: 20, y: 188 },
    basBras: 330,
  },
  'bleu-rapporteuse': {
    largeur: 138,
    hauteur: 401,
    main: { x: 9, y: 287 },
    peau: '#f0c8b0',
    col: 135,
    basMaillot: 226,
    aisselle: { x: 27, y: 152 },
    basBras: 299,
  },
  'rouge-chouchou': {
    largeur: 141,
    hauteur: 437,
    main: { x: 9, y: 294 },
    peau: '#f8c8b0',
    col: 135,
    basMaillot: 228,
    aisselle: { x: 23, y: 170 },
    basBras: 309,
  },
  'rouge-contagieux': {
    largeur: 128,
    hauteur: 425,
    main: { x: 3, y: 294 },
    peau: '#d8e0c0',
    col: 135,
    basMaillot: 227,
    aisselle: { x: 22, y: 152 },
    basBras: 309,
  },
  'rouge-delegue': {
    largeur: 128,
    hauteur: 412,
    main: { x: 3, y: 284 },
    peau: '#b08058',
    col: 122,
    basMaillot: 218,
    aisselle: { x: 21, y: 145 },
    basBras: 299,
  },
  'rouge-fouine': {
    largeur: 140,
    hauteur: 370,
    main: { x: 3, y: 224 },
    peau: '#b890b8',
    col: 132,
    basMaillot: 216,
    aisselle: { x: 18, y: 166 },
    basBras: 271,
  },
  'rouge-grand': {
    largeur: 140,
    hauteur: 439,
    main: { x: 10, y: 296 },
    peau: '#f0d0b8',
    col: 136,
    basMaillot: 228,
    aisselle: { x: 27, y: 154 },
    basBras: 310,
  },
  'rouge-petit': {
    largeur: 160,
    hauteur: 372,
    main: { x: 3, y: 284 },
    peau: '#f0c8b0',
    col: 165,
    basMaillot: 256,
    aisselle: { x: 24, y: 187 },
    basBras: 294,
  },
  'rouge-populaire': {
    largeur: 120,
    hauteur: 440,
    main: { x: 6, y: 317 },
    peau: '#986848',
    col: 172,
    basMaillot: 255,
    aisselle: { x: 20, y: 189 },
    basBras: 330,
  },
  'rouge-rapporteuse': {
    largeur: 137,
    hauteur: 401,
    main: { x: 8, y: 286 },
    peau: '#f8d0b8',
    col: 135,
    basMaillot: 226,
    aisselle: { x: 26, y: 154 },
    basBras: 299,
  },
};
