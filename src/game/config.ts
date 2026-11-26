/** Résolution de base, portrait 9:16. */
export const LARGEUR = 720;
export const HAUTEUR = 1280;

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
