/**
 * Fait jouer des IA l'une contre l'autre et affiche le bilan (équilibre, rôles, pouvoirs).
 * Usage : npm run arene -- --a difficile --b moyen --parties 200 --graine 1
 *         [--cour cour-premier-jour] [--sans-equipements]
 * Niveaux : hasard, facile, moyen, difficile.
 */
import { COURS } from '../src/data/boards/index';
import { chargerCour } from '../src/engine/index';
import { arene, NIVEAUX, type Niveau } from '../src/ia/index';

function lireArg(nom: string, defaut: string): string {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : defaut;
}

const niveau = (nom: string): Niveau => {
  if (!(nom in NIVEAUX)) {
    console.error(`Niveau inconnu : ${nom} (choix : ${Object.keys(NIVEAUX).join(', ')})`);
    process.exit(1);
  }
  return nom as Niveau;
};

const a = niveau(lireArg('a', 'difficile'));
const b = niveau(lireArg('b', 'moyen'));
const parties = Number(lireArg('parties', '200'));
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
const s = arene(cour, a, b, parties, graine, {
  equipements,
  progression: (i) => {
    if (process.stdout.isTTY) process.stdout.write(`\r${i}/${parties}`);
  },
});
const duree = (performance.now() - debut) / 1000;
const n = Math.max(1, parties - s.erreurs.length);
const pct = (x: number) => `${((100 * x) / n).toFixed(1)} %`;

console.log(`\n${cour.nom} — IA ${a} (A) contre IA ${b} (B), ${parties} parties`);
console.log(
  `Graine ${graine}, équipements ${equipements ? 'actifs' : 'désactivés'}, durée ${duree.toFixed(1)} s\n`,
);
console.log(`Victoires A (${a}) : ${s.victoiresA} (${pct(s.victoiresA)})`);
console.log(`Victoires B (${b}) : ${s.victoiresB} (${pct(s.victoiresB)})`);
console.log(`Victoires du premier joueur : ${pct(s.victoiresPremier)}`);
console.log(`Victoires de la bande rouge : ${pct(s.victoiresRouge)}\n`);
console.log(`Fin par la cabane       : ${pct(s.raisons.cabane)}`);
console.log(`Fin par les goûters     : ${pct(s.raisons.bonsPoints)}`);
console.log(`Fin par la sonnerie     : ${pct(s.raisons.sonnerie)}\n`);
console.log(
  `Tours de joueur par partie : moyenne ${s.toursMoyens.toFixed(1)}, min ${s.toursMin}, max ${s.toursMax}`,
);
console.log(
  `Par partie : ${s.plaquagesMoyens.toFixed(1)} plaquages, ${s.cpeMoyens.toFixed(1)} élèves chez la CPE, ${s.appelsMoyens.toFixed(1)} appels\n`,
);
console.log('Élèves posés par partie (dont par le gagnant) :');
for (const r of Object.keys(s.poses).sort()) {
  const k = r as keyof typeof s.poses;
  console.log(
    `  ${r.padEnd(12)} ${((s.poses[k] ?? 0) / n).toFixed(2)}  (${((s.posesGagnant[k] ?? 0) / n).toFixed(2)})`,
  );
}
console.log('Pouvoirs et équipements utilisés par partie :');
for (const [src, v] of Object.entries(s.pouvoirs).sort()) {
  console.log(`  ${src.padEnd(12)} ${(v / n).toFixed(2)}`);
}
console.log(`\nErreurs : ${s.erreurs.length}`);
for (const err of s.erreurs.slice(0, 10)) console.log(`  graine ${err.graine} : ${err.message}`);
process.exit(s.erreurs.length > 0 ? 1 : 0);
