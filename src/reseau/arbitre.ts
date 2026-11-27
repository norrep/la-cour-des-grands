/**
 * L'arbitre : la logique du serveur de parties en ligne, sans stockage ni réseau.
 * Chaque fonction prend une partie et renvoie la partie suivante (l'originale n'est pas touchée),
 * ou lève un `Refus`. Le stockage (Supabase) et les tests s'en servent de la même façon.
 */
import { COURS } from '../data/boards/index';
import { EQUIPES } from '../data/equipes';
import {
  ActionIllegale,
  adversaire,
  chargerCour,
  creerPartie,
  jouer,
  type Action,
  type Bande,
  type Cour,
  type CourData,
  type EtatPartie,
} from '../engine/index';
import {
  Refus,
  type Demande,
  type EtatStocke,
  type Issue,
  type PartieServeur,
  type ReglagesEnLigne,
  type VueJoueur,
} from './protocole';
import { masquer } from './vue';

/** Temps par tour par défaut : 2 minutes (D7.3). */
export const DELAI_TOUR_DEFAUT = 120;
export const DELAI_TOUR_MIN = 30;
/** Une semaine : pour une partie « par correspondance ». */
export const DELAI_TOUR_MAX = 7 * 24 * 3600;

const cours = new Map<string, Cour>();

/** La cour compilée d'une carte (gardée en mémoire : elle ne change jamais). */
export function courDe(carte: string): Cour {
  let cour = cours.get(carte);
  if (!cour) {
    const data = COURS[carte];
    if (!data) throw new Refus('reglages_invalides', `Carte inconnue : ${carte}`);
    cour = chargerCour(data as CourData);
    cours.set(carte, cour);
  }
  return cour;
}

export function stocker(e: EtatPartie): EtatStocke {
  const { cour, ...reste } = e;
  return { ...reste, courId: cour.id };
}

export function restaurer(s: EtatStocke): EtatPartie {
  const { courId, ...reste } = s;
  return { ...reste, cour: courDe(courId) };
}

/** Vérifie et complète les réglages envoyés par un téléphone. */
export function validerReglages(r: Partial<ReglagesEnLigne>): ReglagesEnLigne {
  const carte = r.carte ?? 'cour-premier-jour';
  courDe(carte);
  const equipes = r.equipes ?? { rouge: 'ecoliers', bleu: 'ecoliers' };
  for (const b of ['rouge', 'bleu'] as const) {
    if (!(equipes[b] in EQUIPES)) throw new Refus('reglages_invalides', 'Équipe inconnue.');
  }
  const delai = r.delaiTour ?? DELAI_TOUR_DEFAUT;
  if (!Number.isFinite(delai) || delai < DELAI_TOUR_MIN || delai > DELAI_TOUR_MAX) {
    throw new Refus('reglages_invalides', 'Temps par tour hors limites.');
  }
  return {
    carte,
    equipements: r.equipements ?? true,
    equipes: { rouge: equipes.rouge, bleu: equipes.bleu },
    delaiTour: Math.round(delai),
  };
}

/** L'hôte ouvre une partie et attend son ami. Il joue le camp rouge. */
export function ouvrirPartie(
  id: string,
  code: string,
  hote: string,
  reglages: Partial<ReglagesEnLigne>,
  maintenant: number,
): PartieServeur {
  return {
    id,
    code,
    reglages: validerReglages(reglages),
    statut: 'attente',
    joueurs: { rouge: hote },
    etat: null,
    version: 0,
    issue: null,
    echeance: null,
    creeLe: maintenant,
    majLe: maintenant,
  };
}

/**
 * L'ami arrive avec le code : la partie commence. La graine vient du serveur (jamais d'un
 * téléphone), ce qui rend le mélange des couloirs imprévisible pour les deux joueurs.
 */
export function rejoindrePartie(
  p: PartieServeur,
  invite: string,
  graine: number,
  maintenant: number,
): PartieServeur {
  if (p.joueurs.rouge === invite || p.joueurs.bleu === invite) {
    throw new Refus('deja_dedans', 'Tu es déjà dans cette partie.');
  }
  if (p.statut !== 'attente' || p.joueurs.bleu) throw new Refus('partie_pleine');
  const etat = creerPartie(courDe(p.reglages.carte), {
    graine,
    equipements: p.reglages.equipements,
    // Comme à l'écran : un pouvoir sans vrai choix s'applique tout seul (DF.40).
    pouvoirsAuto: true,
  });
  return {
    ...p,
    statut: 'en_cours',
    joueurs: { ...p.joueurs, bleu: invite },
    etat: stocker(etat),
    version: p.version + 1,
    echeance: maintenant + p.reglages.delaiTour * 1000,
    majLe: maintenant,
  };
}

