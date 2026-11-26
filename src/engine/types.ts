/**
 * Types du moteur de règles.
 * Le moteur est pur et déterministe : aucune dépendance à Phaser ni au DOM.
 */

/** Une bande d'élèves. */
export type Bande = 'rouge' | 'bleu';

/** Les 8 rôles d'élèves. */
export type RoleId =
  | 'petit'
  | 'populaire'
  | 'chouchou'
  | 'rapporteuse'
  | 'fouine'
  | 'contagieux'
  | 'delegue'
  | 'grand';

/** Les équipements spéciaux, un par cour. */
export type EquipementId =
  | 'banc'
  | 'cabanePerchee'
  | 'porteVieScolaire'
  | 'buts'
  | 'toboggan'
  | 'marelle'
  | 'bancMaitresses';

/** Valeur acceptée par une case de marelle : un nombre de 1 à 7, ou le joker. */
export type ValeurCase = number | 'joker';

/** Un élève. Les objets élève ne sont jamais modifiés : on les déplace d'une liste à l'autre. */
export interface Eleve {
  readonly id: string;
  readonly bande: Bande;
  readonly role: RoleId;
}

// ---------------------------------------------------------------------------
// Données d'une cour (format JSON de src/data/boards/*.json)
// ---------------------------------------------------------------------------

export interface IlotData {
  id: string;
  nom: string;
  x: number;
  y: number;
  /** Équipement spécial, s'il y en a un. */
  equipement?: EquipementId;
  /** Équipement décoratif (sans effet), pour le rendu. */
  decor?: string;
  /** Marelle : valeurs acceptées sur cet îlot. */
  valeursAutorisees?: ValeurCase[];
}

export interface CabaneData {
  id: string;
  bande: Bande;
  x: number;
  y: number;
  /** Marelle : valeurs acceptées pour entrer dans cette cabane. */
  valeursAutorisees?: ValeurCase[];
}

export interface RegionData {
  id: string;
  nom: string;
  ilots: string[];
  bonsPoints: number;
}

export interface CourData {
  id: string;
  nom: string;
  cabanes: CabaneData[];
  ilots: IlotData[];
  allees: [string, string][];
  regions: RegionData[];
  seuilBonsPoints: number;
  /** Ronde de la surveillante : allées parcourues en boucle, dans l'ordre. */
  ronde: [string, string][];
  /** Index, dans la ronde, de l'allée de départ. */
  departRonde: number;
}

// ---------------------------------------------------------------------------
// Cour compilée (graphe prêt à l'emploi)
// ---------------------------------------------------------------------------

export interface Noeud {
  id: string;
  type: 'ilot' | 'cabane';
  nom: string;
  x: number;
  y: number;
  /** Bande propriétaire (cabanes uniquement). */
  bande?: Bande;
  equipement?: EquipementId;
  decor?: string;
  valeursAutorisees?: ValeurCase[];
}

export interface Voisin {
  noeud: string;
  /** Index de l'allée dans `Cour.allees`. */
  allee: number;
}

export interface Cour {
  id: string;
  nom: string;
  noeuds: Record<string, Noeud>;
  ilots: string[];
  cabanes: Record<Bande, string[]>;
  allees: [string, string][];
  voisins: Record<string, Voisin[]>;
  regions: RegionData[];
  seuilBonsPoints: number;
  /** Index des allées de la ronde, dans l'ordre. */
  ronde: number[];
  departRonde: number;
}

// ---------------------------------------------------------------------------
// État d'une partie
// ---------------------------------------------------------------------------

export interface Joueur {
  /** La pioche, face cachée. Le dessus est le début du tableau. */
  couloir: Eleve[];
  /** La main (8 élèves maximum). */
  rang: Eleve[];
  /** La défausse. */
  cpe: Eleve[];
  /** Les 4 élèves retirés à l'appel, hors jeu. */
  absents: Eleve[];
  /** Ids des élèves du rang bloqués pendant le prochain tour de ce joueur. */
  infirmerie: string[];
  bonsPoints: number;
}

