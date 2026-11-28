/**
 * Tous les textes affichés à l'écran, en français, regroupés ici.
 * Le moteur de règles n'affiche rien : seul le rendu lit ce fichier.
 */
import type { Bande, EquipementId, RaisonFin, RoleId } from '../engine/types';
import type { SkinId } from '../game/skins/types';
import type { Niveau } from '../ia/index';
import { equipeDe } from './equipes';
import { surv } from './cartes';

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
    'Joker : plaque n’importe qui, et personne ne peut le plaquer. Jamais dans la cabane adverse.',
  populaire: 'Arrive avec des copains : pioche 3 élèves.',
  chouchou: 'Appelle son grand frère : pose aussitôt un 2e élève de 5 ou plus.',
  rapporteuse: '« Madame, c’est lui ! » : un adversaire voisin est puni.',
  fouine:
    'Passe par les buissons : se pose même loin de ton chemin, et ramène alors un copain (pioche 1).',
  contagieux: 'Atchoum ! Un élève adverse au hasard rate son prochain tour.',
  get delegue(): string {
    return `Mot d’excuse : tu choisis le goûter où file ${surv.role}.`;
  },
  grand: 'Pas de pouvoir : c’est le plus fort.',
};

/** Effet de chaque équipement spécial. */
const EFFETS_EQUIPEMENTS: Record<EquipementId, string> = {
  banc: 'Une planque : l’élève assis ici ne peut plus être plaqué, ni puni, ni déplacé.',
  cabanePerchee: 'Quand tu poses un élève ici, tu peux piocher 1 élève.',
  porteVieScolaire: 'Quand tu poses un élève ici, tu peux faire revenir un de tes élèves punis.',
  buts: 'Quand tu poses un élève ici, tu peux punir un adversaire de valeur 1 ou 2 situé à 2 allées.',
  toboggan:
    'Quand tu poses un élève ici, tu peux faire glisser un adversaire voisin vers un autre îlot.',
  marelle: 'Seules certaines valeurs peuvent se poser sur cette case.',
  bancMaitresses: 'Sous le regard des maîtresses, les pouvoirs des élèves ne s’appliquent pas ici.',
};

/** Nom de chaque camp, selon l'équipe qui le joue (DB.1). */
const BANDES = new Proxy({} as Record<Bande, string>, {
  get: (_, b) => equipeDe(b as Bande).bande,
});

