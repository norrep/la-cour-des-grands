import { alleeOuverte, distancesDepuis, ilotsVoisins } from './cour';
import { graineVersEtat, melanger, tirerEntier } from './rng';
import {
  ABSENTS_A_L_APPEL,
  EXEMPLAIRES_PAR_ROLE,
  RANG_DEPART_PREMIER,
  RANG_DEPART_SECOND,
  ROLES,
  TAILLE_RANG,
  VALEUR_MIN_CHOUCHOU,
  estJoker,
  valeur,
} from './roles';
import type {
  Action,
  Bande,
  Cour,
  Effet,
  Eleve,
  EquipementId,
  EtatPartie,
  Evenement,
  Joueur,
  Option,
  OptionsPartie,
  RaisonFin,
  RoleId,
} from './types';

export class ActionIllegale extends Error {}

export const BANDES: readonly Bande[] = ['rouge', 'bleu'];

export function adversaire(bande: Bande): Bande {
  return bande === 'rouge' ? 'bleu' : 'rouge';
}

// ---------------------------------------------------------------------------
// Mise en place
// ---------------------------------------------------------------------------

function creerBande(bande: Bande): Eleve[] {
  const eleves: Eleve[] = [];
  for (const r of ROLES) {
    for (let n = 1; n <= EXEMPLAIRES_PAR_ROLE; n++) {
      eleves.push({ id: `${bande}-${r.id}-${n}`, bande, role: r.id });
    }
  }
  return eleves;
}

/** Crée une partie : couloirs mélangés, appel, premier joueur tiré au sort, rangs de départ. */
export function creerPartie(cour: Cour, options: OptionsPartie): EtatPartie {
  let rng = graineVersEtat(options.graine);
  const joueurs = {} as Record<Bande, Joueur>;
  for (const bande of BANDES) {
    const [melange, suivant] = melanger(creerBande(bande), rng);
    rng = suivant;
    joueurs[bande] = {
      absents: melange.slice(0, ABSENTS_A_L_APPEL),
      couloir: melange.slice(ABSENTS_A_L_APPEL),
      rang: [],
      cpe: [],
      infirmerie: [],
      bonsPoints: 0,
    };
  }

  let premier: Bande;
  if (options.premier) {
    premier = options.premier;
  } else {
    const [i, suivant] = tirerEntier(rng, 2);
    rng = suivant;
    premier = i === 0 ? 'rouge' : 'bleu';
  }
  const second = adversaire(premier);
  const jp = joueurs[premier];
  const js = joueurs[second];
  jp.rang = jp.couloir.splice(0, RANG_DEPART_PREMIER);
  js.rang = js.couloir.splice(0, RANG_DEPART_SECOND);

  const piles: Record<string, Eleve[]> = {};
  for (const id of cour.ilots) piles[id] = [];

  return {
    cour,
    equipements: options.equipements ?? true,
    rng,
    joueurs,
    piles,
    surveillante: cour.departRonde,
    premier,
    courant: premier,
    tour: 1,
    regionsPrises: {},
    effets: [],
    attente: null,
    fin: null,
    journal: [],
  };
}

/** Copie l'état pour le modifier sans toucher à l'original (les élèves et la cour sont partagés). */
export function clonerEtat(e: EtatPartie): EtatPartie {
  const joueurs = {} as Record<Bande, Joueur>;
  for (const b of BANDES) {
    const j = e.joueurs[b];
    joueurs[b] = {
      couloir: j.couloir.slice(),
      rang: j.rang.slice(),
      cpe: j.cpe.slice(),
      absents: j.absents.slice(),
      infirmerie: j.infirmerie.slice(),
      bonsPoints: j.bonsPoints,
    };
  }
  const piles: Record<string, Eleve[]> = {};
  for (const [id, pile] of Object.entries(e.piles)) piles[id] = pile.slice();
  return {
    ...e,
    joueurs,
    piles,
    regionsPrises: { ...e.regionsPrises },
    effets: e.effets.slice(),
    journal: e.journal.slice(),
  };
}

// ---------------------------------------------------------------------------
// Lecture de l'état
// ---------------------------------------------------------------------------

/** L'élève visible (au sommet de la pile) d'un îlot. */
export function sommet(e: EtatPartie, ilot: string): Eleve | undefined {
  const pile = e.piles[ilot];
  return pile ? pile[pile.length - 1] : undefined;
}

