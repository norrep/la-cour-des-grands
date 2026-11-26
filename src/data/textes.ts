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
    'Joker : plaque n’importe qui, mais tout le monde le plaque. Jamais dans la cabane adverse.',
  populaire: 'Arrive avec des copains : pioche 2 élèves.',
  chouchou: 'Appelle ses grands frères : pose aussitôt un 2e élève de 5 ou plus.',
  rapporteuse: '« Madame, c’est lui ! » : un adversaire voisin part chez la CPE.',
  fouine: 'Passe par les buissons : se pose même loin de ton chemin.',
  contagieux: 'Atchoum ! Un élève adverse au hasard rate son prochain tour.',
  delegue: 'Mot d’excuse : déplace la surveillante d’1 ou 2 allées.',
  grand: 'Pas de pouvoir : c’est le plus fort.',
};

/** Effet de chaque équipement spécial. */
const EFFETS_EQUIPEMENTS: Record<EquipementId, string> = {
  banc: 'Pose un élève ici : tu peux reprendre un autre de tes élèves de la cour dans ton rang.',
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
  bonsPoints: 'a ramassé assez de goûters !',
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
      'À ton tour : appelle des copains ou envoie un élève dans la cour. Atteins la cabane adverse ou ramasse les goûters.',
  },
  hud: {
    tourDe: (b: Bande) => `Au tour de la ${BANDES[b]}`,
    seuil: (n: number) => `Objectif : ${n} goûters`,
    points: (n: number) => `${n}`,
    couloir: (n: number) => `Couloir : ${n}`,
    cpe: (n: number) => `CPE : ${n}`,
    infirmerie: 'Infirmerie',
    rangVide: 'Ton rang est vide : appelle des copains !',
    toucherCarte: 'Touche un élève : son pouvoir',
    consigneTour: 'Glisse un élève vers la cour, ou :',
    consigneSansPose: 'Aucune pose possible : appelle des copains.',
    aide: '?',
  },
  boutons: {
    appeler: (n: number) => (n > 1 ? `Appeler ${n} copains` : 'Appeler 1 copain'),
    passer: 'Passer',
    piocher: 'Piocher',
    infirmerie: 'Éternuer',
    rejouer: 'Rejouer',
    accueil: 'Accueil',
    pret: (b: Bande) => `Je suis la ${BANDES[b]}`,
  },
  choix: {
    populaire: 'Populaire : piocher 2 élèves ?',
    chouchou: 'Chouchou : glisse un 2e élève de 5 ou plus (cartes claires).',
    rapporteuse: 'Rapporteuse : touche l’adversaire qui tremble pour l’envoyer chez la CPE.',
    contagieux: 'Contagieux : un élève adverse au hasard rate son prochain tour ?',
    delegue: 'Délégué : avance (+) ou recule (−) la surveillante.',
    banc: '★ Banc : touche un de tes élèves pour le reprendre dans ton rang.',
    cabanePerchee: '★ Cabane perchée : piocher 1 élève ?',
    porteVieScolaire: '★ Vie scolaire : reprends un élève de chez la CPE.',
    buts: '★ Buts : touche l’adversaire (1 ou 2) à envoyer chez la CPE.',
    tobogganDepart: '★ Toboggan : touche l’adversaire à faire glisser.',
    tobogganArrivee: '★ Toboggan : touche l’îlot d’arrivée.',
    pas: (n: number) => (n > 0 ? `+${n}` : `−${-n}`),
    bulle: 'Pouvoir !',
  },
  fiche: {
    eleve: (role: RoleId, valeur: number | null) =>
      `${ROLES[role]} (${valeur === null ? 'joker' : `valeur ${valeur}`})`,
    glisser: 'Lâche-le sur un îlot jaune.',
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
    surveillante: (actuelle: string, prochaine: string) =>
      `Elle bloque l’allée ${actuelle} et protège ses 2 îlots. Quand les deux bandes auront joué, elle avancera sur l’allée ${prochaine} (traces de pas → silhouette pâle).`,
  },
  /** Les zones à bons points sont des goûters à ramasser, un par zone, dans l'ordre de la cour. */
  gouters: ['La tablette de chocolat', 'Le paquet de biscuits', 'Le bonbon', 'La sucette'],
  region: (points: number, noms: string[]) =>
    `Occupe ${noms.join(', ')} (tous à la fois) pour le ramasser : +${points} goûter${points > 1 ? 's' : ''}.`,
  regionTitre: (nom: string, points: number) => `${nom} (+${points})`,
  regionPrise: (b: Bande, points: number) =>
    `Déjà ramassé par la ${BANDES[b]} (+${points}). Il n’y a plus rien à prendre ici.`,
  cinematiques: {
    cpe: { titre: 'Direction la CPE !', sous: 'Dénoncé par la Rapporteuse…' },
    infirmerie: { titre: 'Atchoum !', sous: 'Un élève file à l’infirmerie.' },
    grandsFreres: {
      titre: 'Les grands frères arrivent !',
      sous: 'Le Chouchou appelle du renfort.',
    },
    sonnerie: { titre: 'DRIIIIING !', sous: 'La récré est finie.' },
    passer: 'Touche pour passer',
  },
  animations: {
    plaque: 'Plaqué !',
    gouter: (n: number) => `+${n} goûter${n > 1 ? 's' : ''} !`,
  },
  sons: (actifs: boolean) => `Sons : ${actifs ? 'oui' : 'non'}`,
  conseils: {
    accueil: (actifs: boolean) => `Conseils pour débuter : ${actifs ? 'oui' : 'non'}`,
    titre: 'Conseil',
    compris: 'Compris !',
    couper: 'Plus de conseils',
    but: 'Deux façons de gagner : entrer dans la cabane adverse, ou ramasser 3 goûters en entourant les friandises de la cour.',
    glisser:
      'Glisse un élève de ton rang vers la cour. Il ne peut aller que sur un îlot touchant ta cabane ou ton chemin.',
    appeler: '« Appeler des copains » pioche 2 élèves. Ton tour s’arrête là.',
    chemin:
      'Le trait de couleur, c’est ton chemin depuis ta cabane. Tu peux poser sur tout îlot qui touche ce chemin.',
    plaquer:
      'Un adversaire plus faible peut être plaqué : ton élève se pose dessus, l’autre reste coincé dessous.',
    pouvoir: 'Cet élève a un pouvoir en arrivant. Tu peux l’utiliser ou passer.',
    surveillante:
      'La surveillante bloque son allée (violet plein) et protège les 2 îlots au bout. Après chaque tour complet, elle suit ses traces de pas jusqu’à sa silhouette pâle.',
    zones:
      'Les friandises +1 / +2 sont des goûters : occupe tous les îlots autour pour les ramasser. Touche une friandise pour voir lesquels.',
  },
  aide: {
    titre: 'Comment jouer',
    but: 'But : poser un élève dans la cabane adverse, ou ramasser les goûters (+1, +2) en occupant tous les îlots autour d’une friandise.',
    tour: 'À ton tour, une seule action : appeler des copains (piocher 2) ou envoyer un élève sur un îlot relié à ta cabane par tes élèves. Tu peux plaquer un adversaire plus faible : il reste dessous.',
    eleves: 'Les 8 élèves (3 de chaque par bande)',
    special: 'L’îlot spécial de cette cour',
    legende: [
      'Rond = bande rouge, carré = bande bleue.',
      'Petits badges à gauche d’un îlot = élèves plaqués dessous ; « ×3 » = hauteur de la pile.',
      'Allée violette pleine = la surveillante bloque le chemin ; traces de pas et silhouette pâle = où elle ira après le tour. Touche-la pour le détail.',
      'Cercle violet = îlot surveillé : on ne peut pas y plaquer un adversaire.',
      'Trait épais rouge ou bleu = chemin d’une bande depuis sa cabane : elle pose autour.',
      'Friandises +1 / +2 = goûters : touche-les pour voir quels îlots occuper.',
    ],
    fermer: 'Fermer',
  },
  passe: {
    bientot: (b: Bande) => `À la ${BANDES[b]} de jouer…`,
    titre: 'Passe le téléphone',
    a: (b: Bande) => `à la ${BANDES[b]}`,
    cache: 'Ne regarde pas le rang de l’adversaire !',
  },
  fin: {
    titre: 'DRIIIIING !',
    gagnant: (b: Bande) => `La ${BANDES[b]}`,
    raison: (r: RaisonFin) => RAISONS[r],
    score: (rouge: number, bleu: number) => `Goûters : rouge ${rouge}, bleu ${bleu}`,
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
      `${BANDES_TITRE[b]} ramasse ${nom.charAt(0).toLowerCase()}${nom.slice(1)} : +${n} !`,
    fin: (b: Bande) => `Victoire de la ${BANDES[b]} !`,
    cabane: 'la cabane adverse',
  },
} as const;