const NIVEAUX_ORDI: Record<Niveau, string> = {
  hasard: 'au hasard',
  facile: 'facile',
  moyen: 'moyen',
  difficile: 'difficile',
};
const BANDES_TITRE = new Proxy({} as Record<Bande, string>, {
  get: (_, b) => {
    const nom = equipeDe(b as Bande).bande;
    return nom.charAt(0).toUpperCase() + nom.slice(1);
  },
});

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
    /** Les niveaux de l'ordi, en pastilles sous le bouton. */
    niveau: (n: Niveau) => NIVEAUX_ORDI[n],
    /** Ce que dit le Petit dans sa bulle : le but du jeu en une phrase. */
    bulle: 'Entre dans la cabane d’en face\nou ramasse les goûters !',
    equipements: 'Équipements',
    conseils: 'Conseils',
    sons: 'Sons',
    style: (nom: string) => `Style : ${nom}`,
  },
  /** Jouer en ligne avec un ami (DR.1–DR.8). */
  enLigne: {
    bouton: 'Avec un ami\nen ligne',
    titre: 'Jouer avec un ami',
    inviter: 'Inviter un ami',
    jaiUnCode: 'J’ai un code',
    reprendre: 'Reprendre ma partie',
    retour: 'Retour',
    connexion: 'On se connecte…',
    ouverture: 'On ouvre la partie…',
    arrivee: 'On rejoint ton ami…',
    tonCode: 'Ton code',
    consigneCode: 'Donne ce code à ton ami,\nou envoie-lui le lien.',
    partager: 'Envoyer le lien',
    copie: 'Lien copié !',
    attente: 'On attend ton ami…',
    annuler: 'Annuler',
    saisie: 'Tape le code de ton ami',
    rejoindre: 'Rejoindre',
    codeFaux: 'Ce code a 6 lettres. Vérifie-le !',
    messagePartage: (code: string) =>
      `Viens jouer à La Cour des Grands avec moi ! Mon code : ${code}`,
    titreInvite: 'Ton ami t’attend ! Ta bande ?',
    tourAdverse: 'Ton ami réfléchit…',
    aToi: 'À toi de jouer !',
    auTourAmi: 'Au tour de ton ami',
    envoi: 'C’est envoyé…',
    temps: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
    gagnant: (moi: boolean) => (moi ? 'Ta bande' : 'Ton ami'),
    raison: { abandon: 'gagne par abandon.', temps: 'gagne : le temps était écoulé.' },
    erreurs: {
      partie_introuvable: 'Aucune partie n’attend avec ce code.',
      partie_pleine: 'Cette partie a déjà commencé.',
      deja_dedans: 'C’est ta propre partie !',
      reseau: 'Pas de réseau. On réessaie dès que ça revient.',
      delai: 'Le serveur ne répond pas. Vérifie ta connexion et réessaie.',
      connexion_fermee:
        'Le jeu en ligne n’est pas encore ouvert (connexion sans compte désactivée).',
      autre: 'Oups, le serveur n’a pas répondu. Réessaie.',
    } as Record<string, string>,
  },
  /** Écran de choix avant la partie : la carte, puis l'équipe de chaque camp (DB.5). */
  choixPartie: {
    titreCarte: 'Où on joue ?',
    titreEquipe: 'Choisis ta bande',
    titreBas: 'Joueur 1 (en bas) : ta bande ?',
    titreHaut: 'Joueur 2 (en haut) : ta bande ?',
    pris: 'Aussi celle du joueur 1',
    retour: 'Retour',
    chargement: 'On prépare la cour…',
    /** La règle spéciale de chaque carte, en une phrase, sur sa carte de choix (DC.1). */
    regle: {
      'cour-premier-jour':
        'Les deux bancs sont des planques : assis dessus, personne ne te touche.',
      piscine: 'Le courant : à chaque tour, les bouées du grand bain tournent d’un cran.',
      'camp-scout': 'Sens unique : la tyrolienne ne fait que descendre, l’échelle que monter.',
    } as Record<string, string>,
    regleTitre: '★ Règle spéciale',
    /** Sous le nom de la carte : qui surveille. */
    avec: (nom: string) => `Surveillé par ${nom}`,
    jouerIci: 'On joue ici !',
    prendreBande: 'Je prends cette bande !',
    /** Sous le nom de la bande : le Grand, le Petit… et toute la bande. */
    toute: 'Toute la bande',
  },
  hud: {
    tourDe: (b: Bande) => `Au tour de la ${BANDES[b]}`,
    seuil: (n: number) => `Objectif : ${n} goûters`,
    points: (n: number) => `${n}`,
    couloir: (n: number) => `Pioche : ${n}`,
    cpe: (n: number) => `Punis : ${n}`,
    infirmerie: 'Infirmerie',
    rangVide: 'Ton rang est vide : appelle des copains !',
    ordiReflechit: 'L’ordi réfléchit…',
    aToi: 'À toi !',
    toucherCarte: 'Touche un élève : son pouvoir',
    consigneTour: 'Glisse un élève vers la cour, ou :',
    consigneSansPose: 'Aucune pose possible : appelle des copains.',
    aide: '?',
  },
  boutons: {
    appeler: (n: number) => (n > 1 ? `Appeler ${n} copains` : 'Appeler 1 copain'),
    /** Le rond jaune au-dessus de la main (DL.8) : « +2 / copains ». */
    appelerBas: (n: number) => (n > 1 ? 'copains' : 'copain'),
    passer: 'Passer',
    motExcuse: 'Mot d’excuse !',
    piocher: 'Piocher',
    infirmerie: 'Éternuer',
    rejouer: 'Rejouer',
    accueil: 'Accueil',
    pret: (b: Bande) => `Je suis la ${BANDES[b]}`,
  },
  choix: {
    populaire: 'Populaire : touche ta pioche pour faire venir 3 copains.',
    fouine: 'Fouine : touche ta pioche pour ramener 1 copain.',
    chouchou: 'Chouchou : glisse un 2e élève de 5 ou plus (cartes claires).',
    rapporteuse: 'Rapporteuse : touche l’adversaire qui tremble pour le faire punir.',
    contagieux:
      'Contagieux : touche la pioche d’en face, un adversaire au hasard rate son prochain tour.',
    get delegue(): string {
      return `Délégué : touche le goûter où envoyer ${surv.nom}, ou passe.`;
    },
    banc: '★ Banc : ton élève est planqué, personne ne peut plus le toucher.',
    cabanePerchee: '★ Cabane perchée : touche ta pioche pour piocher 1 élève.',
    porteVieScolaire: '★ Vie scolaire : touche l’élève puni à faire revenir.',
    buts: '★ Buts : touche l’adversaire (1 ou 2) à punir.',
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
    pileTitre: (n: number) => `Pile de ${n} : seul le dessus joue`,
    elevePile: (role: RoleId, b: Bande, valeur: number | null) =>
      `${ROLES_COURTS[role]} ${equipeDe(b).court} (${valeur === null ? 'J' : valeur})`,
    get garde(): string {
      return `${surv.Role} le garde : personne ne peut le ramasser tant qu’${surv.il} est là.`;
    },
    cabane: (b: Bande) =>
      `Cabane de la ${BANDES[b]}. L’adversaire qui y pose un élève relié à sa cabane gagne aussitôt.`,
    special: '★ Îlot spécial : ',
    surveillante: (actuelle: string) =>
      `${surv.Il} garde ${actuelle.charAt(0).toLowerCase()}${actuelle.slice(1)} : personne ne peut le ramasser. Après chaque tour complet, ${surv.il} part garder le goûter suivant. Dès qu’${surv.il} s’en va, un goûter déjà entouré est ramassé.`,
  },
  /** Les zones à bons points sont des goûters à ramasser, un par zone, dans l'ordre de la cour. */
  gouters: ['La tablette de chocolat', 'Le paquet de biscuits', 'Le bonbon', 'La sucette'],
  region: (points: number, noms: string[]) =>
    `Occupe ${noms.join(', ')} (tous à la fois) pour le ramasser : +${points} goûter${points > 1 ? 's' : ''}.`,
  regionTitre: (nom: string, points: number) => `${nom} (+${points})`,
  cinematiques: {
    cpe: { titre: 'Puni !', sous: 'Dénoncé par la Rapporteuse…' },
    infirmerie: { titre: 'Atchoum !', sous: 'Un élève file à l’infirmerie.' },
    grandsFreres: {
      titre: 'Le grand frère arrive !',
      sous: 'Le Chouchou appelle du renfort.',
    },
    sonnerie: { titre: 'DRIIIIING !', sous: 'La récré est finie.' },
    toboggan: { titre: 'Wiiiiz !', sous: 'Glissade sur le toboggan.' },
    get delegue(): { titre: string; sous: string } {
      return { titre: 'Mot d’excuse !', sous: `Le Délégué déplace ${surv.role}.` };
    },
    fouine: { titre: 'Par les buissons !', sous: 'La Fouine se faufile où elle veut.' },
    petit: { titre: 'Prise de catch !', sous: 'Le Petit de maternelle plaque tout le monde.' },
    populaire: { titre: 'Les copains arrivent !', sous: 'La Populaire fait venir 3 élèves.' },
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
  /** Nom de chaque skin, affiché sur le bouton « Style » de l'accueil. */
  skins: { cartoon: 'Cartoon', classique: 'Jetons' } as Record<SkinId, string>,
  chargement: 'Chargement…',
  conseils: {
    titre: 'Conseil',
    compris: 'Compris !',
    couper: 'Plus de conseils',
    but: 'Deux façons de gagner : entrer dans la cabane adverse, ou ramasser 3 goûters en entourant les friandises de la cour.',
    glisser:
      'Glisse un élève de ton rang vers la cour. Il ne peut aller que sur un îlot touchant ta cabane ou ton chemin.',
    appeler:
      'Le rond jaune « +2 copains », au-dessus de ta main, fait venir 2 élèves. Ton tour s’arrête là.',
    chemin:
      'Le trait de couleur, c’est ton chemin depuis ta cabane. Tu peux poser sur tout îlot qui touche ce chemin.',
    plaquer:
      'Un adversaire plus faible peut être plaqué : ton élève se pose dessus, l’autre reste coincé dessous.',
    pouvoir:
      'Cet élève a un pouvoir en arrivant : touche sa cible sur la cour (elle clignote en jaune).',
    get surveillante(): string {
      return `${surv.Role} garde un goûter (rond pointillé jaune et bleu) : personne ne peut le ramasser tant qu’${surv.il} est là. Après chaque tour complet, ${surv.il} passe au goûter suivant.`;
    },
    zones:
      'Les friandises +1 / +2 sont des goûters : occupe tous les îlots autour pour les ramasser. Touche une friandise pour voir lesquels.',
  },
  aide: {
    titre: 'Comment jouer',
    but: 'But : poser un élève dans la cabane adverse, ou ramasser les goûters (+1, +2) en occupant tous les îlots autour d’une friandise.',
    tour: 'À ton tour, une seule action : appeler des copains (piocher 2) ou envoyer un élève sur un îlot relié à ta cabane par tes élèves. Tu peux plaquer un adversaire plus faible : il reste dessous.',
    eleves: 'Les 8 élèves (3 de chaque par bande)',
    special: 'L’îlot spécial de cette cour',
    get legende(): string[] {
      return [
        `Rond = ${equipeDe('rouge').bande}, carré = ${equipeDe('bleu').bande}.`,
        'Petits badges à gauche d’un îlot = élèves plaqués dessous ; « ×3 » = hauteur de la pile.',
        `Rond pointillé jaune et bleu autour d’un goûter = ${surv.role} le garde : personne ne le ramasse. ${surv.Il} change de goûter après chaque tour. Touche-${surv.il === 'il' ? 'le' : 'la'} pour le détail.`,
        'Trait épais de la couleur d’une bande = son chemin depuis sa cabane : elle pose autour.',
        'Friandises +1 / +2 = goûters : touche-les pour voir quels îlots occuper.',
      ];
    },
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
      get josiane(): string {
        return `${surv.nom} garde ce goûter. ${surv.Il} bouge à chaque tour.`;
      },
    },
    cours: {
      'cour-premier-jour': {
        contexte:
          'Premier jour de récré ! Deux bandes se disputent la cour et ses goûters avant la sonnerie.',
        regle:
          'Deux bancs planques : l’élève assis dessus ne peut être ni plaqué, ni puni, ni déplacé.',
      },
      piscine: {
        contexte:
          'Sortie piscine ! Deux bandes se disputent les quatre coins et le grand bain sous l’œil de Monsieur Yvon.',
        regle:
          'Le courant : après chaque tour complet, les quatre bouées du grand bain tournent d’un cran, avec tout ce qu’il y a dessus. Chaque coin se fait et se défait avec elles.',
      },
      'camp-scout': {
        contexte:
          'Camp scout ! Deux bandes se disputent les goûters du camp avant que Babette ne sonne le rassemblement.',
        regle:
          'Sens unique : la tyrolienne ne fait que descendre (du hamac vers la source), l’échelle de corde ne fait que monter (du totem vers le tas de bois).',
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
    score: (rouge: number, bleu: number) =>
      // Le nom de l'équipe sans « Les » : « Écoliers 4, Vers de terre 1 » (pas « ver 1 »).
      `Goûters : ${equipeDe('rouge').nom.replace(/^Les /, '')} ${rouge}, ${equipeDe('bleu').nom.replace(/^Les /, '')} ${bleu}`,
    tours: (n: number) => `Partie en ${n} tours`,
  },
  get surveillante(): string {
    return surv.nom;
  },
  /** Verbes posés sur les cibles des pouvoirs qui se jouent en touchant un lieu ou un personnage. */
  pouvoirsSurLaCour: {
    piocher: 'Appeler !',
    eternuer: 'Atchoum !',
    motExcuse: 'Mot d’excuse !',
    recuperer: 'Récupérer qui ?',
  },
  /** Les lieux autour de la cour : chaque bande a sa pioche (les copains pas encore appelés) et ses punis. */
  lieux: {
    portail: 'Pioche',
    cpe: 'Punis',
    fichePortail: (b: Bande) => `Pioche de la ${BANDES[b]}`,
    texteCouloir: (n: number) =>
      n === 0
        ? 'La pioche est vide : on ne peut plus appeler de copains.'
        : `${n} copain${n > 1 ? 's attendent' : ' attend'} dans la pioche. Le rond jaune « +2 copains », au-dessus de ta main, en fait venir 2.`,
    punisPioche: (n: number) => `${n} puni${n > 1 ? 's' : ''}`,
    textePunisPioche: (n: number) =>
      `${n} élève${n > 1 ? 's ont été punis' : ' a été puni'} : ${n > 1 ? 'ils sont sortis' : 'il est sorti'} du jeu.`,
    ficheCpe: (b: Bande) => `Les punis (${BANDES[b]})`,
    texteCpe: (n: number) =>
      n === 0
        ? 'Personne n’est puni pour l’instant. La Rapporteuse et les buts font punir les adversaires.'
        : `${n} élève${n > 1 ? 's sont punis' : ' est puni'}, hors du jeu. La porte de la vie scolaire permet d’en faire revenir un.`,
    ficheRang: (b: Bande) => `Rang de la ${BANDES[b]}`,
    texteRang: (n: number) =>
      n === 0
        ? 'Plus personne dans son rang : il devra appeler des copains.'
        : `${n} élève${n > 1 ? 's' : ''} dans son rang, prêt${n > 1 ? 's' : ''} à entrer dans la cour. On ne sait pas lesquels.`,
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
    cpe: (role: RoleId, b: Bande) => `${ROLES[role]} (${BANDES[b]}) est puni !`,
    infirmerie: (b: Bande) => `Atchoum ! Un élève de la ${BANDES[b]} part à l’infirmerie.`,
    get surveillanteDelegue(): string {
      return `Le Délégué brandit son mot d’excuse : ${surv.role} va garder un autre goûter.`;
    },
    get surveillante(): string {
      return `${surv.Role} poursuit sa ronde.`;
    },
    courant: 'Le courant fait tourner le grand bain d’un cran.',
    rappel: (b: Bande) => `${BANDES_TITRE[b]} rappelle un élève dans son rang.`,
    repechage: (b: Bande) => `${BANDES_TITRE[b]} fait revenir un élève puni.`,
    glissade: (role: RoleId) => `${ROLES[role]} glisse sur le toboggan !`,
    passe: (b: Bande) => `${BANDES_TITRE[b]} renonce à son pouvoir.`,
    region: (b: Bande, nom: string, n: number) =>
      `${BANDES_TITRE[b]} ramasse ${nom.charAt(0).toLowerCase()}${nom.slice(1)} : +${n} !`,
    fin: (b: Bande) => `Victoire de la ${BANDES[b]} !`,
    cabane: 'la cabane adverse',
    ilot: 'un îlot',
  },
} as const;
