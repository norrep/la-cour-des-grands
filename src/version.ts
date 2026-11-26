/** Version du jeu construite (définie par Vite), pour l'afficher et vérifier les mises à jour. */
declare const __VERSION__: string | undefined;

export const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev';

/**
 * Si une version plus récente est en ligne, recharge la page en contournant le cache. Ne recharge
 * qu'une fois par version (on retient la dernière tentative), pour ne jamais boucler.
 */
export async function verifierMiseAJour(): Promise<void> {
  if (VERSION === 'dev' || typeof fetch === 'undefined') return;
  try {
    const reponse = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!reponse.ok) return;
    const { version } = (await reponse.json()) as { version?: string };
    if (!version || version === VERSION) return;
    const cle = 'cour-des-grands.rechargement';
    if (sessionStorage.getItem(cle) === version) return;
    sessionStorage.setItem(cle, version);
    location.replace(`${location.pathname}?v=${encodeURIComponent(version)}`);
  } catch {
    // Hors ligne ou stockage bloqué : on garde la version chargée.
  }
}