/**
 * La surveillante garde un goûter (règle A, D2.18) : la région où elle se tient ne peut pas
 * être ramassée. Elle ne bloque aucune allée et ne protège aucun îlot.
 * Renvoie l'id de cette région, ou `null` si la cour n'en a pas.
 */
export function gouterSurveille(e: EtatPartie): string | null {
  const n = e.cour.ronde.length;
  if (n === 0) return null;
  return e.cour.regions[e.cour.ronde[e.surveillante % n] as number]?.id ?? null;
}

/** Le goûter qu'elle gardera après le prochain tour complet (ses traces de pas). */
export function gouterSuivant(e: EtatPartie): string | null {
  const n = e.cour.ronde.length;
  if (n === 0) return null;
  return e.cour.regions[e.cour.ronde[(e.surveillante + 1) % n] as number]?.id ?? null;
}

function equipementActif(e: EtatPartie, noeud: string): EquipementId | undefined {
  return e.equipements ? e.cour.noeuds[noeud]?.equipement : undefined;
}

/**
 * Nœuds reliés à la cabane (ou aux cabanes) d'une bande : un chemin d'allées non bloquées
 * qui ne traverse que des îlots occupés par cette bande y mène.
 */
export function noeudsConnectes(e: EtatPartie, bande: Bande): Set<string> {
  const depart = e.cour.cabanes[bande];
  const traverses = new Set<string>(depart);
  const file = depart.slice();
  const atteints = new Set<string>();
  while (file.length > 0) {
    const n = file.shift() as string;
    for (const v of e.cour.voisins[n] ?? []) {
      // Sentier à sens unique : la chaîne ne se prolonge que dans le sens de la flèche.
      if (!alleeOuverte(e.cour, v.allee, n)) continue;
      atteints.add(v.noeud);
      if (
        !traverses.has(v.noeud) &&
        e.cour.noeuds[v.noeud]?.type === 'ilot' &&
        sommet(e, v.noeud)?.bande === bande
      ) {
        traverses.add(v.noeud);
        file.push(v.noeud);
      }
    }
  }
  return atteints;
}

function valeurAutorisee(e: EtatPartie, noeud: string, role: RoleId): boolean {
  if (!e.equipements) return true;
  const n = e.cour.noeuds[noeud];
  if (!n?.valeursAutorisees) return true;
  // Sur un îlot, la restriction vient de la marelle ; une cabane peut aussi en porter une.
  if (n.type === 'ilot' && n.equipement !== 'marelle') return true;
  const v = valeur(role);
  return n.valeursAutorisees.includes(v === null ? 'joker' : v);
}

/**
 * Le banc est une planque (demande de Clément, DF.13) : l'élève assis dessus ne peut être ni
 * recouvert par un adversaire, ni envoyé à la CPE, ni déplacé.
 */
export function estPlanque(e: EtatPartie, ilot: string): boolean {
  return equipementActif(e, ilot) === 'banc' && sommet(e, ilot) !== undefined;
}

/** L'élève `pose` peut-il recouvrir l'élève visible `dessous` ? (hors surveillance) */
export function peutRecouvrir(pose: Eleve, dessous: Eleve): boolean {
  if (dessous.bande === pose.bande) return true;
  if (estJoker(dessous.role) || estJoker(pose.role)) return true;
  return (valeur(pose.role) as number) > (valeur(dessous.role) as number);
}

/** Élève jouable : dans le rang et pas à l'infirmerie. */
export function estJouable(e: EtatPartie, bande: Bande, eleveId: string): boolean {
  const j = e.joueurs[bande];
  return j.rang.some((el) => el.id === eleveId) && !j.infirmerie.includes(eleveId);
}

/**
 * Vérifie qu'un élève peut être posé sur une cible, selon toutes les règles de pose.
 * `connectes` peut être fourni pour éviter de recalculer la connexion.
 */
export function posePossible(
  e: EtatPartie,
  bande: Bande,
  eleve: Eleve,
  cible: string,
  connectes?: Set<string>,
): boolean {
  const noeud = e.cour.noeuds[cible];
  if (!noeud) return false;
  if (!valeurAutorisee(e, cible, eleve.role)) return false;
  const relie = () => (connectes ?? noeudsConnectes(e, bande)).has(cible);

  if (noeud.type === 'cabane') {
    if (noeud.bande === bande) return false;
    if (estJoker(eleve.role)) return false;
    // La cabane adverse exige toujours une connexion, même pour la Fouine.
    return relie();
  }

  const dessus = sommet(e, cible);
  if (dessus && dessus.bande !== bande) {
    if (estPlanque(e, cible)) return false;
    if (!peutRecouvrir(eleve, dessus)) return false;
  }
  if (eleve.role === 'fouine') return true;
  return relie();
}

