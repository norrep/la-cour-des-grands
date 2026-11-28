/**
 * La cour vue de l'autre côté (DR.11). En ligne, chacun voit sa cabane en bas : le téléphone de
 * l'invité (camp bleu, en haut) montre la partie RETOURNÉE, où il joue le camp rouge.
 *
 * Toutes les cours sont symétriques par demi-tour (même graphe, mêmes équipements, mêmes sens
 * uniques, même ronde et même courant à un décalage près) : retourner une partie, c'est échanger
 * les deux bandes et envoyer chaque îlot sur son symétrique. On obtient une partie tout aussi
 * légale, que l'écran dessine sans rien savoir du retournement. Les coups joués dans la partie
 * retournée sont retournés à nouveau avant de partir au serveur (le retournement est sa propre
 * réciproque).
 */
import {
  type Action,
  type Bande,
  type Cour,
  type Effet,
  type Eleve,
  type Evenement,
  type Joueur,
  type Option,
} from '../engine/index';
import type { EtatStocke, Issue } from './protocole';

export interface Miroir {
  /** L'îlot ou la cabane symétrique. */
  noeud(id: string): string;
  /** La région symétrique. */
  region(id: string): string;
  /** La place symétrique dans la ronde du surveillant. */
  ronde(i: number): number;
  /** L'anneau du courant retourné, dans l'ordre de la cour (il commence au même îlot). */
  anneau(ids: readonly string[]): string[];
}

export class CourAsymetrique extends Error {}

const autre = (b: Bande): Bande => (b === 'rouge' ? 'bleu' : 'rouge');

const caches = new Map<string, Miroir>();

/**
 * Le miroir d'une cour : chaque nœud va sur celui qui est le plus proche de son point opposé
 * (x, y) → (1 − x, 1 − y). Vérifie que c'est bien une symétrie du jeu (sinon lève une erreur).
 */
export function miroirDe(cour: Cour): Miroir {
  const deja = caches.get(cour.id);
  if (deja) return deja;
  const ids = Object.keys(cour.noeuds);
  const sigma: Record<string, string> = {};
  for (const id of ids) {
    const n = cour.noeuds[id];
    if (!n) continue;
    let meilleur = id;
    let dMin = Infinity;
    for (const autreId of ids) {
      const m = cour.noeuds[autreId];
      if (!m) continue;
      const d = Math.hypot(1 - n.x - m.x, 1 - n.y - m.y);
      if (d < dMin) {
        dMin = d;
        meilleur = autreId;
      }
    }
    sigma[id] = meilleur;
  }
  const s = (id: string): string => {
    const r = sigma[id];
    if (r === undefined) throw new CourAsymetrique(`${cour.id} : nœud inconnu ${id}`);
    return r;
  };
  const verifier = (ok: boolean, quoi: string): void => {
    if (!ok) throw new CourAsymetrique(`${cour.id} : pas symétrique (${quoi})`);
  };
  for (const id of ids) {
    const n = cour.noeuds[id];
    const m = cour.noeuds[s(id)];
    verifier(s(s(id)) === id, `réciproque ${id}`);
    verifier(n?.type === m?.type && n?.equipement === m?.equipement, `nature de ${id}`);
    if (n?.bande) verifier(m?.bande === autre(n.bande), `cabane ${id}`);
  }
  const cleAllee = (a: string, b: string): string => [a, b].sort().join('|');
  const allees = new Set(cour.allees.map(([a, b]) => cleAllee(a, b)));
  for (const [a, b] of cour.allees) verifier(allees.has(cleAllee(s(a), s(b))), `allée ${a}-${b}`);
  for (const [i, depuis] of Object.entries(cour.sensUnique)) {
    const [a, b] = cour.allees[Number(i)] ?? ['', ''];
    const vers = depuis === a ? b : a;
    const j = cour.allees.findIndex(([x, y]) => cleAllee(x, y) === cleAllee(s(a), s(b)));
    verifier(cour.sensUnique[j] === s(depuis) && vers !== '', `sens unique ${a}-${b}`);
  }

  const regionDe = new Map<string, string>();
  const cleIlots = (ilots: readonly string[]): string => [...ilots].sort().join(',');
  for (const r of cour.regions) {
    const image = cleIlots(r.ilots.map(s));
    const cible = cour.regions.find((q) => cleIlots(q.ilots) === image);
    verifier(cible !== undefined && cible.bonsPoints === r.bonsPoints, `région ${r.id}`);
    regionDe.set(r.id, (cible as { id: string }).id);
  }
  const indexRegion = (id: string): number => cour.regions.findIndex((r) => r.id === id);
  const n = cour.ronde.length;
  const rondeDe: number[] = cour.ronde.map((ri) => {
    const r = cour.regions[ri];
    const image = r ? indexRegion(regionDe.get(r.id) ?? '') : -1;
    return cour.ronde.indexOf(image);
  });
  // La ronde retournée doit tourner dans le même sens (un simple décalage).
  const decalage = n > 0 ? ((rondeDe[0] ?? 0) + n) % n : 0;
  rondeDe.forEach((j, i) => verifier(j === (i + decalage) % n, 'ronde'));
  const k = cour.courant.length;
  if (k > 0) {
    const d = cour.courant.indexOf(s(cour.courant[0] ?? ''));
    cour.courant.forEach((id, i) => verifier(cour.courant[(i + d) % k] === s(id), 'courant'));
  }

  const miroir: Miroir = {
    noeud: s,
    region: (id) => regionDe.get(id) ?? id,
    ronde: (i) => (n > 0 ? (i + decalage) % n : i),
    anneau: (liste) => {
      const image = liste.map(s);
      const debut = image.indexOf(cour.courant[0] ?? '');
      return debut <= 0 ? image : [...image.slice(debut), ...image.slice(0, debut)];
    },
  };
  caches.set(cour.id, miroir);
  return miroir;
}

