/**
 * Fait jouer des parties aléatoires et affiche les statistiques de victoire.
 * Usage : npm run simulate -- --parties 10000 --graine 1 --cour cour-premier-jour [--sans-equipements]
 */
import { COURS } from '../src/data/boards/index';
import { chargerCour, creerPartie } from '../src/engine/index';
import { simuler } from '../src/engine/simulation';

function lireArg(nom: string, defaut: string): string {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : defaut;
}

const parties = Number(lireArg('parties', '10000'));
const graine = Number(lireArg('graine', '1'));
const idCour = lireArg('cour', 'cour-premier-jour');
const equipements = !process.argv.includes('--sans-equipements');
const data = COURS[idCour];
if (!data) {
  console.error(`Cour inconnue : ${idCour}`);
  process.exit(1);
}
const cour = chargerCour(data);

const debut = performance.now();
const s = simuler(cour, parties, graine, (c, g) => creerPartie(c, { graine: g, equipements }));
const duree = (performance.now() - debut) / 1000;

const pct = (n: number) => `${((100 * n) / Math.max(1, parties - s.erreurs.length)).toFixed(1)} %`;
console.log(
  `\n${cour.nom} — ${parties} parties aléatoires (graine ${graine}, équipements ${equipements ? 'actifs' : 'désactivés'})`,
);
console.log(`Durée : ${duree.toFixed(1)} s\n`);
console.log(`Victoires bande rouge : ${s.victoires.rouge} (${pct(s.victoires.rouge)})`);
console.log(`Victoires bande bleue : ${s.victoires.bleu} (${pct(s.victoires.bleu)})`);
console.log(`Victoires du premier joueur : ${s.victoiresPremier} (${pct(s.victoiresPremier)})`);
console.log(`Victoires du second joueur  : ${s.victoiresSecond} (${pct(s.victoiresSecond)})\n`);
console.log(`Fin par la cabane      : ${s.raisons.cabane} (${pct(s.raisons.cabane)})`);
console.log(`Fin par les bons points: ${s.raisons.bonsPoints} (${pct(s.raisons.bonsPoints)})`);
console.log(`Fin par la sonnerie    : ${s.raisons.sonnerie} (${pct(s.raisons.sonnerie)})\n`);
console.log(
  `Tours de joueur par partie : moyenne ${s.toursMoyens.toFixed(1)}, min ${s.toursMin}, max ${s.toursMax}`,
);
console.log(`Erreurs : ${s.erreurs.length}`);
for (const err of s.erreurs.slice(0, 10)) console.log(`  graine ${err.graine} : ${err.message}`);
process.exit(s.erreurs.length > 0 ? 1 : 0);