/** Toutes les cibles possibles pour un élève du rang de la bande courante. */
export function ciblesPossibles(e: EtatPartie, eleveId: string): string[] {
  const bande = e.courant;
  if (!estJouable(e, bande, eleveId)) return [];
  const eleve = e.joueurs[bande].rang.find((el) => el.id === eleveId) as Eleve;
  const connectes = noeudsConnectes(e, bande);
  return Object.keys(e.cour.noeuds).filter((id) => posePossible(e, bande, eleve, id, connectes));
}

function nombreAPiocher(j: Joueur, voulu: number): number {
  return Math.max(0, Math.min(voulu, TAILLE_RANG - j.rang.length, j.couloir.length));
}

export function peutAppeler(e: EtatPartie, bande: Bande): boolean {
  return nombreAPiocher(e.joueurs[bande], 2) > 0;
}

/** Le joueur peut-il poser au moins un élève ? */
export function peutEnvoyer(e: EtatPartie, bande: Bande): boolean {
  const j = e.joueurs[bande];
  const connectes = noeudsConnectes(e, bande);
  const ids = Object.keys(e.cour.noeuds);
  return j.rang.some(
    (el) =>
      !j.infirmerie.includes(el.id) && ids.some((id) => posePossible(e, bande, el, id, connectes)),
  );
}

// ---------------------------------------------------------------------------
// Options des effets
// ---------------------------------------------------------------------------

/** Les choix possibles pour un effet. Une liste vide signifie : aucune cible valide, l'effet ne fait rien. */
export function optionsEffet(e: EtatPartie, effet: Effet): Option[] {
  const bande = e.courant;
  const adv = adversaire(bande);
  const moi = e.joueurs[bande];
  const cour = e.cour;
  // Un adversaire planqué sur le banc est hors d'atteinte des pouvoirs.
  const adverseVisible = (ilot: string) => sommet(e, ilot)?.bande === adv && !estPlanque(e, ilot);

  if (effet.type === 'pouvoir') {
    switch (effet.role) {
      case 'populaire':
        return nombreAPiocher(moi, 2) > 0 ? [{ type: 'piocher' }] : [];
      case 'chouchou': {
        const options: Option[] = [];
        const connectes = noeudsConnectes(e, bande);
        for (const el of moi.rang) {
          const v = valeur(el.role);
          if (v === null || v < VALEUR_MIN_CHOUCHOU || moi.infirmerie.includes(el.id)) continue;
          for (const cible of Object.keys(cour.noeuds)) {
            if (posePossible(e, bande, el, cible, connectes)) {
              options.push({ type: 'poser', eleveId: el.id, cible });
            }
          }
        }
        return options;
      }
      case 'rapporteuse':
        return ilotsVoisins(cour, effet.ilot)
          .filter(adverseVisible)
          .map((ilot) => ({ type: 'cpe', ilot }));
      case 'contagieux': {
        const j = e.joueurs[adv];
        return j.rang.some((el) => !j.infirmerie.includes(el.id)) ? [{ type: 'infirmerie' }] : [];
      }
      case 'delegue':
        return e.cour.ronde.length > 1 ? [{ type: 'surveillante' }] : [];
      default:
        // Petit de maternelle, Fouine (pouvoir appliqué à la pose), Grand de CM2.
        return [];
    }
  }

  switch (effet.equipement) {
    case 'cabanePerchee':
      return nombreAPiocher(moi, 1) > 0 ? [{ type: 'piocher' }] : [];
    case 'porteVieScolaire':
      if (moi.rang.length >= TAILLE_RANG) return [];
      return moi.cpe.map((el) => ({ type: 'repecher', eleveId: el.id }));
    case 'buts': {
      const dist = distancesDepuis(cour, effet.ilot);
      return cour.ilots
        .filter((ilot) => {
          if (dist[ilot] !== 2 || !adverseVisible(ilot)) return false;
          const v = valeur((sommet(e, ilot) as Eleve).role);
          return v === 1 || v === 2;
        })
        .map((ilot) => ({ type: 'cpe', ilot }));
    }
    case 'toboggan': {
      const options: Option[] = [];
      for (const depart of ilotsVoisins(cour, effet.ilot)) {
        if (!adverseVisible(depart)) continue;
        for (const arrivee of ilotsVoisins(cour, depart)) {
          // On ne fait pas glisser un élève sur quelqu'un de planqué.
          if (estPlanque(e, arrivee)) continue;
          options.push({ type: 'glisser', depart, arrivee });
        }
      }
      return options;
    }
    default:
      // Banc (planque, appliquée par les règles de pose), marelle (restriction avant la pose)
      // et banc des maîtresses (annule les pouvoirs).
      return [];
  }
}

