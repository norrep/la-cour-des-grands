/**
 * Mesures des images des élèves (fichiers `public/skins/dessin/<bande>-<rôle>.png`), relevées
 * au détourage : taille en pixels, main gauche (celle qu'on attrape) et couleur de sa peau.
 */
export interface MesureDessin {
  largeur: number;
  hauteur: number;
  main: { x: number; y: number };
  peau: string;
}

export const MESURES: Record<string, MesureDessin> = {
  'bleu-chouchou': { largeur: 142, hauteur: 438, main: { x: 9, y: 295 }, peau: '#f8c8b0' },
  'bleu-contagieux': { largeur: 128, hauteur: 426, main: { x: 3, y: 295 }, peau: '#d8e0c0' },
  'bleu-delegue': { largeur: 128, hauteur: 412, main: { x: 3, y: 285 }, peau: '#b07858' },
  'bleu-fouine': { largeur: 140, hauteur: 369, main: { x: 3, y: 224 }, peau: '#c090c0' },
  'bleu-grand': { largeur: 141, hauteur: 440, main: { x: 10, y: 297 }, peau: '#f0c8b8' },
  'bleu-petit': { largeur: 160, hauteur: 372, main: { x: 3, y: 284 }, peau: '#f0c8b0' },
  'bleu-populaire': { largeur: 120, hauteur: 440, main: { x: 5, y: 316 }, peau: '#986048' },
  'bleu-rapporteuse': { largeur: 138, hauteur: 401, main: { x: 9, y: 287 }, peau: '#f0c8b0' },
  'rouge-chouchou': { largeur: 141, hauteur: 437, main: { x: 9, y: 294 }, peau: '#f8c8b0' },
  'rouge-contagieux': { largeur: 128, hauteur: 425, main: { x: 3, y: 294 }, peau: '#d8e0c0' },
  'rouge-delegue': { largeur: 128, hauteur: 412, main: { x: 3, y: 284 }, peau: '#b08058' },
  'rouge-fouine': { largeur: 140, hauteur: 370, main: { x: 3, y: 224 }, peau: '#b890b8' },
  'rouge-grand': { largeur: 140, hauteur: 439, main: { x: 10, y: 296 }, peau: '#f0d0b8' },
  'rouge-petit': { largeur: 160, hauteur: 372, main: { x: 3, y: 284 }, peau: '#f0c8b0' },
  'rouge-populaire': { largeur: 120, hauteur: 440, main: { x: 6, y: 317 }, peau: '#986848' },
  'rouge-rapporteuse': { largeur: 137, hauteur: 401, main: { x: 8, y: 286 }, peau: '#f8d0b8' },
};