/** « rouge-grand-1 » ↔ « bleu-grand-1 » (et les élèves cachés « ?rouge-… »). */
function idEleve(id: string): string {
  return id.replace(/^(\??)(rouge|bleu)/, (_, q: string, b: Bande) => `${q}${autre(b)}`);
}

function eleve(e: Eleve): Eleve {
  return { id: idEleve(e.id), bande: autre(e.bande), role: e.role };
}

function joueur(j: Joueur): Joueur {
  return {
    couloir: j.couloir.map(eleve),
    rang: j.rang.map(eleve),
    cpe: j.cpe.map(eleve),
    absents: j.absents.map(eleve),
    infirmerie: j.infirmerie.map(idEleve),
    bonsPoints: j.bonsPoints,
  };
}

function effet(e: Effet, m: Miroir): Effet {
  return { ...e, ilot: m.noeud(e.ilot), eleveId: idEleve(e.eleveId) };
}

export function retournerOption(o: Option, m: Miroir): Option {
  switch (o.type) {
    case 'poser':
      return { type: 'poser', eleveId: idEleve(o.eleveId), cible: m.noeud(o.cible) };
    case 'cpe':
      return { type: 'cpe', ilot: m.noeud(o.ilot) };
    case 'rappeler':
      return { type: 'rappeler', ilot: m.noeud(o.ilot) };
    case 'repecher':
      return { type: 'repecher', eleveId: idEleve(o.eleveId) };
    case 'glisser':
      return { type: 'glisser', depart: m.noeud(o.depart), arrivee: m.noeud(o.arrivee) };
    case 'surveillante':
      return { type: 'surveillante', position: m.ronde(o.position) };
    default:
      return o;
  }
}

export function retournerAction(a: Action, m: Miroir): Action {
  if (a.type === 'envoyer') {
    return { type: 'envoyer', eleveId: idEleve(a.eleveId), cible: m.noeud(a.cible) };
  }
  if (a.type === 'choisir') return { type: 'choisir', option: retournerOption(a.option, m) };
  return a;
}

function evenement(ev: Evenement, m: Miroir): Evenement {
  switch (ev.type) {
    case 'appel':
    case 'pioche':
    case 'passe':
      return { ...ev, bande: autre(ev.bande) };
    case 'pose':
      return {
        ...ev,
        bande: autre(ev.bande),
        eleveId: idEleve(ev.eleveId),
        cible: m.noeud(ev.cible),
      };
    case 'cpe':
    case 'rappel':
      return {
        ...ev,
        bande: autre(ev.bande),
        eleveId: idEleve(ev.eleveId),
        ilot: m.noeud(ev.ilot),
      };
    case 'infirmerie':
    case 'repechage':
      return { ...ev, bande: autre(ev.bande), eleveId: idEleve(ev.eleveId) };
    case 'surveillante':
      return { ...ev, position: m.ronde(ev.position) };
    case 'courant':
      return { ...ev, anneau: m.anneau(ev.anneau) };
    case 'glissade':
      return {
        ...ev,
        eleveId: idEleve(ev.eleveId),
        depart: m.noeud(ev.depart),
        arrivee: m.noeud(ev.arrivee),
      };
    case 'region':
      return { ...ev, bande: autre(ev.bande), region: m.region(ev.region) };
    case 'fin':
      return { ...ev, gagnant: autre(ev.gagnant) };
  }
}

/** La partie vue de l'autre côté (sa propre réciproque). */
export function retournerEtat(e: EtatStocke, m: Miroir): EtatStocke {
  const piles: Record<string, Eleve[]> = {};
  for (const [id, pile] of Object.entries(e.piles)) piles[m.noeud(id)] = pile.map(eleve);
  const regionsPrises: Record<string, Bande> = {};
  for (const [id, b] of Object.entries(e.regionsPrises)) regionsPrises[m.region(id)] = autre(b);
  return {
    ...e,
    joueurs: { rouge: joueur(e.joueurs.bleu), bleu: joueur(e.joueurs.rouge) },
    piles,
    surveillante: m.ronde(e.surveillante),
    premier: autre(e.premier),
    courant: autre(e.courant),
    regionsPrises,
    effets: e.effets.map((x) => effet(x, m)),
    attente: e.attente
      ? {
          effet: effet(e.attente.effet, m),
          options: e.attente.options.map((o) => retournerOption(o, m)),
        }
      : null,
    fin: e.fin ? { ...e.fin, gagnant: autre(e.fin.gagnant) } : null,
    journal: e.journal.map((ev) => evenement(ev, m)),
  };
}

export function retournerIssue(i: Issue | null): Issue | null {
  return i ? { ...i, gagnant: autre(i.gagnant) } : null;
}

export const retournerBande = autre;
