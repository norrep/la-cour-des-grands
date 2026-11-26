import { defineConfig, type Plugin } from 'vite';

/** Numéro de version : la date et l'heure de construction, heure de Paris (comparé à `version.json`). */
const VERSION = new Date().toLocaleString('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Écrit `version.json` à côté du jeu. Au lancement, le jeu le relit sans cache : si une version
 * plus récente est en ligne, il recharge la page (les navigateurs intégrés gardent longtemps
 * l'ancienne page en cache).
 */
function fichierVersion(): Plugin {
  return {
    name: 'fichier-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: VERSION }),
      });
    },
  };
}

// `base: './'` : chemins relatifs, pour que le jeu marche sous
// https://<compte>.github.io/la-cour-des-grands/ comme en local.
export default defineConfig({
  base: './',
  define: { __VERSION__: JSON.stringify(VERSION) },
  plugins: [fichierVersion()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
});
