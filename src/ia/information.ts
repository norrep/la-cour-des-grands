import { adversaire, clonerEtat } from '../engine/partie';
import { melanger, tirer } from '../engine/rng';
import type { Bande, Eleve, EtatPartie } from '../engine/types';

/**
 * Ce que la bande `vue` sait du rang adverse : les élèves dont l'arrivée dans le rang a été
 * publique (repêchés à la CPE, rappelés d'un îlot) ou révélés (mis à l'infirmerie), et qui
 * n'ont pas été rejoués depuis (sinon ils ne seraient plus dans le rang).
 */
export function elevesConnus(e: EtatPartie, vue: Bande): Set<string> {
  const adv = adversaire(vue);
  const reveles = new Set<string>();
  for (const ev of e.journal) {
    if ((ev.type === 'repechage' || ev.type === 'rappel') && ev.bande === adv) {
      reveles.add(ev.eleveId);
    }
    if (ev.type === 'infirmerie' && ev.bande === adv) reveles.add(ev.eleveId);
  }
  for (const id of e.joueurs[adv].infirmerie) reveles.add(id);
  return new Set(e.joueurs[adv].rang.filter((el) => reveles.has(el.id)).map((el) => el.id));
}

/** Ordre canonique : le tirage ne dépend que de ce qui est caché, pas de son ordre réel. */
function trier(eleves: Eleve[]): Eleve[] {
  return eleves.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * « Déterminisation » : un état plausible vu par la bande `vue`, où tout ce qu'elle ne peut pas
 * savoir est retiré au hasard. Le couloir (ordre de pioche), les absents de l'appel et le rang
 * adverse (sauf les élèves connus) sont rebattus, et le hasard du moteur reçoit une nouvelle
 * graine. L'IA ne triche donc pas : elle raisonne sur des mondes possibles.
 * Le journal est vidé (la recherche n'en a pas besoin et cela accélère les copies).
 */
export function determiniser(e: EtatPartie, vue: Bande, rng: number): [EtatPartie, number] {
  const connus = elevesConnus(e, vue);
  const d = clonerEtat(e);
  d.journal = [];
  let r = rng;

  const moi = d.joueurs[vue];
  {
    const [m, s] = melanger(trier([...moi.couloir, ...moi.absents]), r);
    r = s;
    moi.couloir = m.slice(0, moi.couloir.length);
    moi.absents = m.slice(moi.couloir.length);
  }

  const lui = d.joueurs[adversaire(vue)];
  const fixes = lui.rang.filter((el) => connus.has(el.id));
  const caches = lui.rang.filter((el) => !connus.has(el.id));
  {
    const [m, s] = melanger(trier([...caches, ...lui.couloir, ...lui.absents]), r);
    r = s;
    const nr = caches.length;
    const nc = lui.couloir.length;
    const rang: Eleve[] = [...fixes, ...m.slice(0, nr)];
    lui.rang = rang;
    lui.couloir = m.slice(nr, nr + nc);
    lui.absents = m.slice(nr + nc);
  }

  const [v, s] = tirer(r);
  d.rng = Math.floor(v * 4294967296) >>> 0;
  return [d, s];
}
