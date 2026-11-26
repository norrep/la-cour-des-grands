import { sommet, type Bande, type EtatPartie } from '../engine/index';

/**
 * Allées du « chemin à la craie » d'une bande : celles qui relient sa cabane et ses îlots
 * (élève de la bande au sommet) entre eux.
 * C'est la partie de la cour depuis laquelle la bande peut poser (voir `noeudsConnectes`).
 */
export function alleesDuChemin(e: EtatPartie, bande: Bande): number[] {
  const depart = e.cour.cabanes[bande];
  const traverses = new Set<string>(depart);
  const file = depart.slice();
  const allees = new Set<number>();
  while (file.length > 0) {
    const n = file.shift() as string;
    for (const v of e.cour.voisins[n] ?? []) {
      const aMoi = e.cour.noeuds[v.noeud]?.type === 'ilot' && sommet(e, v.noeud)?.bande === bande;
      if (!aMoi) continue;
      allees.add(v.allee);
      if (!traverses.has(v.noeud)) {
        traverses.add(v.noeud);
        file.push(v.noeud);
      }
    }
  }
  return [...allees].sort((a, b) => a - b);
}
