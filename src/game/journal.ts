import { TEXTES } from '../data/textes';
import type { Cour, Evenement } from '../engine/index';

const J = TEXTES.journal;

/** Traduit un événement du moteur en phrase pour le journal (ou `null` s'il ne mérite pas de ligne). */
export function phraseEvenement(ev: Evenement, cour: Cour): string | null {
  const lieu = (id: string) =>
    cour.noeuds[id]?.type === 'cabane' ? J.cabane : (cour.noeuds[id]?.nom ?? id);
  switch (ev.type) {
    case 'appel':
      return J.appel(ev.bande, ev.nombre);
    case 'pose': {
      const base = J.pose(ev.bande, ev.role, lieu(ev.cible));
      return ev.plaque ? `${base} ${J.plaque(ev.plaque)}` : base;
    }
    case 'pioche':
      return J.pioche(ev.bande, ev.nombre);
    case 'cpe':
      return J.cpe(ev.role, ev.bande);
    case 'infirmerie':
      return J.infirmerie(ev.bande);
    case 'surveillante':
      return ev.parDelegue ? J.surveillanteDelegue : null;
    case 'rappel':
      return J.rappel(ev.bande);
    case 'repechage':
      return J.repechage(ev.bande);
    case 'glissade':
      return J.glissade(ev.role);
    case 'passe':
      return J.passe(ev.bande);
    case 'region': {
      const nom = cour.regions.find((r) => r.id === ev.region)?.nom ?? ev.region;
      return J.region(ev.bande, nom, ev.bonsPoints);
    }
    case 'fin':
      return J.fin(ev.gagnant);
  }
}

/** Les dernières lignes du journal, de la plus ancienne à la plus récente. */
export function dernieresLignes(journal: readonly Evenement[], cour: Cour, n: number): string[] {
  const lignes: string[] = [];
  for (let i = journal.length - 1; i >= 0 && lignes.length < n; i--) {
    const p = phraseEvenement(journal[i] as Evenement, cour);
    if (p) lignes.unshift(p);
  }
  return lignes.length > 0 ? lignes : [J.vide];
}
