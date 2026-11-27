import { SalleMemoire, type ServeurParties } from '../../reseau/index';
import { enLigneDisponible } from './config';

/**
 * Le serveur de parties du téléphone. En vrai : Supabase (chargé seulement quand on joue en
 * ligne). Avec `?serveur=memoire` dans l'adresse : un serveur dans la page, pour tester l'écran
 * sans réseau ; l'ami est alors joué par les tests (`window.__salle.client('ami')`).
 */
let serveur: Promise<ServeurParties> | null = null;
let pret: ServeurParties | null = null;

/** Le serveur, s'il est déjà prêt (l'écran de jeu le reçoit de l'écran d'avant). */
export function serveurPret(): ServeurParties | null {
  return pret;
}

export function serveurMemoire(): boolean {
  return new URLSearchParams(location.search).get('serveur') === 'memoire';
}

export function jeuEnLigneDisponible(): boolean {
  return serveurMemoire() || enLigneDisponible();
}

export function serveurParties(): Promise<ServeurParties> {
  if (!serveur) {
    if (serveurMemoire()) {
      const salle = new SalleMemoire();
      (window as unknown as { __salle?: SalleMemoire }).__salle = salle;
      serveur = Promise.resolve(salle.client('moi'));
    } else {
      serveur = import('./supabase').then(({ ServeurSupabase }) => new ServeurSupabase());
    }
    void serveur.then((s) => (pret = s));
  }
  return serveur;
}

const CLE_PARTIE = 'cdg.partieEnLigne';

/** La dernière partie en ligne de ce téléphone, pour la reprendre après une coupure. */
export function lirePartieEnCours(): string | null {
  try {
    return localStorage.getItem(CLE_PARTIE);
  } catch {
    return null;
  }
}

export function ecrirePartieEnCours(id: string | null): void {
  try {
    if (id) localStorage.setItem(CLE_PARTIE, id);
    else localStorage.removeItem(CLE_PARTIE);
  } catch {
    // Pas de stockage (navigation privée) : la reprise passera par « mes parties ».
  }
}

/** Le lien d'invitation à partager : l'adresse du jeu avec le code. */
export function lienInvitation(code: string): string {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('code', code);
  if (serveurMemoire()) url.searchParams.set('serveur', 'memoire');
  return url.toString();
}

/** Le code d'invitation de l'adresse, si le jeu a été ouvert par un lien d'ami. */
export function codeDeLAdresse(): string | null {
  return new URLSearchParams(location.search).get('code');
}
