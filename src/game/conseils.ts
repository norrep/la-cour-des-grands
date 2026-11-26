import { ciblesPossibles, sommet, type Bande, type EtatPartie } from '../engine/index';
import type { Phase } from './controleur';
import { alleesDuChemin } from './chemins';

/** Conseils pour débuter, montrés une fois à chaque joueur pendant ses premiers tours. */
export type ConseilId =
  'but' | 'glisser' | 'appeler' | 'chemin' | 'plaquer' | 'pouvoir' | 'surveillante' | 'zones';

/** À partir de quel tour (numéro de tour de joueur) parler de la surveillante et des zones. */
export const TOUR_SURVEILLANTE = 3;
export const TOUR_ZONES = 6;

/**
 * Le conseil à montrer maintenant au joueur `bande`, ou `null`.
 * `vus` : conseils déjà montrés à ce joueur. Un seul conseil à la fois, le plus utile d'abord.
 * `dejaCeTour` : ce joueur a déjà lu un conseil de préparation ce tour-ci ; on ne garde alors
 * que celui qui explique le pouvoir en cours, pour ne pas l'assommer.
 */
export function prochainConseil(
  e: EtatPartie,
  phase: Phase,
  vus: ReadonlySet<ConseilId>,
  dejaCeTour = false,
): ConseilId | null {
  const nouveau = (id: ConseilId): boolean => !vus.has(id);
  if (e.fin) return null;
  if (phase !== 'jeu') return null;
  if (e.attente) return nouveau('pouvoir') ? 'pouvoir' : null;
  if (dejaCeTour) return null;

  const bande = e.courant;
  const candidats: [ConseilId, () => boolean][] = [
    ['but', () => true],
    ['glisser', () => peutPoser(e, bande)],
    ['chemin', () => alleesDuChemin(e, bande).length > 0],
    ['plaquer', () => peutPlaquer(e, bande)],
    ['appeler', () => true],
    ['surveillante', () => e.tour >= TOUR_SURVEILLANTE],
    ['zones', () => e.tour >= TOUR_ZONES],
  ];
  for (const [id, condition] of candidats) {
    if (nouveau(id) && condition()) return id;
  }
  return null;
}

function cibles(e: EtatPartie, bande: Bande): string[] {
  const j = e.joueurs[bande];
  return j.rang.flatMap((el) => (j.infirmerie.includes(el.id) ? [] : ciblesPossibles(e, el.id)));
}

function peutPoser(e: EtatPartie, bande: Bande): boolean {
  return cibles(e, bande).length > 0;
}

/** Un élève du rang peut-il se poser sur un îlot dont l'adversaire tient le sommet ? */
function peutPlaquer(e: EtatPartie, bande: Bande): boolean {
  return cibles(e, bande).some((id) => {
    const dessus = sommet(e, id);
    return dessus !== undefined && dessus.bande !== bande;
  });
}
