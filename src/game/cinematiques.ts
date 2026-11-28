import { adversaire, type Bande, type Evenement, type RoleId } from '../engine/index';

/**
 * Panneaux animés des moments marquants. Pour l'instant, ce sont des bandeaux provisoires :
 * l'emplacement est prêt à recevoir une animation quand les visuels seront fournis.
 * On les réserve aux effets qui changent la partie, pour garder des tours rapides.
 */
export type CinematiqueId =
  | 'cpe'
  | 'infirmerie'
  | 'grandsFreres'
  | 'sonnerie'
  | 'gouter'
  | 'toboggan'
  | 'delegue'
  | 'fouine'
  | 'petit'
  | 'populaire';

/** Le rôle dont le pouvoir fait ce moment (sa vidéo montre cet élève), s'il y en a un. */
export function roleDuPouvoir(cin: Cinematique): RoleId | undefined {
  switch (cin.id) {
    case 'infirmerie':
      return 'contagieux';
    case 'grandsFreres':
      return 'chouchou';
    case 'delegue':
    case 'fouine':
    case 'petit':
    case 'populaire':
      return cin.id;
    case 'cpe':
      return cin.pouvoir;
    default:
      return undefined;
  }
}

/**
 * Le moment du pouvoir de ce rôle, joué par cette bande, quand l'élève vient d'être posé et que
 * son pouvoir attend encore un choix (DV.7). Seulement pour les pouvoirs qui ont un choix.
 */
export function cinematiqueDuPouvoir(role: RoleId, bande: Bande): Cinematique | undefined {
  switch (role) {
    case 'contagieux':
      return { id: 'infirmerie', bande };
    case 'chouchou':
      return { id: 'grandsFreres', bande };
    case 'delegue':
      return { id: 'delegue', bande };
    case 'rapporteuse':
      return { id: 'cpe', pouvoir: 'rapporteuse', bande };
    default:
      return undefined;
  }
}

/**
 * Moments qui n'existent qu'en vidéo : sans vidéo dans le skin, on n'affiche rien. La mise à la
 * CPE n'a plus de panneau « Puni ! » : on voit l'élève partir à la punition sur la cour (DL.13).
 */
export const CINEMATIQUES_VIDEO_SEULE: readonly CinematiqueId[] = [
  'fouine',
  'petit',
  'populaire',
  'cpe',
];

export interface Cinematique {
  id: CinematiqueId;
  /** Pour un goûter : la zone ramassée et la bande qui la prend. Pour l'infirmerie : la bande
   * du Contagieux qui a éternué. */
  region?: string;
  bande?: Bande;
  bonsPoints?: number;
  /** Pour une mise à la CPE : le rôle qui l'a provoquée, s'il y en a un (la Rapporteuse). */
  pouvoir?: RoleId;
  /** La vidéo du pouvoir n'a pas pu se jouer : montrer le panneau habituel. */
  sansVideo?: boolean;
}

/**
 * Panneaux à montrer après un coup, dans l'ordre, d'après les nouvelles lignes du journal.
 * `grandsFreres` : le coup était la pose du 2e élève du Chouchou. Un goûter qui fait gagner
 * n'a pas de panneau : l'écran de victoire le dit déjà.
 */
export function cinematiquesPour(
  nouveaux: Evenement[],
  grandsFreres = false,
  fouineLoin = false,
): Cinematique[] {
  const liste: Cinematique[] = [];
  const victoire = nouveaux.some((ev) => ev.type === 'fin' && ev.raison !== 'sonnerie');
  // La bande qui vient de jouer : c'est son élève qui apparaît dans la vidéo du pouvoir (DV.6).
  const premiere = nouveaux.find((ev) => ev.type === 'pose');
  if (grandsFreres)
    liste.push({
      id: 'grandsFreres',
      ...(premiere?.type === 'pose' ? { bande: premiere.bande } : {}),
    });
  // Le dernier élève posé : son pouvoir explique ce qui suit (Rapporteuse → CPE). Quand le
  // pouvoir s'applique tout seul (DF.40), la pose et ses effets arrivent dans le même coup.
  let pose: Evenement | undefined;
  for (const ev of nouveaux) {
    const parRapporteuse = pose?.type === 'pose' && pose.role === 'rapporteuse';
    if (ev.type === 'pose') {
      // 2e élève du Chouchou posé tout seul (un seul possible) : même panneau qu'à la main.
      if (!grandsFreres && pose?.type === 'pose' && pose.role === 'chouchou') {
        liste.push({ id: 'grandsFreres', bande: pose.bande });
      }
      pose = ev;
    }
    const auteur = pose?.type === 'pose' ? { bande: pose.bande } : {};
    if (ev.type === 'pose' && ev.role === 'petit' && ev.plaque)
      liste.push({ id: 'petit', bande: ev.bande });
    else if (ev.type === 'pose' && ev.role === 'fouine' && fouineLoin)
      liste.push({ id: 'fouine', bande: ev.bande });
    else if (ev.type === 'pioche' && ev.source === 'populaire')
      liste.push({ id: 'populaire', bande: ev.bande });
    else if (ev.type === 'cpe')
      liste.push(parRapporteuse ? { id: 'cpe', pouvoir: 'rapporteuse', ...auteur } : { id: 'cpe' });
    else if (ev.type === 'infirmerie')
      liste.push({ id: 'infirmerie', bande: adversaire(ev.bande) });
    else if (ev.type === 'glissade') liste.push({ id: 'toboggan' });
    else if (ev.type === 'surveillante' && ev.parDelegue) liste.push({ id: 'delegue', ...auteur });
    else if (ev.type === 'region' && !victoire) {
      liste.push({ id: 'gouter', region: ev.region, bande: ev.bande, bonsPoints: ev.bonsPoints });
    } else if (ev.type === 'fin' && ev.raison === 'sonnerie') liste.push({ id: 'sonnerie' });
  }
  return liste;
}
