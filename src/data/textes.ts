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

/** Pouvoir de chaque élève, en une ou deux phrases. */
const POUVOIRS: Record<RoleId, string> = {
  petit:
    'Joker : peut plaquer n’importe quel élève adverse, mais tout le monde peut le plaquer. N’entre jamais dans la cabane adverse.',
  populaire: 'En arrivant, pioche 2 élèves dans ton couloir.',
  chouchou:
    'En arrivant, pose tout de suite un 2e élève de valeur 5 ou plus (ses « grands frères »).',
  rapporteuse: 'En arrivant, envoie chez la CPE un élève adverse posé sur un îlot voisin.',
  fouine: 'Passe par les buissons : peut se poser sur un îlot qui n’est pas relié à ta cabane.',
  contagieux:
    'En arrivant, éternue : un élève du rang adverse, au hasard, est bloqué à son prochain tour.',
  delegue: 'En arrivant, déplace la surveillante d’1 ou 2 allées, en avant ou en arrière.',
  grand: 'Aucun pouvoir : c’est le plus fort de la cour.',
};

/** Effet de chaque équipement spécial. */
const EFFETS_EQUIPEMENTS: Record<EquipementId, string> = {
  banc: 'Quand tu poses un élève sur le banc, tu peux remettre un autre de tes élèves de la cour dans ton rang.',
  cabanePerchee: 'Quand tu poses un élève ici, tu peux piocher 1 élève.',
  porteVieScolaire:
    'Quand tu poses un élève ici, tu peux reprendre un de tes élèves de chez la CPE.',
  buts: 'Quand tu poses un élève ici, tu peux envoyer chez la CPE un adversaire de valeur 1 ou 2 situé à 2 allées.',
  toboggan:
    'Quand tu poses un élève ici, tu peux faire glisser un adversaire voisin vers un autre îlot.',
  marelle: 'Seules certaines valeurs peuvent se poser sur cette case.',
  bancMaitresses: 'Sous le regard des maîtresses, les pouvoirs des élèves ne s’appliquent pas ici.',
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
  pouvoirs: POUVOIRS,
  effetsEquipements: EFFETS_EQUIPEMENTS,
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
    toucherCarte: 'Touche un élève pour lire son pouvoir',
    consigneTour: 'Glisse un élève de ton rang vers un îlot qui s’allume, ou bien :',
    consigneSansPose: 'Aucune pose possible : appelle des copains.',
    aide: '?',
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
    populaire: 'Pouvoir de la Populaire : tu peux piocher 2 élèves dans ton couloir.',
    chouchou:
      'Pouvoir du Chouchou : tu peux glisser tout de suite un 2e élève de valeur 5 ou plus (les cartes non grisées).',
    rapporteuse:
      'Pouvoir de la Rapporteuse : touche un élève adverse voisin (il tremble) pour l’envoyer chez la CPE.',
    contagieux:
      'Pouvoir du Contagieux : « Atchoum ! » Un élève du rang adverse, au hasard, sera bloqué à son prochain tour.',
    delegue:
      'Pouvoir du Délégué : fais avancer (+) ou reculer (−) la surveillante sur sa ronde. Son allée bloque les chemins.',
    banc: 'Tu as posé sur le banc (îlot spécial ★) : tu peux reprendre un autre de tes élèves de la cour dans ton rang. Touche-le, ou passe.',
    cabanePerchee: 'Tu as posé sur la cabane perchée (★) : tu peux piocher 1 élève.',
    porteVieScolaire:
      'Tu as posé sur la porte de la vie scolaire (★) : tu peux reprendre un élève de chez la CPE.',
    buts: 'Tu as posé sur les buts (★) : touche un adversaire de valeur 1 ou 2, à 2 allées, pour l’envoyer chez la CPE.',
    tobogganDepart:
      'Tu as posé sur le toboggan (★) : touche l’élève adverse voisin à faire glisser.',
    tobogganArrivee: 'Toboggan : touche l’îlot où il atterrit.',
    pas: (n: number) => (n > 0 ? `+${n}` : `−${-n}`),
    bulle: 'Pouvoir !',
  },
  fiche: {
    eleve: (role: RoleId, valeur: number | null) =>
      `${ROLES[role]} (${valeur === null ? 'joker' : `valeur ${valeur}`})`,
    glisser: 'Lâche-le sur un îlot qui s’allume. Un adversaire qui tremble peut être plaqué.',
    infirmerie: 'À l’infirmerie : il ne peut pas jouer ce tour-ci.',
    nonJouable: 'Il ne peut se poser nulle part pour l’instant.',
    ilotVide: 'Îlot vide.',
    pile: (lignes: string[]) => `Pile, du dessus au dessous : ${lignes.join(', ')}.`,
    elevePile: (role: RoleId, b: Bande, valeur: number | null) =>
      `${ROLES_COURTS[role]} ${b === 'rouge' ? 'rouge' : 'bleu'} (${valeur === null ? 'J' : valeur})`,
    surveille: 'Sous surveillance : on ne peut pas y plaquer un adversaire.',
    cabane: (b: Bande) =>
      `Cabane de la ${BANDES[b]}. L’adversaire qui y pose un élève relié à sa cabane gagne aussitôt.`,
    special: '★ Îlot spécial : ',
  },
  aide: {
    titre: 'Comment jouer',
    but: 'But : poser un élève dans la cabane adverse, ou gagner les bons points (+1, +2) en occupant tous les îlots autour d’une zone.',
    tour: 'À ton tour, une seule action : appeler des copains (piocher 2) ou envoyer un élève sur un îlot relié à ta cabane par tes élèves. Tu peux plaquer un adversaire plus faible : il reste dessous.',
    eleves: 'Les 8 élèves (3 de chaque par bande)',
    special: 'L’îlot spécial de cette cour',
    legende: [
      'Rond = bande rouge, carré = bande bleue.',
      'Petits badges à gauche d’un îlot = élèves plaqués dessous ; « ×3 » = hauteur de la pile.',
      'Allée rouge = la surveillante bloque le chemin ; traces violettes = sa prochaine allée.',
      'Cercle violet = îlot surveillé : on ne peut pas y plaquer un adversaire.',
    ],
    fermer: 'Fermer',
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
