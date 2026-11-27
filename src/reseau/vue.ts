import { adversaire, BANDES, type Bande, type Eleve, type Joueur } from '../engine/index';
import type { EtatStocke } from './protocole';

/**
 * Ce qu'un camp a le droit de savoir d'une partie, comme autour d'une vraie table :
 * - la cour, les piles, la CPE, les bons points, la surveillante et le journal sont publics ;
 * - son propre rang est visible ;
 * - le rang adverse est caché, sauf les élèves dont l'arrivée a été publique (repêchés à la CPE,
 *   rappelés d'un îlot, mis à l'infirmerie) ;
 * - les couloirs (l'ordre de pioche) et les absents de l'appel sont cachés pour TOUT LE MONDE ;
 * - le hasard du moteur est effacé (avec lui, on pourrait prévoir les prochaines pioches) ;
 * - le choix en attente de l'adversaire ne montre pas ses options (elles citent son rang).
 *
 * Un élève caché garde sa place (le nombre compte, à l'écran) mais perd son identité : voir
 * `estCache`. Son rôle affiché est un leurre, à ne jamais lire.
 */

const PREFIXE_CACHE = '?';

export function estCache(eleve: Eleve): boolean {
  return eleve.id.startsWith(PREFIXE_CACHE);
}

function caches(bande: Bande, lieu: string, n: number): Eleve[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${PREFIXE_CACHE}${bande}-${lieu}-${i}`,
    bande,
    role: 'petit' as const,
  }));
}

/** Les élèves du rang de `bande` que l'autre camp a vus arriver ou partir à l'infirmerie. */
export function elevesConnusDuRang(e: EtatStocke, bande: Bande): Set<string> {
  const reveles = new Set<string>(e.joueurs[bande].infirmerie);
  for (const ev of e.journal) {
    if (
      (ev.type === 'repechage' || ev.type === 'rappel' || ev.type === 'infirmerie') &&
      ev.bande === bande
    ) {
      reveles.add(ev.eleveId);
    }
  }
  return reveles;
}

function joueurVu(e: EtatStocke, bande: Bande, vue: Bande): Joueur {
  const j = e.joueurs[bande];
  let rang: Eleve[];
  if (bande === vue) {
    rang = j.rang.slice();
  } else {
    const connus = elevesConnusDuRang(e, bande);
    let n = 0;
    rang = j.rang.map((el) =>
      connus.has(el.id) ? el : { id: `${PREFIXE_CACHE}${bande}-rang-${n++}`, bande, role: 'petit' },
    );
  }
  return {
    couloir: caches(bande, 'couloir', j.couloir.length),
    rang,
    cpe: j.cpe.slice(),
    absents: caches(bande, 'absents', j.absents.length),
    infirmerie: j.infirmerie.slice(),
    bonsPoints: j.bonsPoints,
  };
}

/** L'état vu du camp `vue`. L'état d'origine n'est pas modifié. */
export function masquer(e: EtatStocke, vue: Bande): EtatStocke {
  const joueurs = {} as Record<Bande, Joueur>;
  for (const b of BANDES) joueurs[b] = joueurVu(e, b, vue);
  const piles: Record<string, Eleve[]> = {};
  for (const [id, pile] of Object.entries(e.piles)) piles[id] = pile.slice();
  let attente = e.attente;
  if (attente && e.courant === adversaire(vue)) attente = { effet: attente.effet, options: [] };
  return {
    ...e,
    rng: 0,
    joueurs,
    piles,
    regionsPrises: { ...e.regionsPrises },
    effets: e.effets.slice(),
    attente,
    journal: e.journal.slice(),
  };
}
