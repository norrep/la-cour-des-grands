import type { RoleId } from './types';

export interface DefinitionRole {
  id: RoleId;
  /** Valeur de 1 à 7 ; `null` pour le joker. */
  valeur: number | null;
}

/** Les 8 rôles, du joker au 7. */
export const ROLES: readonly DefinitionRole[] = [
  { id: 'petit', valeur: null },
  { id: 'populaire', valeur: 1 },
  { id: 'chouchou', valeur: 2 },
  { id: 'rapporteuse', valeur: 3 },
  { id: 'fouine', valeur: 4 },
  { id: 'contagieux', valeur: 5 },
  { id: 'delegue', valeur: 6 },
  { id: 'grand', valeur: 7 },
];

export const EXEMPLAIRES_PAR_ROLE = 3;
export const TAILLE_RANG = 8;
export const ABSENTS_A_L_APPEL = 4;
export const RANG_DEPART_PREMIER = 4;
export const RANG_DEPART_SECOND = 5;
/** Élèves piochés par le pouvoir du Populaire. */
export const PIOCHE_POPULAIRE = 3;
/** Valeur minimale de l'élève posé par le pouvoir du Chouchou. */
export const VALEUR_MIN_CHOUCHOU = 5;

const PAR_ID: Record<RoleId, DefinitionRole> = Object.fromEntries(
  ROLES.map((r) => [r.id, r]),
) as Record<RoleId, DefinitionRole>;

export function valeur(role: RoleId): number | null {
  return PAR_ID[role].valeur;
}

export function estJoker(role: RoleId): boolean {
  return valeur(role) === null;
}
