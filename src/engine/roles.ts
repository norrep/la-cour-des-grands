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

/**
 * Rôles signature des clans (DS.1) : tous des 5, à la place du Contagieux, le « petit pouvoir »
 * du 5 (demande de Clément : le rôle spécial d'un clan porte toujours le 5).
 */
export const SIGNATURES: Partial<Record<RoleId, { valeur: number; remplace: RoleOrigine }>> = {
  bagarreur: { valeur: 5, remplace: 'contagieux' },
  teleporteur: { valeur: 5, remplace: 'contagieux' },
};

/** Le Bagarreur ne bouscule qu'un adversaire de valeur strictement inférieure. */
export const VALEUR_MAX_BOUSCULE = 4;

/** Rôle signature d'un clan (et non l'un des 8 rôles d'origine). */
export function estSignature(role: RoleId): boolean {
  return SIGNATURES[role] !== undefined;
}

/** Les 8 rôles d'origine. */
export type RoleOrigine = Exclude<RoleId, 'bagarreur' | 'teleporteur'>;

/** Le rôle d'origine qu'un rôle signature remplace (lui-même pour les 8 rôles d'origine). */
export function roleRemplace(role: RoleId): RoleOrigine {
  return (SIGNATURES[role]?.remplace ?? role) as RoleOrigine;
}

export function valeur(role: RoleId): number | null {
  const signature = SIGNATURES[role];
  if (signature) return signature.valeur;
  return PAR_ID[role].valeur;
}

export function estJoker(role: RoleId): boolean {
  return valeur(role) === null;
}