function sourceEffet(effet: Effet): RoleId | EquipementId {
  return effet.type === 'pouvoir' ? effet.role : effet.equipement;
}

// ---------------------------------------------------------------------------
// Actions légales
// ---------------------------------------------------------------------------

/** Toutes les actions légales du joueur courant. */
export function actionsLegales(e: EtatPartie): Action[] {
  if (e.fin) return [];
  if (e.attente) {
    return [
      ...e.attente.options.map((option): Action => ({ type: 'choisir', option })),
      { type: 'passer' },
    ];
  }
  const actions: Action[] = [];
  const bande = e.courant;
  if (peutAppeler(e, bande)) actions.push({ type: 'appeler' });
  const j = e.joueurs[bande];
  const connectes = noeudsConnectes(e, bande);
  for (const el of j.rang) {
    if (j.infirmerie.includes(el.id)) continue;
    for (const cible of Object.keys(e.cour.noeuds)) {
      if (posePossible(e, bande, el, cible, connectes)) {
        actions.push({ type: 'envoyer', eleveId: el.id, cible });
      }
    }
  }
  return actions;
}

function memeOption(a: Option, b: Option): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'piocher':
    case 'infirmerie':
      return true;
    case 'poser':
      return b.type === 'poser' && a.eleveId === b.eleveId && a.cible === b.cible;
    case 'cpe':
      return b.type === 'cpe' && a.ilot === b.ilot;
    case 'surveillante':
      return b.type === 'surveillante';
    case 'rappeler':
      return b.type === 'rappeler' && a.ilot === b.ilot;
    case 'repecher':
      return b.type === 'repecher' && a.eleveId === b.eleveId;
    case 'glisser':
      return b.type === 'glisser' && a.depart === b.depart && a.arrivee === b.arrivee;
  }
}

// ---------------------------------------------------------------------------
// Application des actions
// ---------------------------------------------------------------------------

/**
 * Applique une action et renvoie le nouvel état. L'état d'origine n'est jamais modifié,
 * ce qui permet d'annuler un coup en gardant l'état précédent.
 * Lève `ActionIllegale` si l'action n'est pas permise.
 */
export function jouer(etat: EtatPartie, action: Action): EtatPartie {
  if (etat.fin) throw new ActionIllegale('La partie est terminée.');
  const e = clonerEtat(etat);
  const bande = e.courant;

  if (e.attente) {
    const attente = e.attente;
    if (action.type === 'passer') {
      e.effets.pop();
      e.attente = null;
      noter(e, { type: 'passe', tour: e.tour, bande, effet: sourceEffet(attente.effet) });
    } else if (action.type === 'choisir') {
      if (!attente.options.some((o) => memeOption(o, action.option))) {
        throw new ActionIllegale('Ce choix n’est pas possible.');
      }
      e.effets.pop();
      e.attente = null;
      appliquerOption(e, attente.effet, action.option);
    } else {
      throw new ActionIllegale('Un choix est attendu pour terminer le coup.');
    }
    resoudre(e);
    return e;
  }

  switch (action.type) {
    case 'appeler': {
      const n = nombreAPiocher(e.joueurs[bande], 2);
      if (n === 0) throw new ActionIllegale('Impossible d’appeler des copains.');
      piocher(e, bande, n);
      noter(e, { type: 'appel', tour: e.tour, bande, nombre: n });
      finirTour(e);
      return e;
    }
    case 'envoyer': {
      if (!estJouable(e, bande, action.eleveId)) {
        throw new ActionIllegale('Cet élève ne peut pas être joué.');
      }
      const eleve = e.joueurs[bande].rang.find((el) => el.id === action.eleveId) as Eleve;
      if (!posePossible(e, bande, eleve, action.cible)) {
        throw new ActionIllegale('Pose impossible à cet endroit.');
      }
      poser(e, bande, eleve, action.cible);
      resoudre(e);
      return e;
    }
    default:
      throw new ActionIllegale('Aucun choix n’est attendu.');
  }
}

