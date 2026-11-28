import type { EtatPartie } from '../engine/index';
import type { DonneesPartie } from './scenes/AccueilScene';

/**
 * Partie en cours sur ce téléphone (solo ou à deux), gardée après chaque coup : si l'appli est
 * fermée ou le téléphone sonne, « Reprendre ma partie » apparaît à l'accueil. Le jeu en ligne
 * a sa propre reprise, tenue par le serveur.
 */
export interface PartieSauvee {
  version: 1;
  /** Heure de la sauvegarde (ms). */
  le: number;
  donnees: DonneesPartie;
  /** L'état sans la cour, qui est rechargée depuis la carte. */
  etat: Omit<EtatPartie, 'cour'>;
}

const CLE = 'cour-des-grands.partie-locale';
/** Au-delà, on n'en parle plus. */
const DUREE = 7 * 24 * 3600 * 1000;

let memoire: string | null = null;

export function sauverPartie(donnees: DonneesPartie, etat: EtatPartie): void {
  const reste: Partial<EtatPartie> = { ...etat };
  delete reste.cour;
  const d: DonneesPartie = { ...donnees };
  delete d.enLigne;
  delete d.revanche;
  delete d.reprise;
  const sauvee: PartieSauvee = {
    version: 1,
    le: Date.now(),
    donnees: d,
    etat: reste as Omit<EtatPartie, 'cour'>,
  };
  try {
    memoire = JSON.stringify(sauvee);
    globalThis.localStorage?.setItem(CLE, memoire);
  } catch {
    // Stockage plein ou indisponible : pas de reprise, tant pis.
  }
}

export function oublierPartie(): void {
  memoire = null;
  try {
    globalThis.localStorage?.removeItem(CLE);
  } catch {
    // rien à faire
  }
}

export function lirePartieSauvee(): PartieSauvee | null {
  let brut = memoire;
  try {
    brut = globalThis.localStorage?.getItem(CLE) ?? memoire;
  } catch {
    // stockage indisponible : la mémoire suffit
  }
  if (!brut) return null;
  try {
    const p = JSON.parse(brut) as PartieSauvee;
    if (p.version !== 1 || !p.etat || !p.donnees || Date.now() - p.le > DUREE || p.etat.fin) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}
