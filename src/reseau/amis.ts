/**
 * Les amis du jeu en ligne (DR.12) : chaque joueur a un pseudo et un code ami de 6 lettres. On
 * devient amis en jouant une partie ensemble, ou en tapant le code ami de l'autre ; l'amitié va
 * dans les deux sens. On peut ensuite inviter un ami de la liste : il voit l'invitation dans son
 * menu et rejoint d'un toucher, sans code à recopier.
 */
import { Refus } from './protocole';

export const PSEUDO_MIN = 2;
export const PSEUDO_MAX = 16;

/** Le pseudo nettoyé (espaces en trop retirés), ou un refus s'il est vide ou trop long. */
export function validerPseudo(saisie: string): string {
  const propre = String(saisie ?? '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
  const longueur = [...propre].length;
  if (longueur < PSEUDO_MIN || longueur > PSEUDO_MAX) {
    throw new Refus('pseudo_invalide', `Un pseudo de ${PSEUDO_MIN} à ${PSEUDO_MAX} lettres.`);
  }
  return propre;
}

/** Une invitation n'est plus montrée au-delà de ce délai (ms). */
export const DUREE_INVITATION = 24 * 3600 * 1000;
