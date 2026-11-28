/**
 * Audit d'équilibrage et de « fun » : fait jouer des IA l'une contre l'autre et écrit, pour
 * chaque partie, une ligne JSON détaillée (tour par tour) à analyser ensuite.
 * Ne modifie aucune règle : les variantes (« sans courant »…) ne sont que des expériences
 * appliquées à une copie de la cour, le temps de la simulation.
 *
 * Usage : npx tsx scripts/audit.ts --cour piscine --a difficile --b difficile --parties 400 \
 *           [--graine 1] [--variante aucune|sansSurveillante|sansCourant|sansSensUnique|sansEquipements|
 *            rondeCourte|deuxChemins|mainPlus2] \
 *           [--sortie audit.jsonl]
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { COURS } from '../src/data/boards/index';
import { chargerCour } from '../src/engine/index';
import { adversaire, creerPartie, jouer, noeudsConnectes, sommet } from '../src/engine/partie';
import { graineVersEtat } from '../src/engine/rng';
import { valeur } from '../src/engine/roles';
import type { Action, Bande, Cour, EtatPartie, Evenement } from '../src/engine/types';
import {
  cleAction,
  coupsDuTour,
  choisirAction,
  evaluer,
  menaceCabane,
  NIVEAUX,
  type Niveau,
} from '../src/ia/index';

function lireArg(nom: string, defaut: string): string {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : defaut;
}

const idCour = lireArg('cour', 'cour-premier-jour');
const a = lireArg('a', 'moyen') as Niveau;
const b = lireArg('b', 'moyen') as Niveau;
const parties = Number(lireArg('parties', '100'));
const graine = Number(lireArg('graine', '1'));
const variante = lireArg('variante', 'aucune');
const sortie = lireArg('sortie', 'audit.jsonl');
if (!(a in NIVEAUX) || !(b in NIVEAUX)) throw new Error('niveau inconnu');
// --plan fichier.json : essaie un plan de cour modifié (variante de carte), sans toucher au jeu.
const plan = lireArg('plan', '');
const data = plan ? JSON.parse(readFileSync(plan, 'utf8')) : COURS[idCour];
if (!data) throw new Error(`Cour inconnue : ${idCour}`);

const base = chargerCour(data);
let cour: Cour = base;
let equipements = true;
switch (variante) {
  case 'aucune':
    break;
  case 'sansSurveillante':
    cour = { ...base, ronde: [] };
    break;
  case 'sansCourant':
    cour = { ...base, courant: [] };
    break;
  case 'sansSensUnique':
    cour = { ...base, sensUnique: {} };
    break;
  case 'sansEquipements':
    equipements = false;
    break;
  // Piscine : le maître-nageur ne passe qu'une fois par le grand bain dans sa ronde.
  case 'rondeCourte':
    cour = { ...base, ronde: [...new Set(base.ronde)] };
    break;
  // Piscine : grand bain à 2, objectif 2 (le grand bain seul, ou les deux bords).
  case 'deuxChemins':
    cour = {
      ...base,
      seuilBonsPoints: 2,
      regions: base.regions.map((r) => (r.ilots.length === 4 ? { ...r, bonsPoints: 2 } : r)),
    };
    break;
  // Main de départ plus grosse : deux élèves de plus pour chaque joueur.
  case 'mainPlus2':
    break;
  default:
    throw new Error(`variante inconnue : ${variante}`);
}

/** Note de chaque première action possible, vue d'en haut (état réel, profondeur 1). */
function significativite(e: EtatPartie): { n: number; ecart: number; proches: number } {
  const best = new Map<string, number>();
  const moi = e.courant;
  for (const c of coupsDuTour(e, 400)) {
    const cle = cleAction(e, c.actions[0] as Action);
    const v = evaluer(c.etat, moi);
    if (v > (best.get(cle) ?? -Infinity)) best.set(cle, v);
  }
  const notes = [...best.values()].sort((x, y) => y - x);
  const top = notes[0] ?? 0;
  return {
    n: notes.length,
    ecart: notes.length > 1 ? Math.min(5000, top - (notes[1] as number)) : 5000,
    // Coups « presque aussi bons » que le meilleur : un vrai dilemme.
    proches: notes.filter((v) => top - v <= 40).length,
  };
}