/** Le camp d'un compte dans la partie, ou un refus s'il n'y joue pas. */
export function bandeDe(p: PartieServeur, compte: string): Bande {
  if (p.joueurs.rouge === compte) return 'rouge';
  if (p.joueurs.bleu === compte) return 'bleu';
  throw new Refus('pas_joueur', 'Tu ne joues pas dans cette partie.');
}

function terminer(p: PartieServeur, issue: Issue, maintenant: number): PartieServeur {
  return {
    ...p,
    statut: 'finie',
    issue,
    echeance: null,
    version: p.version + 1,
    majLe: maintenant,
  };
}

function enCours(p: PartieServeur): EtatStocke {
  if (p.statut === 'finie') throw new Refus('finie', 'La partie est terminée.');
  if (p.statut !== 'en_cours' || !p.etat) throw new Refus('pas_commencee');
  return p.etat;
}

function jouerAction(
  p: PartieServeur,
  bande: Bande,
  action: Action,
  version: number,
  maintenant: number,
): PartieServeur {
  const etat = enCours(p);
  if (version !== p.version) {
    throw new Refus('version_perimee', 'La partie a changé entre-temps.');
  }
  if (etat.courant !== bande) throw new Refus('pas_ton_tour', 'Ce n’est pas ton tour.');
  if (p.echeance !== null && maintenant > p.echeance) {
    throw new Refus('pas_ton_tour', 'Ton temps est écoulé.');
  }
  let suivant: EtatPartie;
  try {
    suivant = jouer(restaurer(etat), action);
  } catch (err) {
    if (err instanceof ActionIllegale) throw new Refus('coup_illegal', err.message);
    throw err;
  }
  const s = stocker(suivant);
  if (suivant.fin) {
    return terminer(
      { ...p, etat: s },
      { gagnant: suivant.fin.gagnant, raison: suivant.fin.raison },
      maintenant,
    );
  }
  // Le temps repart à chaque nouveau tour (pas à chaque choix d'un même coup).
  const nouveauTour = suivant.courant !== etat.courant;
  return {
    ...p,
    etat: s,
    version: p.version + 1,
    echeance: nouveauTour ? maintenant + p.reglages.delaiTour * 1000 : p.echeance,
    majLe: maintenant,
  };
}

/** Traite une demande d'un joueur. */
export function traiter(
  p: PartieServeur,
  compte: string,
  demande: Demande,
  maintenant: number,
): PartieServeur {
  const bande = bandeDe(p, compte);
  switch (demande.type) {
    case 'jouer':
      return jouerAction(p, bande, demande.action, demande.version, maintenant);
    case 'abandonner': {
      if (p.statut === 'finie') throw new Refus('finie');
      // Abandonner avant l'arrivée de l'ami : la partie est simplement fermée, sans gagnant.
      if (p.statut === 'attente') {
        return { ...p, statut: 'finie', version: p.version + 1, majLe: maintenant };
      }
      return terminer(p, { gagnant: adversaire(bande), raison: 'abandon' }, maintenant);
    }
    case 'reclamer': {
      const etat = enCours(p);
      if (etat.courant === bande || p.echeance === null || maintenant <= p.echeance) {
        throw new Refus('pas_encore', 'L’adversaire a encore le temps de jouer.');
      }
      return terminer(p, { gagnant: bande, raison: 'temps' }, maintenant);
    }
  }
}

/** Pour la tâche de fond du serveur : termine la partie si le joueur courant a laissé filer son temps. */
export function verifierTemps(p: PartieServeur, maintenant: number): PartieServeur {
  if (p.statut !== 'en_cours' || !p.etat || p.echeance === null || maintenant <= p.echeance) {
    return p;
  }
  return terminer(p, { gagnant: adversaire(p.etat.courant), raison: 'temps' }, maintenant);
}

/** La partie telle que la voit un joueur. */
export function vuePour(p: PartieServeur, compte: string): VueJoueur {
  const bande = bandeDe(p, compte);
  return {
    id: p.id,
    code: p.code,
    version: p.version,
    reglages: p.reglages,
    statut: p.statut,
    bande,
    adversairePresent: Boolean(p.joueurs[adversaire(bande)]),
    // Une fois la partie finie, tout est montré : chacun peut voir la main de l'autre.
    etat: p.etat ? (p.statut === 'finie' ? p.etat : masquer(p.etat, bande)) : null,
    issue: p.issue,
    echeance: p.echeance,
  };
}
