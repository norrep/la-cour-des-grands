/**
 * La carte de la partie en cours (DB.5) : le nom de son surveillant et sa fiche. Comme les
 * équipes, c'est choisi avant la partie ; les textes lisent ce choix pour nommer le surveillant.
 */
export type CarteId = 'cour-premier-jour' | 'piscine' | 'camp-scout';

export const ORDRE_CARTES: readonly CarteId[] = ['cour-premier-jour', 'piscine', 'camp-scout'];

export interface InfosCarte {
  /** Nom court affiché sur l'écran de choix. */
  nom: string;
  /** Le surveillant de la carte : « Mme Josiane », « Monsieur Yvon »… */
  surveillant: string;
  /** « la surveillante », « le maître-nageur » : pour les phrases. */
  role: string;
  /** « il » ou « elle ». */
  pronom: 'il' | 'elle';
}

export const CARTES: Record<CarteId, InfosCarte> = {
  'cour-premier-jour': {
    nom: 'La cour',
    surveillant: 'Mme Josiane',
    role: 'la surveillante',
    pronom: 'elle',
  },
  piscine: {
    nom: 'La piscine',
    surveillant: 'Monsieur Yvon',
    role: 'le maître-nageur',
    pronom: 'il',
  },
  'camp-scout': {
    nom: 'Le camp scout',
    surveillant: 'Babette',
    role: 'la cheftaine',
    pronom: 'elle',
  },
};

let choix: CarteId = 'cour-premier-jour';

export function estCarte(id: string): id is CarteId {
  return id in CARTES;
}

export function choisirCarte(id: CarteId): void {
  choix = id;
}

export function carteEnJeu(): CarteId {
  return choix;
}

export function infosCarte(): InfosCarte {
  return CARTES[choix];
}

const maj = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** « la surveillante » / « La surveillante », « elle » / « Elle » pour la carte en cours. */
export const surv = {
  get role(): string {
    return infosCarte().role;
  },
  get Role(): string {
    return maj(infosCarte().role);
  },
  get il(): string {
    return infosCarte().pronom;
  },
  get Il(): string {
    return maj(infosCarte().pronom);
  },
  get nom(): string {
    return infosCarte().surveillant;
  },
};