function noter(e: EtatPartie, ev: Evenement): void {
  e.journal.push(ev);
}

function piocher(e: EtatPartie, bande: Bande, n: number): void {
  const j = e.joueurs[bande];
  j.rang.push(...j.couloir.splice(0, n));
}

function terminer(e: EtatPartie, gagnant: Bande, raison: RaisonFin): void {
  if (e.fin) return;
  e.fin = { gagnant, raison };
  e.effets = [];
  e.attente = null;
  noter(e, { type: 'fin', tour: e.tour, gagnant, raison });
}

/** Pose un élève (règles déjà vérifiées) et empile ses effets. */
function poser(e: EtatPartie, bande: Bande, eleve: Eleve, cible: string): void {
  const j = e.joueurs[bande];
  j.rang = j.rang.filter((el) => el.id !== eleve.id);
  const noeud = e.cour.noeuds[cible];

  if (noeud?.type === 'cabane') {
    noter(e, { type: 'pose', tour: e.tour, bande, eleveId: eleve.id, role: eleve.role, cible });
    terminer(e, bande, 'cabane');
    return;
  }

  const dessous = sommet(e, cible);
  (e.piles[cible] as Eleve[]).push(eleve);
  noter(e, {
    type: 'pose',
    tour: e.tour,
    bande,
    eleveId: eleve.id,
    role: eleve.role,
    cible,
    ...(dessous && dessous.bande !== bande ? { plaque: dessous.role } : {}),
  });

  verifierRegions(e);
  if (e.fin) return;

  // Pile d'effets : le dernier empilé est résolu en premier.
  // Ordre de résolution : le pouvoir de l'élève, puis l'effet de l'îlot.
  const equipement = equipementActif(e, cible);
  if (equipement && equipement !== 'marelle' && equipement !== 'bancMaitresses') {
    e.effets.push({ type: 'equipement', equipement, ilot: cible, eleveId: eleve.id });
  }
  if (equipement !== 'bancMaitresses') {
    e.effets.push({ type: 'pouvoir', role: eleve.role, ilot: cible, eleveId: eleve.id });
  }
}

/** Retire l'élève visible d'un îlot et l'envoie chez la CPE. */
function envoyerCpe(e: EtatPartie, ilot: string): void {
  const eleve = (e.piles[ilot] as Eleve[]).pop() as Eleve;
  e.joueurs[eleve.bande].cpe.push(eleve);
  noter(e, {
    type: 'cpe',
    tour: e.tour,
    bande: eleve.bande,
    eleveId: eleve.id,
    role: eleve.role,
    ilot,
  });
}

function appliquerOption(e: EtatPartie, effet: Effet, option: Option): void {
  const bande = e.courant;
  const moi = e.joueurs[bande];
  const source = sourceEffet(effet);
  switch (option.type) {
    case 'piocher': {
      const n = nombreAPiocher(moi, source === 'populaire' ? 2 : 1);
      piocher(e, bande, n);
      noter(e, { type: 'pioche', tour: e.tour, bande, nombre: n, source });
      break;
    }
    case 'poser': {
      const eleve = moi.rang.find((el) => el.id === option.eleveId) as Eleve;
      poser(e, bande, eleve, option.cible);
      break;
    }
    case 'cpe':
      envoyerCpe(e, option.ilot);
      verifierRegions(e);
      break;
    case 'infirmerie': {
      const adv = e.joueurs[adversaire(bande)];
      const eligibles = adv.rang.filter((el) => !adv.infirmerie.includes(el.id));
      const [i, suivant] = tirerEntier(e.rng, eligibles.length);
      e.rng = suivant;
      const malade = eligibles[i] as Eleve;
      adv.infirmerie.push(malade.id);
      noter(e, { type: 'infirmerie', tour: e.tour, bande: malade.bande, eleveId: malade.id });
      break;
    }
    case 'surveillante': {
      const [i, suivant] = tirerEntier(e.rng, 2);
      e.rng = suivant;
      deplacerSurveillante(e, i + 1, true);
      break;
    }
    case 'rappeler': {
      const eleve = (e.piles[option.ilot] as Eleve[]).pop() as Eleve;
      moi.rang.push(eleve);
      noter(e, { type: 'rappel', tour: e.tour, bande, eleveId: eleve.id, ilot: option.ilot });
      verifierRegions(e);
      break;
    }
    case 'repecher': {
      const eleve = moi.cpe.find((el) => el.id === option.eleveId) as Eleve;
      moi.cpe = moi.cpe.filter((el) => el.id !== option.eleveId);
      moi.rang.push(eleve);
      noter(e, { type: 'repechage', tour: e.tour, bande, eleveId: eleve.id });
      break;
    }
    case 'glisser': {
      const eleve = (e.piles[option.depart] as Eleve[]).pop() as Eleve;
      (e.piles[option.arrivee] as Eleve[]).push(eleve);
      noter(e, {
        type: 'glissade',
        tour: e.tour,
        eleveId: eleve.id,
        role: eleve.role,
        depart: option.depart,
        arrivee: option.arrivee,
      });
      verifierRegions(e);
      break;
    }
  }
}

