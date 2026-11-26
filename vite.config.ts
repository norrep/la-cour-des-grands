import { defineConfig } from 'vite';

// `base: './'` : chemins relatifs, pour que le jeu marche sous
// https://<compte>.github.io/la-cour-des-grands/ comme en local.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
});
