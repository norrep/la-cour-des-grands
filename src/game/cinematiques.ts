import type { Bande, Evenement } from '../engine/index';

/**
 * Panneaux animés des moments marquants. Pour l'instant, ce sont des bandeaux provisoires :
 * l'emplacement est prêt à recevoir une animation quand les visuels seront fournis.
 * On les réserve aux effets qui changent la partie, pour garder des tours rapides.
 */
export type CinematiqueId =
  'cpe' | 'infirmerie' | 'grandsFreres' | 'sonnerie' | 'gouter' | 'toboggan' | 'delegue';

export interface Cinematique {
  id: CinematiqueId;
  /** Pour un goûter : la zone ramassée et la bande qui la prend. */
  region?: string;
  bande?: Bande;
  bonsPoints?: number;
}

/**
 * Panneaux à montrer après un coup, dans l'ordre, d'après les nouvelles lignes du journal.
 * `grandsFreres` : le coup était la pose du 2e élève du Chouchou. Un goûter qui fait gagner
 * n'a pas de panneau : l'écran de victoire le dit déjà.
 */
export function cinematiquesPour(nouveaux: Evenement[], grandsFreres = false): Cinematique[] {
  const liste: Cinematique[] = [];
  const victoire = nouveaux.some((ev) => ev.type === 'fin' && ev.raison !== 'sonnerie');
  if (grandsFreres) liste.push({ id: 'grandsFreres' });
  for (const ev of nouveaux) {
    if (ev.type === 'cpe') liste.push({ id: 'cpe' });
    else if (ev.type === 'infirmerie') liste.push({ id: 'infirmerie' });
    else if (ev.type === 'glissade') liste.push({ id: 'toboggan' });
    else if (ev.type === 'surveillante' && ev.parDelegue) liste.push({ id: 'delegue' });
    else if (ev.type === 'region' && !victoire) {
      liste.push({ id: 'gouter', region: ev.region, bande: ev.bande, bonsPoints: ev.bonsPoints });
    } else if (ev.type === 'fin' && ev.raison === 'sonnerie') liste.push({ id: 'sonnerie' });
  }
  return liste;
}
