import { jouer, type Action, type Bande, type EtatPartie, type RoleId } from '../engine/index';
import { alleesDuChemin } from './chemins';

/** Ce qu'un coup ferait, calculé avant de le jouer (aperçu pendant le glisser). */
export interface Apercu {
  /** Rôle de l'adversaire qui serait plaqué. */
  plaque: RoleId | null;
  /** Goûters (régions) qui seraient ramassés, avec leur valeur. */
  gouters: { region: string; bonsPoints: number }[];
  /** La partie serait gagnée tout de suite (cabane adverse ou goûters). */
  victoire: boolean;
  /** Allées que le chemin de la bande gagnerait. */
  nouvellesAllees: number[];
}

/**
 * Joue le coup sur une copie de l'état (le moteur ne modifie jamais l'état reçu) et résume ses
 * conséquences immédiates. Renvoie `null` si le coup est illégal.
 */
export function apercu(e: EtatPartie, action: Action): Apercu | null {
  let apres: EtatPartie;
  try {
    apres = jouer(e, action);
  } catch {
    return null;
  }
  const bande: Bande = e.courant;
  const nouveaux = apres.journal.slice(e.journal.length);
  let plaque: RoleId | null = null;
  const gouters: Apercu['gouters'] = [];
  let victoire = false;
  for (const ev of nouveaux) {
    if (ev.type === 'pose' && ev.bande === bande && ev.plaque && plaque === null)
      plaque = ev.plaque;
    if (ev.type === 'region' && ev.bande === bande) {
      gouters.push({ region: ev.region, bonsPoints: ev.bonsPoints });
    }
    if (ev.type === 'fin' && ev.gagnant === bande) victoire = true;
  }
  const avant = new Set(alleesDuChemin(e, bande));
  const nouvellesAllees = alleesDuChemin(apres, bande).filter((a) => !avant.has(a));
  return { plaque, gouters, victoire, nouvellesAllees };
}
