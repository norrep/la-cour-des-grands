import { adversaire, creerPartie, jouer } from '../engine/partie';
import { graineVersEtat } from '../engine/rng';
import type { Bande, Cour, EtatPartie, RaisonFin, RoleId } from '../engine/types';
import { choisirAction, NIVEAUX, type ConfigIA, type Niveau } from './joueur';

/** Ce qu'on retient d'une partie IA contre IA, pour mesurer l'équilibre. */
export interface PartieIA {
  gagnant: Bande;
  raison: RaisonFin;
  premier: Bande;
  tours: number;
  /** Élèves posés, par rôle (les deux bandes). */
  poses: Partial<Record<RoleId, number>>;
  /** Élèves posés par la bande gagnante, par rôle. */
  posesGagnant: Partial<Record<RoleId, number>>;
  /** Pouvoirs ou équipements effectivement utilisés (un choix fait), par source. */
  pouvoirs: Record<string, number>;
  plaquages: number;
  cpe: number;
  appels: number;
}

const resoudre = (c: ConfigIA | Niveau): ConfigIA => (typeof c === 'string' ? NIVEAUX[c] : c);

/** Fait jouer une partie entière entre deux IA. */
export function partieIA(
  cour: Cour,
  graine: number,
  ia: Record<Bande, ConfigIA | Niveau>,
  options: { equipements?: boolean; premier?: Bande; maxActions?: number } = {},
): PartieIA {
  let e: EtatPartie = creerPartie(cour, {
    graine,
    equipements: options.equipements ?? true,
    ...(options.premier ? { premier: options.premier } : {}),
  });
  const cfg = { rouge: resoudre(ia.rouge), bleu: resoudre(ia.bleu) };
  let rng = graineVersEtat(graine * 104729 + 7);
  const max = options.maxActions ?? 3000;
  let n = 0;
  const pouvoirs: Record<string, number> = {};
  while (!e.fin) {
    if (++n > max) throw new Error(`Partie IA sans fin après ${max} actions`);
    const [action, s] = choisirAction(e, cfg[e.courant], rng);
    rng = s;
    if (action.type === 'choisir' && e.attente) {
      const ef = e.attente.effet;
      const src = ef.type === 'pouvoir' ? ef.role : ef.equipement;
      pouvoirs[src] = (pouvoirs[src] ?? 0) + 1;
    }
    e = jouer(e, action);
  }
  const fin = e.fin;
  const poses: Partial<Record<RoleId, number>> = {};
  const posesGagnant: Partial<Record<RoleId, number>> = {};
  let plaquages = 0;
  let cpe = 0;
  let appels = 0;
  for (const ev of e.journal) {
    if (ev.type === 'pose') {
      poses[ev.role] = (poses[ev.role] ?? 0) + 1;
      if (ev.bande === fin.gagnant) posesGagnant[ev.role] = (posesGagnant[ev.role] ?? 0) + 1;
      if (ev.plaque) plaquages++;
    } else if (ev.type === 'cpe') cpe++;
    else if (ev.type === 'appel') appels++;
  }
  return {
    gagnant: fin.gagnant,
    raison: fin.raison,
    premier: e.premier,
    tours: e.tour,
    poses,
    posesGagnant,
    pouvoirs,
    plaquages,
    cpe,
    appels,
  };
}

export interface BilanArene {
  parties: number;
  /** Victoires de l'IA A et de l'IA B (elles changent de couleur une partie sur deux). */
  victoiresA: number;
  victoiresB: number;
  victoiresPremier: number;
  victoiresRouge: number;
  raisons: Record<RaisonFin, number>;
  toursMoyens: number;
  toursMin: number;
  toursMax: number;
  poses: Partial<Record<RoleId, number>>;
  posesGagnant: Partial<Record<RoleId, number>>;
  pouvoirs: Record<string, number>;
  plaquagesMoyens: number;
  cpeMoyens: number;
  appelsMoyens: number;
  erreurs: { graine: number; message: string }[];
}

/**
 * Fait jouer `parties` parties entre deux IA. Une partie sur deux, elles échangent leurs
 * couleurs ; le premier joueur est tiré au hasard par la partie.
 */
export function arene(
  cour: Cour,
  a: ConfigIA | Niveau,
  b: ConfigIA | Niveau,
  parties: number,
  graine = 1,
  options: { equipements?: boolean; progression?: (i: number) => void } = {},
): BilanArene {
  const bilan: BilanArene = {
    parties,
    victoiresA: 0,
    victoiresB: 0,
    victoiresPremier: 0,
    victoiresRouge: 0,
    raisons: { cabane: 0, bonsPoints: 0, sonnerie: 0 },
    toursMoyens: 0,
    toursMin: Infinity,
    toursMax: 0,
    poses: {},
    posesGagnant: {},
    pouvoirs: {},
    plaquagesMoyens: 0,
    cpeMoyens: 0,
    appelsMoyens: 0,
    erreurs: [],
  };
  let tours = 0;
  let ok = 0;
  for (let i = 0; i < parties; i++) {
    const g = graine + i;
    const couleurA: Bande = i % 2 === 0 ? 'rouge' : 'bleu';
    const ia = { [couleurA]: a, [adversaire(couleurA)]: b } as Record<Bande, ConfigIA | Niveau>;
    try {
      const p = partieIA(cour, g, ia, { equipements: options.equipements ?? true });
      ok++;
      if (p.gagnant === couleurA) bilan.victoiresA++;
      else bilan.victoiresB++;
      if (p.gagnant === p.premier) bilan.victoiresPremier++;
      if (p.gagnant === 'rouge') bilan.victoiresRouge++;
      bilan.raisons[p.raison]++;
      tours += p.tours;
      bilan.toursMin = Math.min(bilan.toursMin, p.tours);
      bilan.toursMax = Math.max(bilan.toursMax, p.tours);
      for (const [r, v] of Object.entries(p.poses) as [RoleId, number][]) {
        bilan.poses[r] = (bilan.poses[r] ?? 0) + v;
      }
      for (const [r, v] of Object.entries(p.posesGagnant) as [RoleId, number][]) {
        bilan.posesGagnant[r] = (bilan.posesGagnant[r] ?? 0) + v;
      }
      for (const [s, v] of Object.entries(p.pouvoirs)) {
        bilan.pouvoirs[s] = (bilan.pouvoirs[s] ?? 0) + v;
      }
      bilan.plaquagesMoyens += p.plaquages;
      bilan.cpeMoyens += p.cpe;
      bilan.appelsMoyens += p.appels;
    } catch (err) {
      bilan.erreurs.push({ graine: g, message: err instanceof Error ? err.message : String(err) });
    }
    options.progression?.(i + 1);
  }
  const d = Math.max(1, ok);
  bilan.toursMoyens = tours / d;
  bilan.plaquagesMoyens /= d;
  bilan.cpeMoyens /= d;
  bilan.appelsMoyens /= d;
  return bilan;
}