writeFileSync(sortie, '');
const debut = performance.now();
for (let i = 0; i < parties; i++) {
  const g = graine + i;
  const couleurA: Bande = i % 2 === 0 ? 'rouge' : 'bleu';
  const cfg = { [couleurA]: NIVEAUX[a], [adversaire(couleurA)]: NIVEAUX[b] } as Record<
    Bande,
    (typeof NIVEAUX)[Niveau]
  >;
  let e = creerPartie(cour, { graine: g, equipements, pouvoirsAuto: true });
  if (variante === 'mainPlus2') {
    for (const bd of ['rouge', 'bleu'] as Bande[]) {
      const j = e.joueurs[bd];
      j.rang.push(...j.couloir.splice(0, 2));
    }
  }
  let rng = graineVersEtat(g * 104729 + 7);
  const tours: Record<string, unknown>[] = [];
  const traj: number[] = [];
  let n = 0;
  let bloquee = false;
  let tourCourant: Record<string, unknown> | null = null;
  let debutJournal = 0;
  while (!e.fin) {
    if (++n > 3000) {
      bloquee = true;
      break;
    }
    if (!e.attente && !tourCourant) {
      const s = significativite(e);
      tourCourant = { b: e.courant, t: e.tour, ...s };
      debutJournal = e.journal.length;
    }
    const [action, r] = choisirAction(e, cfg[e.courant], rng);
    rng = r;
    if (action.type === 'envoyer' && tourCourant && !tourCourant.role) {
      const el = e.joueurs[e.courant].rang.find((x) => x.id === action.eleveId);
      tourCourant.role = el?.role;
      tourCourant.cible = action.cible;
      if (el?.role === 'fouine') {
        tourCourant.horsChemin = !noeudsConnectes(e, e.courant).has(action.cible);
      }
      const dessous = sommet(e, action.cible);
      if (dessous && dessous.bande !== e.courant) tourCourant.plaque = dessous.role;
    }
    if (action.type === 'appeler' && tourCourant) tourCourant.role = 'appel';
    const avantTour = e.tour;
    e = jouer(e, action);
    if (e.fin || e.tour !== avantTour) {
      const evs = e.journal.slice(debutJournal) as Evenement[];
      if (tourCourant) {
        tourCourant.ev = evs
          .filter((ev) => ev.type !== 'pose' && ev.type !== 'appel')
          .map((ev) => {
            switch (ev.type) {
              case 'region':
                return `region:${ev.bande}:${ev.region}`;
              case 'cpe':
                return `cpe:${ev.role}`;
              case 'pioche':
                return `pioche:${ev.source}`;
              case 'surveillante':
                return ev.parDelegue ? `delegue:${ev.pas}` : 'ronde';
              case 'infirmerie':
                return 'infirmerie';
              case 'fin':
                return `fin:${ev.raison}`;
              default:
                return ev.type;
            }
          });
        tourCourant.poses = evs.filter((ev) => ev.type === 'pose').length;
        tourCourant.pts = [e.joueurs.rouge.bonsPoints, e.joueurs.bleu.bonsPoints];
        tours.push(tourCourant);
      }
      tourCourant = null;
      traj.push(
        e.fin ? (e.fin.gagnant === 'rouge' ? 99999 : -99999) : Math.round(evaluer(e, 'rouge')),
      );
    }
  }
  const perdant = e.fin ? adversaire(e.fin.gagnant) : null;
  const ligne = {
    carte: idCour,
    variante: plan ? (plan.split('/').pop() as string).replace('.json', '') : variante,
    a,
    b,
    graine: g,
    couleurA,
    premier: e.premier,
    bloquee,
    gagnant: e.fin?.gagnant ?? null,
    raison: e.fin?.raison ?? null,
    tours: e.tour,
    pts: [e.joueurs.rouge.bonsPoints, e.joueurs.bleu.bonsPoints],
    seuil: cour.seuilBonsPoints,
    // Le perdant était-il à un coup de gagner ?
    perdantMenacait: perdant ? menaceCabane({ ...e, fin: null, courant: perdant }, perdant) : false,
    reserve: perdant ? e.joueurs[perdant].rang.length + e.joueurs[perdant].couloir.length : null,
    // Valeur moyenne des sommets tenus en fin de partie.
    solidite: cour.ilots
      .map((id) => sommet(e, id))
      .flatMap((s) => (s ? [valeur(s.role) ?? 0] : [])),
    traj,
    t: tours,
  };
  appendFileSync(sortie, JSON.stringify(ligne) + '\n');
}
console.log(
  `${idCour} ${variante} ${a}/${b} : ${parties} parties en ${((performance.now() - debut) / 1000).toFixed(0)} s → ${sortie}`,
);
