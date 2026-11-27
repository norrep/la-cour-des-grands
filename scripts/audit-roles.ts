/**
 * Valeur de chaque rôle : une IA s'interdit de poser un rôle (elle peut le garder en main),
 * l'autre joue normalement. Plus la première perd, plus ce rôle compte dans la partie.
 * Ne modifie aucune règle : seule la façon de choisir de l'IA « privée » change.
 *
 * Usage : npx tsx scripts/audit-roles.ts --cour piscine --niveau moyen --parties 300
 */
import { COURS } from '../src/data/boards/index';
import { chargerCour } from '../src/engine/index';
import { creerPartie, jouer } from '../src/engine/partie';
import { graineVersEtat } from '../src/engine/rng';
import { ROLES } from '../src/engine/roles';
import type { Action, Bande, EtatPartie, RoleId } from '../src/engine/types';
import {
  actionsIA,
  choisirAction,
  cleAction,
  NIVEAUX,
  noterActions,
  type Niveau,
} from '../src/ia/index';

function lireArg(nom: string, defaut: string): string {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : defaut;
}
const idCour = lireArg('cour', 'cour-premier-jour');
const niveau = lireArg('niveau', 'moyen') as Niveau;
const parties = Number(lireArg('parties', '300'));
const graine = Number(lireArg('graine', '20000'));
const donnees = COURS[idCour];
if (!donnees) throw new Error(`Cour inconnue : ${idCour}`);
const cour = chargerCour(donnees);
const cfg = NIVEAUX[niveau];

/** Meilleure action sans poser le rôle interdit (repli : n'importe quelle action). */
function choisirSans(e: EtatPartie, interdit: RoleId, rng: number): [Action, number] {
  const moi = e.joueurs[e.courant];
  const permis = actionsIA(e).filter((a) => {
    if (a.type !== 'envoyer' || e.attente) return true;
    return moi.rang.find((el) => el.id === a.eleveId)?.role !== interdit;
  });
  if (permis.length === 0) return choisirAction(e, cfg, rng);
  if (permis.length === 1) return [permis[0] as Action, rng];
  const [notes, r] = noterActions(e, cfg, rng);
  let best = permis[0] as Action;
  let max = -Infinity;
  for (const a of permis) {
    const v = notes.get(cleAction(e, a)) ?? -Infinity;
    if (v > max) {
      max = v;
      best = a;
    }
  }
  return [best, r];
}

const resultats: Record<string, number> = {};
for (const { id: role } of ROLES) {
  let victoires = 0;
  for (let i = 0; i < parties; i++) {
    const g = graine + i;
    const prive: Bande = i % 2 === 0 ? 'rouge' : 'bleu';
    let e = creerPartie(cour, { graine: g, pouvoirsAuto: true });
    let rng = graineVersEtat(g * 7919 + 3);
    let n = 0;
    while (!e.fin && ++n < 3000) {
      const [a, r] = e.courant === prive ? choisirSans(e, role, rng) : choisirAction(e, cfg, rng);
      rng = r;
      e = jouer(e, a);
    }
    if (e.fin?.gagnant === prive) victoires++;
  }
  resultats[role] = (100 * victoires) / parties;
}
console.log(JSON.stringify({ carte: idCour, niveau, parties, victoiresSansLeRole: resultats }));
