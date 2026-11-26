/**
 * Tous les textes affichés à l'écran, en français, regroupés ici.
 * Le moteur de règles n'affiche rien : seul le rendu lit ce fichier.
 */
export const TEXTES = {
  titre: 'La Cour des Grands',
  sousTitre: 'Duel tactique dans la cour de récré',
  socle: {
    enConstruction: 'Chantier en cours : la cour ouvre bientôt !',
    toucher: 'Touche l’écran pour faire sonner la cloche',
    sonnerie: 'DRIIIIING !',
  },
  bandes: {
    rouge: 'Bande rouge',
    bleu: 'Bande bleue',
  },
  roles: {
    petit: 'Le Petit de maternelle',
    populaire: 'La Populaire',
    chouchou: 'Le Chouchou',
    rapporteuse: 'La Rapporteuse',
    fouine: 'La Fouine',
    contagieux: 'Le Contagieux',
    delegue: 'Le Délégué',
    grand: 'Le Grand de CM2',
  },
} as const;