/** Effet en attente de résolution (pouvoir d'un élève ou effet d'un îlot). */
export type Effet =
  | { type: 'pouvoir'; role: RoleId; ilot: string; eleveId: string }
  | { type: 'equipement'; equipement: EquipementId; ilot: string; eleveId: string };

/** Ce qu'un joueur peut choisir pour un effet. */
export type Option =
  | { type: 'piocher' }
  | { type: 'poser'; eleveId: string; cible: string }
  | { type: 'cpe'; ilot: string }
  | { type: 'infirmerie' }
  | { type: 'surveillante'; pas: -2 | -1 | 1 | 2 }
  | { type: 'rappeler'; ilot: string }
  | { type: 'repecher'; eleveId: string }
  | { type: 'glisser'; depart: string; arrivee: string };

export interface Attente {
  effet: Effet;
  options: Option[];
}

/** Les actions qu'un joueur envoie au moteur. */
export type Action =
  | { type: 'appeler' }
  | { type: 'envoyer'; eleveId: string; cible: string }
  | { type: 'choisir'; option: Option }
  | { type: 'passer' };

export type RaisonFin = 'cabane' | 'bonsPoints' | 'sonnerie';

export interface Fin {
  gagnant: Bande;
  raison: RaisonFin;
}

/** Entrées du journal des actions (lu par le rendu). */
export type Evenement =
  | { type: 'appel'; tour: number; bande: Bande; nombre: number }
  | {
      type: 'pose';
      tour: number;
      bande: Bande;
      eleveId: string;
      role: RoleId;
      cible: string;
      plaque?: RoleId;
    }
  | { type: 'pioche'; tour: number; bande: Bande; nombre: number; source: RoleId | EquipementId }
  | { type: 'cpe'; tour: number; bande: Bande; eleveId: string; role: RoleId; ilot: string }
  | { type: 'infirmerie'; tour: number; bande: Bande; eleveId: string }
  | { type: 'surveillante'; tour: number; position: number; pas: number; parDelegue: boolean }
  | { type: 'rappel'; tour: number; bande: Bande; eleveId: string; ilot: string }
  | { type: 'repechage'; tour: number; bande: Bande; eleveId: string }
  | { type: 'glissade'; tour: number; eleveId: string; depart: string; arrivee: string }
  | { type: 'passe'; tour: number; bande: Bande; effet: RoleId | EquipementId }
  | { type: 'region'; tour: number; bande: Bande; region: string; bonsPoints: number }
  | { type: 'fin'; tour: number; gagnant: Bande; raison: RaisonFin };

export interface OptionsPartie {
  /** Graine du générateur aléatoire. */
  graine: number;
  /** Équipements spéciaux actifs (désactivables pour les premières parties). */
  equipements?: boolean;
  /** Force le premier joueur (sinon tiré au hasard). */
  premier?: Bande;
}

export interface EtatPartie {
  /** Référence partagée, jamais modifiée. */
  cour: Cour;
  equipements: boolean;
  /** État du générateur aléatoire à graine. */
  rng: number;
  joueurs: Record<Bande, Joueur>;
  /** Piles d'élèves par îlot, du bas vers le haut. */
  piles: Record<string, Eleve[]>;
  /** Position de la surveillante : index dans `cour.ronde`. */
  surveillante: number;
  premier: Bande;
  courant: Bande;
  /** Numéro du tour de joueur en cours (1, 2, 3…). */
  tour: number;
  /** Régions déjà prises, et par qui. */
  regionsPrises: Record<string, Bande>;
  /** Pile d'effets en attente (le dernier est résolu en premier). */
  effets: Effet[];
  /** Choix demandé au joueur courant, s'il y en a un. */
  attente: Attente | null;
  fin: Fin | null;
  journal: Evenement[];
}
