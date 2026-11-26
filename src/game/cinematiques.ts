import type { Evenement } from '../engine/index';

/**
 * Cinématiques prévues. Pour l'instant, ce sont des bandeaux provisoires : l'emplacement est
 * prêt à recevoir une animation ou une vidéo quand les visuels seront fournis.
 */
export type CinematiqueId = 'cpe' | 'infirmerie' | 'grandsFreres' | 'sonnerie';

/**
 * Cinématiques à jouer après un coup, dans l'ordre, d'après les nouvelles lignes du journal.
 * `grandsFreres` : le coup était la pose du 2e élève du Chouchou.
 */
export function cinematiquesPour(nouveaux: Evenement[], grandsFreres = false): CinematiqueId[] {
  const liste: CinematiqueId[] = [];
  if (grandsFreres) liste.push('grandsFreres');
  for (const ev of nouveaux) {
    if (ev.type === 'cpe') liste.push('cpe');
    else if (ev.type === 'infirmerie') liste.push('infirmerie');
    else if (ev.type === 'fin' && ev.raison === 'sonnerie') liste.push('sonnerie');
  }
  return liste;
}