function deplacerSurveillante(e: EtatPartie, pas: number, parDelegue: boolean): void {
  const n = e.cour.ronde.length;
  if (n === 0) return;
  e.surveillante = (((e.surveillante + pas) % n) + n) % n;
  noter(e, { type: 'surveillante', tour: e.tour, position: e.surveillante, pas, parDelegue });
  // Le goûter qu'elle quitte peut être ramassé aussitôt s'il est déjà entouré.
  verifierRegions(e);
}

/** Le courant : chaque pile de l'anneau avance d'un îlot, la dernière revient à la première place. */
function faireTournerCourant(e: EtatPartie): void {
  const anneau = e.cour.courant;
  if (anneau.length < 2) return;
  const piles = anneau.map((id) => e.piles[id] as Eleve[]);
  anneau.forEach((id, i) => {
    e.piles[id] = piles[(i - 1 + anneau.length) % anneau.length] as Eleve[];
  });
  noter(e, { type: 'courant', tour: e.tour, anneau: anneau.slice() });
  verifierRegions(e);
}

/** Attribue les régions complétées (bande courante d'abord) et vérifie le seuil de bons points. */
function verifierRegions(e: EtatPartie): void {
  for (const bande of [e.courant, adversaire(e.courant)]) {
    const garde = gouterSurveille(e);
    for (const region of e.cour.regions) {
      if (e.regionsPrises[region.id] || region.id === garde) continue;
      if (region.ilots.every((ilot) => sommet(e, ilot)?.bande === bande)) {
        e.regionsPrises[region.id] = bande;
        e.joueurs[bande].bonsPoints += region.bonsPoints;
        noter(e, {
          type: 'region',
          tour: e.tour,
          bande,
          region: region.id,
          bonsPoints: region.bonsPoints,
        });
      }
    }
  }
  for (const bande of [e.courant, adversaire(e.courant)]) {
    if (e.joueurs[bande].bonsPoints >= e.cour.seuilBonsPoints) {
      terminer(e, bande, 'bonsPoints');
      return;
    }
  }
}

/** Résout les effets en attente jusqu'à ce qu'un choix soit nécessaire, puis termine le tour. */
function resoudre(e: EtatPartie): void {
  while (!e.fin && e.effets.length > 0) {
    const effet = e.effets[e.effets.length - 1] as Effet;
    const options = optionsEffet(e, effet);
    if (options.length > 0) {
      e.attente = { effet, options };
      return;
    }
    e.effets.pop();
  }
  if (!e.fin) finirTour(e);
}

function finirTour(e: EtatPartie): void {
  const bande = e.courant;
  // Les élèves de l'infirmerie reviennent à la fin du tour où ils étaient bloqués.
  e.joueurs[bande].infirmerie = [];
  // La surveillante avance après chaque tour complet (les deux joueurs ont joué),
  // puis le courant fait tourner l'anneau (piscine).
  if (bande !== e.premier) {
    deplacerSurveillante(e, 1, false);
    if (e.fin) return;
    faireTournerCourant(e);
  }
  if (e.fin) return;
  e.courant = adversaire(bande);
  e.tour += 1;

  // La sonnerie : le joueur qui commence son tour ne peut ni piocher ni poser.
  const suivant = e.courant;
  if (!peutAppeler(e, suivant) && !peutEnvoyer(e, suivant)) {
    const autre = adversaire(suivant);
    const ptsSuivant = e.joueurs[suivant].bonsPoints;
    const ptsAutre = e.joueurs[autre].bonsPoints;
    // À égalité, celui qui a bloqué la partie (le joueur bloqué) perd.
    terminer(e, ptsSuivant > ptsAutre ? suivant : autre, 'sonnerie');
  }
}
