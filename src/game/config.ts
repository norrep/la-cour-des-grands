/**
 * Résolution de base, portrait 9:16 : tout est placé dans ces coordonnées. Sur un écran plus
 * allongé (la plupart des téléphones), on voit un peu plus haut et plus bas que cette zone : le
 * décor, le bandeau du haut et le pupitre du bas s'étendent jusqu'aux bords (`HAUT`, `BAS`).
 */
export const LARGEUR = 720;
export const HAUTEUR = 1280;

const ecran = typeof window === 'undefined' ? null : window;
/** Hauteur / largeur de l'écran (de la zone de page, sous la barre du navigateur). */
const FORME = ecran ? ecran.innerHeight / Math.max(1, ecran.innerWidth) : HAUTEUR / LARGEUR;

/**
 * Zone réellement visible, en coordonnées de jeu. Écran plus allongé que 9:16 : on voit plus haut et
 * plus bas (jusqu'à 9:22). Écran plus court (navigateur intégré, tablette) : on voit plus large sur
 * les côtés (jusqu'au carré). Le décor remplit tout ; la zone de base reste centrée.
 */
export const HAUTEUR_ECRAN =
  FORME >= HAUTEUR / LARGEUR ? Math.round(Math.min(1760, LARGEUR * FORME)) : HAUTEUR;
export const LARGEUR_ECRAN =
  FORME >= HAUTEUR / LARGEUR ? LARGEUR : Math.round(Math.min(HAUTEUR, HAUTEUR / FORME));
/** Bords de l'écran (la zone de base va de 0 à LARGEUR et de 0 à HAUTEUR). */
export const HAUT = -(HAUTEUR_ECRAN - HAUTEUR) / 2;
export const BAS = HAUTEUR + (HAUTEUR_ECRAN - HAUTEUR) / 2;
export const GAUCHE = -(LARGEUR_ECRAN - LARGEUR) / 2;
export const DROITE = LARGEUR + (LARGEUR_ECRAN - LARGEUR) / 2;

/**
 * Pixels réels par pixel de jeu : on dessine à la résolution du téléphone (jusqu'à 3×, comme les écrans des téléphones récents) pour un
 * trait net au lieu d'une image agrandie et floue.
 */
export const RESOLUTION = ecran
  ? Math.min(3, Math.max(1, (ecran.devicePixelRatio || 1) * (ecran.innerWidth / LARGEUR_ECRAN)))
  : 1;

/** Palette cartoon : aplats pastel et trait d'encre, accordés aux élèves dessinés. */
export const COULEURS = {
  /** Fond de secours sous le décor (lilas du goudron). */
  fond: 0xc9c3e6,
  /** Voile des écrans de passage : violet très sombre. */
  fondSombre: 0x2b2340,
  /** Trait noir de tous les dessins. */
  encre: 0x1d1d1b,
  craie: 0xfffaf0,
  papier: 0xfff4dc,
  /** Bandes : corail et pervenche, comme les débardeurs des élèves. */
  rouge: 0xf0705f,
  bleu: 0x6f84de,
  ilot: 0xaee8a4,
  ilotSpecial: 0xffd36e,
  surveillante: 0x9b6fd6,
  allume: 0xffd84d,
  /** Bouton principal : jaune beurre. */
  jaune: 0xffd84d,
  /** Allée bloquée par la surveillante : sa couleur, pour ne pas la confondre avec la bande rouge. */
  bloquee: 0x8e5bd0,
  texteSombre: '#1d1d1b',
  texteClair: '#fff4dc',
  texteRouge: '#e0503f',
  texteBleu: '#4f66c8',
} as const;

export const POLICE = 'Fredoka, Trebuchet MS, Arial, sans-serif';
export const POLICE_TITRE = 'Fredoka, Trebuchet MS, Arial, sans-serif';
