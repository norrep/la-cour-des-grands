/**
 * Mesures des images des élèves (fichiers `public/skins/dessin/<bande>-<rôle>.png`), relevées
 * au détourage : taille en pixels, main gauche, couleur de sa peau,
 * et hauteur du débardeur (relevée à la couleur de la bande).
 * Les traits sont épaissis de façon égale partout (contour compris), d'où 12 pixels de marge
 * comptés dans ces mesures. Chaque élève a aussi son buste pour les pastilles (`<nom>-pastille.png`, 256 × 256) : tête et
 * débardeur, le bas arrondi par un cercle de rayon 80 centré à 80 pixels du bas ; la tête dépasse.
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
   * Bras gauche retiré du dessin (`<nom>-corps.png`) : un bras-nouille le remplace
   * quand on tient l'élève par la main. `aisselle` est son attache, `basBras` le bout des doigts.
   */
  aisselle: { x: number; y: number };
  basBras: number;
  /** Largeur du bras à l'aisselle : la taille de l'articulation d'épaule du pantin. */
  largeurBras: number;
}

export const MESURES: Record<string, MesureDessin> = {
  'bleu-chouchou': {
    largeur: 166,
    hauteur: 462,
    main: { x: 21, y: 307 },
    peau: '#f8c8b0',
    col: 148,
    basMaillot: 240,
    aisselle: { x: 35, y: 183 },
    basBras: 322,
    largeurBras: 15,
  },
  'bleu-contagieux': {
    largeur: 152,
    hauteur: 450,
    main: { x: 15, y: 307 },
    peau: '#d8e0c0',
    col: 152,
    basMaillot: 239,
    aisselle: { x: 33, y: 165 },
    basBras: 322,
    largeurBras: 16,
  },
  'bleu-delegue': {
    largeur: 152,
    hauteur: 436,
    main: { x: 15, y: 297 },
    peau: '#b07858',
    col: 147,
    basMaillot: 230,
    aisselle: { x: 33, y: 157 },
    basBras: 312,
    largeurBras: 17,
  },
  'bleu-fouine': {
    largeur: 164,
    hauteur: 393,
    main: { x: 15, y: 236 },
    peau: '#c090c0',
    col: 145,
    basMaillot: 227,
    aisselle: { x: 30, y: 180 },
    basBras: 283,
    largeurBras: 25,
  },
  'bleu-grand': {
    largeur: 165,
    hauteur: 464,
    main: { x: 22, y: 309 },
    peau: '#f0c8b8',
    col: 148,
    basMaillot: 240,
    aisselle: { x: 39, y: 167 },
    basBras: 323,
    largeurBras: 17,
  },
  'bleu-petit': {
    largeur: 184,
    hauteur: 396,
    main: { x: 15, y: 296 },
    peau: '#f0c8b0',
    col: 177,
    basMaillot: 268,
    aisselle: { x: 35, y: 200 },
    basBras: 306,
    largeurBras: 17,
  },
  'bleu-populaire': {
    largeur: 144,
    hauteur: 464,
    main: { x: 17, y: 328 },
    peau: '#986048',
    col: 184,
    basMaillot: 267,
    aisselle: { x: 32, y: 200 },
    basBras: 342,
    largeurBras: 15,
  },
  'bleu-rapporteuse': {
    largeur: 162,
    hauteur: 425,
    main: { x: 21, y: 299 },
    peau: '#f0c8b0',
    col: 147,
    basMaillot: 238,
    aisselle: { x: 39, y: 164 },
    basBras: 311,
    largeurBras: 16,
  },
  'rouge-chouchou': {
    largeur: 165,
    hauteur: 461,
    main: { x: 21, y: 306 },
    peau: '#f8c8b0',
    col: 147,
    basMaillot: 240,
    aisselle: { x: 35, y: 182 },
    basBras: 321,
    largeurBras: 15,
  },
  'rouge-contagieux': {
    largeur: 152,
    hauteur: 449,
    main: { x: 15, y: 306 },
    peau: '#d8e0c0',
    col: 147,
    basMaillot: 239,
    aisselle: { x: 34, y: 164 },
    basBras: 321,
    largeurBras: 17,
  },
  'rouge-delegue': {
    largeur: 152,
    hauteur: 436,
    main: { x: 15, y: 296 },
    peau: '#b08058',
    col: 134,
    basMaillot: 230,
    aisselle: { x: 33, y: 157 },
    basBras: 311,
    largeurBras: 16,
  },
  'rouge-fouine': {
    largeur: 164,
    hauteur: 394,
    main: { x: 15, y: 236 },
    peau: '#b890b8',
    col: 144,
    basMaillot: 228,
    aisselle: { x: 30, y: 178 },
    basBras: 283,
    largeurBras: 24,
  },
  'rouge-grand': {
    largeur: 164,
    hauteur: 463,
    main: { x: 22, y: 308 },
    peau: '#f0d0b8',
    col: 148,
    basMaillot: 240,
    aisselle: { x: 39, y: 166 },
    basBras: 322,
    largeurBras: 17,
  },
  'rouge-petit': {
    largeur: 184,
    hauteur: 396,
    main: { x: 15, y: 296 },
    peau: '#f0c8b0',
    col: 177,
    basMaillot: 268,
    aisselle: { x: 36, y: 199 },
    basBras: 306,
    largeurBras: 16,
  },
  'rouge-populaire': {
    largeur: 144,
    hauteur: 464,
    main: { x: 18, y: 329 },
    peau: '#986848',
    col: 184,
    basMaillot: 267,
    aisselle: { x: 32, y: 201 },
    basBras: 342,
    largeurBras: 15,
  },
  'rouge-rapporteuse': {
    largeur: 161,
    hauteur: 425,
    main: { x: 20, y: 298 },
    peau: '#f8d0b8',
    col: 147,
    basMaillot: 238,
    aisselle: { x: 38, y: 166 },
    basBras: 311,
    largeurBras: 16,
  },
};
