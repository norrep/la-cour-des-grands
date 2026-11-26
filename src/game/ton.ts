/**
 * Ton des aides à l'écran : didactique pendant le tuto, pour rire ensuite (demande de Clément).
 * Le tuto est passé quand les conseils sont coupés, quand les deux joueurs les ont tous lus, ou
 * après une première partie terminée. C'est gardé sur le téléphone.
 */
import { variante } from '../data/textesFun';
import { ecrireDebutant, lireConseils, lireDebutant } from './preferences';

export function tonFun(): boolean {
  return !lireDebutant() || !lireConseils();
}

export function tutoPasse(): void {
  ecrireDebutant(false);
}

/** Le texte didactique pendant le tuto, une variante drôle ensuite. */
export function aide(didactique: string, drole: readonly string[], graine: number): string {
  return tonFun() ? variante(drole, graine) : didactique;
}
