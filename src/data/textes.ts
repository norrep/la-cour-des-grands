/**
 * Tous les textes affichés à l'écran, en français, regroupés ici.
 * Le moteur de règles n'affiche rien : seul le rendu lit ce fichier.
 */
import type { Bande, EquipementId, RaisonFin, RoleId } from '../engine/types';

const ROLES: Record<RoleId, string> = {
  petit: 'Le Petit de maternelle',
  populaire: 'La Populaire',
  chouchou: 'Le Chouchou',
  rapporteuse: 'La Rapporteuse',
  fouine: 'La Fouine',
  contagieux: 'Le Contagieux',
  delegue: 'Le Délégué',
  grand: 'Le Grand de CM2',
};

const ROLES_COURTS: Record<RoleId, string> = {
  petit: 'Petit',
  populaire: 'Populaire',
  chouchou: 'Chouchou',
  rapporteuse: 'Rapporteuse',
  fouine: 'Fouine',
  contagieux: 'Contagieux',
  delegue: 'Délégué',
  grand: 'Grand',
};

const EQUIPEMENTS: Record<EquipementId, string> = {
  banc: 'Le banc',
  cabanePerchee: 'La cabane perchée',
  porteVieScolaire: 'La porte de la vie scolaire',
  buts: 'Les buts',
  toboggan: 'Le toboggan',
  marelle: 'La marelle',
  bancMaitresses: 'Le banc des maîtresses',
};

const BANDES: Record<Bande, string> = { rouge: 'bande rouge', bleu: 'bande bleue' };
const BANDES_TITRE: Record<Bande, string> = { rouge: 'Bande rouge', bleu: 'Bande bleue' };

const RAISONS: Record<RaisonFin, string> = {
  cabane: 'a pris la cabane adverse !',
  bonsPoints: 'a récolté assez de bons points !',
  sonnerie: 'gagne à la sonnerie !',
};

export const TEXTES = {
  titre: 'La Cour des Grands',
  sousTitre: 'Duel tactique dans la cour de récré',
  roles: ROLES,
  rolesCourts: ROLES_COURTS,
  equipements: EQUIPEMENTS,
  bandes: BANDES,
  bandesTitre: BANDES_TITRE,
  socle: {
    sonnerie: 'DRIIIIING !',
  },
  accueil: {
    jouerADeux: 'Jouer à deux',
    sousJouerADeux: 'sur ce téléphone',
    equipements: (actifs: boolean) => `Équipements spéciaux : ${actifs ? 'oui' : 'non'}`,
    regle:
      'À ton tour : appelle des copains ou envoie un élève dans la cour. Atteins la cabane adverse ou récolte les bons points.',
  },
  hud: {
    tourDe: (b: Bande) => `Au tour de la ${BANDES[b]}`,
    seuil: (n: number) => `Objectif : ${n} bons points`,
    points: (n: number) => `${n}`,
    couloir: (n: number) => `Couloir : ${n}`,
    cpe: (n: number) => `CPE : ${n}`,
    infirmerie: 'Infirmerie',
    rangVide: 'Ton rang est vide : appelle des copains !',
  },
  boutons: {
    appeler: (n: number) => (n > 1 ? `Appeler ${n} copains` : 'Appeler 1 copain'),
    annuler: 'Annuler',
    valider: 'Valider le coup',
    passer: 'Passer',
    piocher: 'Piocher',
    infirmerie: 'Éternuer',
    rejouer: 'Rejouer',
    accueil: 'Accueil',
    pret: (b: Bande) => `Je suis la ${BANDES[b]}`,
  },
  choix: {
    populaire: 'La Populaire : piocher 2 élèves ?',
    chouchou: 'Le Chouchou : glisse un élève de valeur 5 ou plus dans la cour.',
    rapporteuse: 'La Rapporteuse : touche un élève adverse voisin à envoyer chez la CPE.',
    contagieux: 'Le Contagieux : un élève adverse au hasard part à l’infirmerie ?',
    delegue: 'Le Délégué : déplace la surveillante.',
    banc: 'Le banc : touche un de tes élèves à remettre dans ton rang.',
    cabanePerchee: 'La cabane perchée : piocher 1 élève ?',
    porteVieScolaire: 'La porte de la vie scolaire : reprends un élève de chez la CPE.',
    buts: 'Les buts : touche un élève adverse (1 ou 2) à envoyer chez la CPE.',
    tobogganDepart: 'Le toboggan : touche l’élève adverse à faire glisser.',
    tobogganArrivee: 'Le toboggan : touche l’îlot où il atterrit.',
    pas: (n: number) => (n > 0 ? `+${n}` : `${n}`),
  },
  confirmation: 'Coup joué. Tu peux encore l’annuler.',
  passe: {
    titre: 'Passe le téléphone',
    a: (b: Bande) => `à la ${BANDES[b]}`,
    cache: 'Ne regarde pas le rang de l’adversaire !',
  },
  fin: {
    titre: 'DRIIIIING !',
    gagnant: (b: Bande) => `La ${BANDES[b]}`,
    raison: (r: RaisonFin) => RAISONS[r],
    score: (rouge: number, bleu: number) => `Bons points : rouge ${rouge}, bleu ${bleu}`,
    tours: (n: number) => `Partie en ${n} tours`,
  },
  surveillante: 'Mme Josiane',
  journal: {
    titre: 'Journal',
    vide: 'La récré commence !',
    appel: (b: Bande, n: number) => `${BANDES_TITRE[b]} appelle ${n} copain${n > 1 ? 's' : ''}.`,
    pose: (b: Bande, role: RoleId, lieu: string) =>
      `${BANDES_TITRE[b]} : ${ROLES[role]} → ${lieu}.`,
    plaque: (role: RoleId) => `${ROLES[role]} est plaqué au sol !`,
    pioche: (b: Bande, n: number) => `${BANDES_TITRE[b]} pioche ${n} élève${n > 1 ? 's' : ''}.`,
    cpe: (role: RoleId, b: Bande) => `${ROLES[role]} (${BANDES[b]}) part chez la CPE !`,
    infirmerie: (b: Bande) => `Atchoum ! Un élève de la ${BANDES[b]} part à l’infirmerie.`,
    surveillanteDelegue: 'Le Délégué brandit son mot d’excuse : la surveillante change de route.',
    surveillante: 'La surveillante poursuit sa ronde.',
    rappel: (b: Bande) => `${BANDES_TITRE[b]} rappelle un élève dans son rang.`,
    repechage: (b: Bande) => `${BANDES_TITRE[b]} récupère un élève chez la CPE.`,
    glissade: (role: RoleId) => `${ROLES[role]} glisse sur le toboggan !`,
    passe: (b: Bande) => `${BANDES_TITRE[b]} renonce à son pouvoir.`,
    region: (b: Bande, nom: string, n: number) =>
      `${BANDES_TITRE[b]} prend « ${nom} » : +${n} bon${n > 1 ? 's' : ''} point${n > 1 ? 's' : ''} !`,
    fin: (b: Bande) => `Victoire de la ${BANDES[b]} !`,
    cabane: 'la cabane adverse',
  },
} as const;
