/**
 * Mesures des images des élèves (fichiers `public/skins/dessin/<bande>-<rôle>.png`), relevées
 * au détourage : taille en pixels, main gauche, couleur de sa peau,
 * et hauteur du débardeur (relevée à la couleur de la bande).
 * Images en double définition (élève d'environ 900 pixels de haut) pour rester net sur les grands affichages.
 * Les traits sont épaissis de façon égale partout (contour compris), d'où 24 pixels de marge
 * comptés dans ces mesures. Chaque élève a aussi son buste pour les pastilles (`<nom>-pastille.png`, 512 × 512) : tête et
 * débardeur, le bas arrondi par un cercle de rayon 160 centré à 160 pixels du bas ; la tête dépasse.
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
    largeur: 332,
    hauteur: 924,
    main: { x: 42, y: 614 },
    peau: '#f8c8b0',
    col: 296,
    basMaillot: 480,
    aisselle: { x: 70, y: 366 },
    basBras: 644,
    largeurBras: 30,
  },
  'bleu-contagieux': {
    largeur: 304,
    hauteur: 900,
    main: { x: 30, y: 614 },
    peau: '#d8e0c0',
    col: 304,
    basMaillot: 478,
    aisselle: { x: 66, y: 330 },
    basBras: 644,
    largeurBras: 32,
  },
  'bleu-delegue': {
    largeur: 304,
    hauteur: 872,
    main: { x: 30, y: 594 },
    peau: '#b07858',
    col: 294,
    basMaillot: 460,
    aisselle: { x: 66, y: 314 },
    basBras: 624,
    largeurBras: 34,
  },
  'bleu-fouine': {
    largeur: 328,
    hauteur: 786,
    main: { x: 30, y: 472 },
    peau: '#c090c0',
    col: 290,
    basMaillot: 454,
    aisselle: { x: 60, y: 360 },
    basBras: 566,
    largeurBras: 50,
  },
  'bleu-grand': {
    largeur: 330,
    hauteur: 928,
    main: { x: 44, y: 618 },
    peau: '#f0c8b8',
    col: 296,
    basMaillot: 480,
    aisselle: { x: 78, y: 334 },
    basBras: 646,
    largeurBras: 34,
  },
  'bleu-petit': {
    largeur: 368,
    hauteur: 792,
    main: { x: 30, y: 592 },
    peau: '#f0c8b0',
    col: 354,
    basMaillot: 536,
    aisselle: { x: 70, y: 400 },
    basBras: 612,
    largeurBras: 34,
  },
  'bleu-populaire': {
    largeur: 288,
    hauteur: 928,
    main: { x: 34, y: 656 },
    peau: '#986048',
    col: 368,
    basMaillot: 534,
    aisselle: { x: 64, y: 400 },
    basBras: 684,
    largeurBras: 30,
  },
  'bleu-rapporteuse': {
    largeur: 324,
    hauteur: 850,
    main: { x: 42, y: 598 },
    peau: '#f0c8b0',
    col: 294,
    basMaillot: 476,
    aisselle: { x: 78, y: 328 },
    basBras: 622,
    largeurBras: 32,
  },
  'rouge-chouchou': {
    largeur: 330,
    hauteur: 922,
    main: { x: 42, y: 612 },
    peau: '#f8c8b0',
    col: 294,
    basMaillot: 480,
    aisselle: { x: 70, y: 364 },
    basBras: 642,
    largeurBras: 30,
  },
  'rouge-contagieux': {
    largeur: 304,
    hauteur: 898,
    main: { x: 30, y: 612 },
    peau: '#d8e0c0',
    col: 294,
    basMaillot: 478,
    aisselle: { x: 68, y: 328 },
    basBras: 642,
    largeurBras: 34,
  },
  'rouge-delegue': {
    largeur: 304,
    hauteur: 872,
    main: { x: 30, y: 592 },
    peau: '#b08058',
    col: 268,
    basMaillot: 460,
    aisselle: { x: 66, y: 314 },
    basBras: 622,
    largeurBras: 32,
  },
  'rouge-fouine': {
    largeur: 328,
    hauteur: 788,
    main: { x: 30, y: 472 },
    peau: '#b890b8',
    col: 288,
    basMaillot: 456,
    aisselle: { x: 60, y: 356 },
    basBras: 566,
    largeurBras: 48,
  },
  'rouge-grand': {
    largeur: 328,
    hauteur: 926,
    main: { x: 44, y: 616 },
    peau: '#f0d0b8',
    col: 296,
    basMaillot: 480,
    aisselle: { x: 78, y: 332 },
    basBras: 644,
    largeurBras: 34,
  },
  'rouge-petit': {
    largeur: 368,
    hauteur: 792,
    main: { x: 30, y: 592 },
    peau: '#f0c8b0',
    col: 354,
    basMaillot: 536,
    aisselle: { x: 72, y: 398 },
    basBras: 612,
    largeurBras: 32,
  },
  'rouge-populaire': {
    largeur: 288,
    hauteur: 928,
    main: { x: 36, y: 658 },
    peau: '#986848',
    col: 368,
    basMaillot: 534,
    aisselle: { x: 64, y: 402 },
    basBras: 684,
    largeurBras: 30,
  },
  'rouge-rapporteuse': {
    largeur: 322,
    hauteur: 850,
    main: { x: 40, y: 596 },
    peau: '#f8d0b8',
    col: 294,
    basMaillot: 476,
    aisselle: { x: 76, y: 332 },
    basBras: 622,
    largeurBras: 32,
  },
};
