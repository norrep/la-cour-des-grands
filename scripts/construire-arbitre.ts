/**
 * Regroupe l'arbitre (src/reseau, avec le moteur et les cartes) en un seul module JavaScript
 * pour la fonction serveur Supabase (`supabase/functions/arbitre/arbitre.js`).
 * À relancer après chaque changement des règles : `npm run serveur:construire`.
 * Le test tests/reseau/paquet-serveur.test.ts vérifie que le paquet est à jour.
 */
import { build } from 'esbuild';

export const ENTREE = 'src/reseau/index.ts';
export const SORTIE = 'supabase/functions/arbitre/arbitre.js';

export async function construire(ecrire: boolean): Promise<string> {
  const r = await build({
    entryPoints: [ENTREE],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    legalComments: 'none',
    banner: { js: '// Généré par scripts/construire-arbitre.ts — ne pas modifier à la main.' },
    write: false,
  });
  const code = r.outputFiles[0]?.text ?? '';
  if (ecrire) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(SORTIE, code);
  }
  return code;
}

if (process.argv[1]?.endsWith('construire-arbitre.ts')) {
  await construire(true);
  console.log(`Arbitre regroupé dans ${SORTIE}`);
}
