/**
 * Tous les textes affichés à l'écran, en français, regroupés ici.
 * Le moteur de règles n'affiche rien : seul le rendu lit ce fichier.
 */
import type { Bande, EquipementId, RaisonFin, RoleId } from '../engine/types';
import type { SkinId } from '../game/skins/types';
import type { Niveau } from '../ia/index';

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
  chouchou: 'Appelle son grand frère : pose aussitôt un 2e élève de 5 ou plus.',
  rapporteuse: '« Madame, c’est lui ! » : un adversaire voisin part au coin.',
  fouine: 'Passe par les buissons : se pose même loin de ton chemin.',
  contagieux: 'Atchoum ! Un élève adverse au hasard rate son prochain tour.',
  delegue: 'Mot d’excuse : la surveillante file 1 ou 2 goûters plus loin (au hasard).',
  grand: 'Pas de pouvoir : c’est le plus fort.',
};

/** Effet de chaque équipement spécial. */
const EFFETS_EQUIPEMENTS: Record<EquipementId, string> = {
  banc: 'Une planque : l’élève assis ici ne peut plus être plaqué, ni envoyé au coin, ni déplacé.',
  cabanePerchee: 'Quand tu poses un élève ici, tu peux piocher 1 élève.',
  porteVieScolaire:
    'Quand tu poses un élève ici, tu peux faire sortir un de tes élèves du coin.',
  buts: 'Quand tu poses un élève ici, tu peux envoyer au coin un adversaire de valeur 1 ou 2 situé à 2 allées.',
  toboggan:
    'Quand tu poses un élève ici, tu peux faire glisser un adversaire voisin vers un autre îlot.',
  marelle: 'Seules certaines valeurs peuvent se poser sur cette case.',
  bancMaitresses: 'Sous le regard des maîtresses, les pouvoirs des élèves ne s’appliquent pas ici.',
};

const BANDES: Record<Bande, string> = { rouge: 'bande rouge', bleu: 'bande bleue' };

const NIVEAUX_ORDI: Record<Niveau, string> = {
  hasard: 'au hasard',
  facile: 'facile',
  moyen: 'moyen',
  difficile: 'difficile',
};
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
    contreOrdi: 'Jouer contre l’ordi',
    sousContreOrdi: (n: Niveau) => `niveau ${NIVEAUX_ORDI[n]}`,
    niveauOrdi: (n: Niveau) => `Niveau de l’ordi : ${NIVEAUX_ORDI[n]}`,
    equipements: (actifs: boolean) => `Équipements spéciaux : ${actifs ? 'oui' : 'non'}`,
    regle:
      'À ton tour : appelle des copains ou envoie un élève dans la cour. Atteins la cabane adverse ou ramasse les goûters.',
  },
  hud: {
    tourDe: (b: Bande) => `Au tour de la ${BANDES[b]}`,
    seuil: (n: number) => `Objectif : ${n} goûters`,
    points: (n: number) => `${n}`,
    couloir: (n: number) => `Pioche : ${n}`,
    cpe: (n: number) => `Au coin : ${n}`,
    infirmerie: 'Infirmerie',
    rangVide: 'Ton rang est vide : appelle des copains !',
    ordiReflechit: 'L’ordi réfléchit…',
    toucherCarte: 'Touche un élève : son pouvoir',
    consigneTour: 'Glisse un élève vers la cour, ou :',
    consigneSansPose: 'Aucune pose possible : appelle des copains.',
    aide: '?',
  },
  boutons: {
    appeler: (n: number) => (n > 1 ? `Appeler ${n} copains` : 'Appeler 1 copain'),
    passer: 'Passer',
    motExcuse: 'Mot d’excuse !',
    piocher: 'Piocher',
    infirmerie: 'Éternuer',
    rejouer: 'Rejouer',
    accueil: 'Accueil',
    pret: (b: Bande) => `Je suis la ${BANDES[b]}`,
  },
  choix: {
    populaire: 'Populaire : touche ta pioche pour faire venir 2 copains.',
    chouchou: 'Chouchou : glisse un 2e élève de 5 ou plus (cartes claires).',
    rapporteuse: 'Rapporteuse : touche l’adversaire qui tremble pour l’envoyer au coin.',
    contagieux:
      'Contagieux : touche la pioche d’en face, un adversaire au hasard rate son prochain tour.',
    delegue: 'Délégué : touche Mme Josiane pour qu’elle file 1 ou 2 goûters plus loin, ou passe.',
    banc: '★ Banc : ton élève est planqué, personne ne peut plus le toucher.',
    cabanePerchee: '★ Cabane perchée : touche ta pioche pour piocher 1 élève.',
    porteVieScolaire: '★ Vie scolaire : touche l’élève à faire sortir du coin.',
    buts: '★ Buts : touche l’adversaire (1 ou 2) à envoyer au coin.',
    tobogganDepart: '★ Toboggan : touche l’adversaire à faire glisser.',
    tobogganArrivee: '★ Toboggan : touche l’îlot d’arrivée.',
    bulle: 'Pouvoir !',
  },
  fiche: {
    eleve: (role: RoleId, valeur: number | null) =>
      `${ROLES[role]} (${valeur === null ? 'joker' : `valeur ${valeur}`})`,
    glisser: 'Lâche-le sur un îlot jaune.',
    infirmerie: 'À l’infirmerie : il ne peut pas jouer ce tour-ci.',
    nonJouable: 'Il ne peut se poser nulle part pour l’instant.',
    ilotVide: 'Îlot vide.',
    titreIlot: 'Un îlot',
    pile: (lignes: string[]) => `Pile, du dessus au dessous : ${lignes.join(', ')}.`,
    elevePile: (role: RoleId, b: Bande, valeur: number | null) =>
      `${ROLES_COURTS[role]} ${b === 'rouge' ? 'rouge' : 'bleu'} (${valeur === null ? 'J' : valeur})`,
    garde: 'La surveillante le garde : personne ne peut le ramasser tant qu’elle est là.',
    cabane: (b: Bande) =>
      `Cabane de la ${BANDES[b]}. L’adversaire qui y pose un élève relié à sa cabane gagne aussitôt.`,
    special: '★ Îlot spécial : ',
    surveillante: (actuelle: string) =>
      `Elle garde ${actuelle.charAt(0).toLowerCase()}${actuelle.slice(1)} : personne ne peut le ramasser. Après chaque tour complet, elle part garder le goûter suivant. Dès qu’elle s’en va, un goûter déjà entouré est ramassé.`,
  },
  /** Les zones à bons points sont des goûters à ramasser, un par zone, dans l'ordre de la cour. */
  gouters: ['La tablette de chocolat', 'Le paquet de biscuits', 'Le bonbon', 'La sucette'],
  region: (points: number, noms: string[]) =>
    `Occupe ${noms.join(', ')} (tous à la fois) pour le ramasser : +${points} goûter${points > 1 ? 's' : ''}.`,
  regionTitre: (nom: string, points: number) => `${nom} (+${points})`,
  regionPrise: (b: Bande, points: number) =>
    `Déjà ramassé par la ${BANDES[b]} (+${points}). Il n’y a plus rien à prendre ici.`,
  cinematiques: {
    cpe: { titre: 'Au coin !', sous: 'Dénoncé par la Rapporteuse…' },
    infirmerie: { titre: 'Atchoum !', sous: 'Un élève file à l’infirmerie.' },
    grandsFreres: {
      titre: 'Le grand frère arrive !',
      sous: 'Le Chouchou appelle du renfort.',
    },
    sonnerie: { titre: 'DRIIIIING !', sous: 'La récré est finie.' },
    toboggan: { titre: 'Wiiiiz !', sous: 'Glissade sur le toboggan.' },
    delegue: { titre: 'Mot d’excuse !', sous: 'Le Délégué déplace la surveillante.' },
    gouter: (b: Bande, nom: string, n: number) => ({
      titre: 'Miam !',
      sous: `La ${BANDES[b]} ramasse ${nom.charAt(0).toLowerCase()}${nom.slice(1)} (+${n}).`,
    }),
    passer: 'Touche pour passer',
  },
  animations: {
    plaque: 'Plaqué !',
    boum: 'BOUM !',
    victoire: 'Victoire !',
    sifflet: 'Tuuut !',
    atchoum: 'Atchoum !',
    apercuPlaque: (role: RoleId) =>
      `${ROLES_COURTS[role]} plaqué${role === 'populaire' || role === 'rapporteuse' || role === 'fouine' ? 'e' : ''} !`,
    gouter: (n: number) => `+${n} goûter${n > 1 ? 's' : ''} !`,
  },
  sons: (actifs: boolean) => `Sons : ${actifs ? 'oui' : 'non'}`,
  /** Nom de chaque skin, affiché sur le bouton « Style » de l'accueil. */
  skins: { cartoon: 'Cartoon', classique: 'Jetons' } as Record<SkinId, string>,
  style: (nom: string) => `Style : ${nom}`,
  chargement: 'Chargement…',
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
    pouvoir:
      'Cet élève a un pouvoir en arrivant : touche sa cible sur la cour (elle clignote en jaune).',
    surveillante:
      'La surveillante garde un goûter (rond lilas) : personne ne peut le ramasser tant qu’elle est là. Après chaque tour complet, elle passe au goûter suivant.',
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
      'Rond lilas autour d’un goûter = la surveillante le garde : personne ne le ramasse. Elle change de goûter après chaque tour. Touche-la pour le détail.',
      'Trait épais rouge ou bleu = chemin d’une bande depuis sa cabane : elle pose autour.',
      'Friandises +1 / +2 = goûters : touche-les pour voir quels îlots occuper.',
    ],
    fermer: 'Fermer',
  },
  planque: 'Planqué !',
  /** Fiche de la cour, au lancement de la partie (DF.17). */
  presentation: {
    bouton: 'C’est parti !',
    /** Plus tard : affiché pendant qu'on cherche un adversaire en ligne. */
    attente: 'On attend un adversaire',
    regleTitre: '★ Règle spéciale',
    sansRegle: 'Pas d’îlot spécial aujourd’hui : tous les îlots se valent.',
    bulles: {
      cabane: 'Pose un élève dans la cabane d’en face : gagné !',
      gouter: (seuil: number) =>
        `Entoure un goûter d’élèves pour le ramasser. ${seuil} bons points : gagné !`,
      banc: '★ Le banc est une planque : là, personne ne peut te toucher.',
      josiane: 'Mme Josiane garde ce goûter. Elle bouge à chaque tour.',
    },
    cours: {
      'cour-premier-jour': {
        contexte:
          'Premier jour de récré ! Les rouges et les bleus se disputent la cour et ses goûters avant la sonnerie.',
        regle:
          'Deux bancs planques : l’élève assis dessus ne peut être ni plaqué, ni envoyé au coin, ni déplacé.',
      },
    } as Partial<Record<string, { contexte: string; regle: string }>>,
  },
  passe: {
    bientot: (b: Bande) => `À la ${BANDES[b]} de jouer…`,
    titre: 'Passe le téléphone',
    a: (b: Bande) => `à la ${BANDES[b]}`,
    cache: 'Ne regarde pas le rang de l’adversaire !',
    resume: 'Au tour d’avant :',
  },
  fin: {
    titre: 'DRIIIIING !',
    gagnant: (b: Bande) => `La ${BANDES[b]}`,
    /** En solo : la phrase continue par « a envahi… » ou « a ramassé… ». */
    gagnantSolo: (ordi: boolean) => (ordi ? 'L’ordi' : 'Ta bande'),
    raison: (r: RaisonFin) => RAISONS[r],
    score: (rouge: number, bleu: number) => `Goûters : rouge ${rouge}, bleu ${bleu}`,
    tours: (n: number) => `Partie en ${n} tours`,
  },
  surveillante: 'Mme Josiane',
  /** Verbes posés sur les cibles des pouvoirs qui se jouent en touchant un lieu ou un personnage. */
  pouvoirsSurLaCour: {
    piocher: 'Appeler !',
    eternuer: 'Atchoum !',
    motExcuse: 'Mot d’excuse !',
    recuperer: 'Récupérer qui ?',
  },
  /** Les lieux autour de la cour : chaque bande a sa pioche (les copains pas encore appelés) et son coin (les punis). */
  lieux: {
    portail: 'Pioche',
    cpe: 'Au coin',
    fichePortail: (b: Bande) => `Pioche de la ${BANDES[b]}`,
    texteCouloir: (n: number) =>
      n === 0
        ? 'La pioche est vide : on ne peut plus appeler de copains.'
        : `${n} copain${n > 1 ? 's attendent' : ' attend'} dans la pioche. « Appeler des copains » en fait venir 2 dans le rang.`,
    ficheCpe: (b: Bande) => `Le coin (${BANDES[b]})`,
    texteCpe: (n: number) =>
      n === 0
        ? 'Personne n’est au coin pour l’instant. La Rapporteuse et les buts y envoient les adversaires.'
        : `${n} élève${n > 1 ? 's sont' : ' est'} au coin, hors du jeu. La porte de la vie scolaire permet d’en faire sortir un.`,
    texteInfirmerie: (n: number) =>
      `${n} élève${n > 1 ? 's sont enrhumés' : ' est enrhumé'} : ${n > 1 ? 'ils ratent' : 'il rate'} le prochain tour.`,
  },
  journal: {
    titre: 'Journal',
    vide: 'La récré commence !',
    appel: (b: Bande, n: number) => `${BANDES_TITRE[b]} appelle ${n} copain${n > 1 ? 's' : ''}.`,
    pose: (b: Bande, role: RoleId, lieu: string) =>
      `${BANDES_TITRE[b]} : ${ROLES[role]} → ${lieu}.`,
    plaque: (role: RoleId) => `${ROLES[role]} est plaqué au sol !`,
    pioche: (b: Bande, n: number) => `${BANDES_TITRE[b]} pioche ${n} élève${n > 1 ? 's' : ''}.`,
    cpe: (role: RoleId, b: Bande) => `${ROLES[role]} (${BANDES[b]}) part au coin !`,
    infirmerie: (b: Bande) => `Atchoum ! Un élève de la ${BANDES[b]} part à l’infirmerie.`,
    surveillanteDelegue:
      'Le Délégué brandit son mot d’excuse : la surveillante va garder un autre goûter.',
    surveillante: 'La surveillante poursuit sa ronde.',
    rappel: (b: Bande) => `${BANDES_TITRE[b]} rappelle un élève dans son rang.`,
    repechage: (b: Bande) => `${BANDES_TITRE[b]} fait sortir un élève du coin.`,
    glissade: (role: RoleId) => `${ROLES[role]} glisse sur le toboggan !`,
    passe: (b: Bande) => `${BANDES_TITRE[b]} renonce à son pouvoir.`,
    region: (b: Bande, nom: string, n: number) =>
      `${BANDES_TITRE[b]} ramasse ${nom.charAt(0).toLowerCase()}${nom.slice(1)} : +${n} !`,
    fin: (b: Bande) => `Victoire de la ${BANDES[b]} !`,
    cabane: 'la cabane adverse',
    ilot: 'un îlot',
  },
} as const;
