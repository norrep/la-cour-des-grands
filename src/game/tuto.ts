/**
 * Le tutoriel jouable (DJ.1) : trois mini-leçons sur la cour du premier jour, chacune jouée pour
 * de vrai contre l'ordi et gagnée en moins d'une minute.
 *
 * 1. « Fonce à la cabane » : poser, faire son chemin, appeler des copains, entrer dans la cabane.
 * 2. « Plaque ! » : un plus fort saute sur un plus faible et prend sa place.
 * 3. « Le goûter » : entourer un goûter, et le surveillant qui le garde puis s'en va.
 *
 * Ce module est pur (sans Phaser) : il fabrique l'état de départ de chaque leçon, dit ce que
 * l'ordi joue, quelles poses sont permises et ce que le guide montre. L'écran (`PartieScene`)
 * le lit.
 */
import {
  actionsLegales,
  ciblesPossibles,
  creerPartie,
  sommet,
  ROLES,
  EXEMPLAIRES_PAR_ROLE,
  type Action,
  type Bande,
  type Cour,
  type Eleve,
  type EtatPartie,
  type RoleId,
} from '../engine/index';
import { TEXTES_TUTO } from '../data/textesTuto';

export const NB_LECONS = 3;

/** Ce que le guide montre du doigt. */
export type Geste =
  /** Glisser un élève du rang (par son id) vers un îlot ou une cabane. */
  | { type: 'glisser'; eleveId: string; vers: string }
  /** Toucher le rond jaune « +2 copains ». */
  | { type: 'appeler' }
  /** Rien à faire : on regarde (tour de l'ordi). */
  | { type: 'regarder' };

export interface EtapeGuide {
  texte: string;
  geste: Geste;
  /** Îlots à entourer d'un rond qui pulse (le goûter à compléter…). */
  reperes: string[];
}

/** Une leçon : sa cour de départ et ses règles de jeu guidé. */
interface Lecon {
  /** Pièces de départ de chaque bande. */
  depart: {
    rang: Record<Bande, RoleId[]>;
    couloir: Record<Bande, RoleId[]>;
    /** Piles posées sur la cour, du bas vers le haut : « rouge:grand ». */
    piles: Record<string, string[]>;
    /** Position du surveillant dans sa ronde. */
    surveillante: number;
    bonsPoints?: Partial<Record<Bande, number>>;
  };
  /** Où le joueur a le droit de poser maintenant (`null` : partout où la règle le permet). */
  ciblesPermises(e: EtatPartie): string[] | null;
  /** Ce que dit et montre le guide. */
  guide(e: EtatPartie): EtapeGuide;
}

/** Fabrique l'état de départ d'une leçon. Le joueur a la bande rouge et commence. */
export function etatLecon(cour: Cour, lecon: number): EtatPartie {
  const def = LECONS[lecon];
  if (!def) throw new Error(`Leçon inconnue : ${lecon}`);
  const e = creerPartie(cour, {
    graine: 2026 + lecon,
    premier: 'rouge',
    // Les bancs planques et l'îlot spécial attendront la première vraie partie.
    equipements: false,
    pouvoirsAuto: true,
  });
  // Chaque bande garde ses 24 élèves : ceux que la leçon n'utilise pas restent absents.
  const reserve: Record<Bande, Eleve[]> = { rouge: [], bleu: [] };
  for (const b of ['rouge', 'bleu'] as const) {
    for (const r of ROLES)
      for (let n = 1; n <= EXEMPLAIRES_PAR_ROLE; n++)
        reserve[b].push({ id: `${b}-${r.id}-${n}`, bande: b, role: r.id });
  }
  const prendre = (b: Bande, role: RoleId): Eleve => {
    const i = reserve[b].findIndex((el) => el.role === role);
    if (i < 0) throw new Error(`Plus de ${role} ${b} pour la leçon ${lecon}`);
    return reserve[b].splice(i, 1)[0] as Eleve;
  };
  for (const id of Object.keys(e.piles)) e.piles[id] = [];
  for (const [ilot, pile] of Object.entries(def.depart.piles)) {
    e.piles[ilot] = pile.map((p) => {
      const [b, role] = p.split(':') as [Bande, RoleId];
      return prendre(b, role);
    });
  }
  for (const b of ['rouge', 'bleu'] as const) {
    const j = e.joueurs[b];
    j.rang = def.depart.rang[b].map((r) => prendre(b, r));
    j.couloir = def.depart.couloir[b].map((r) => prendre(b, r));
    j.cpe = [];
    j.infirmerie = [];
    j.absents = reserve[b];
    j.bonsPoints = def.depart.bonsPoints?.[b] ?? 0;
  }
  e.surveillante = def.depart.surveillante;
  return e;
}

/** Les poses permises en ce moment pour un élève du rang (le tuto peut en interdire). */
export function ciblesTuto(e: EtatPartie, lecon: number, eleveId: string): string[] {
  const toutes = ciblesPossibles(e, eleveId);
  const permises = LECONS[lecon]?.ciblesPermises(e) ?? null;
  return permises ? toutes.filter((c) => permises.includes(c)) : toutes;
}

/** Ce que joue l'ordi pendant une leçon : il appelle des copains, sans jamais gêner. */
export function coupOrdiTuto(e: EtatPartie): Action {
  const legales = actionsLegales(e);
  return (
    legales.find((a) => a.type === 'appeler') ??
    legales.find((a) => a.type === 'passer') ??
    (legales[0] as Action)
  );
}

export function guideTuto(e: EtatPartie, lecon: number): EtapeGuide {
  const def = LECONS[lecon];
  if (!def) return { texte: '', geste: { type: 'regarder' }, reperes: [] };
  return def.guide(e);
}

// ---------------------------------------------------------------------------
// Outils pour écrire les leçons
// ---------------------------------------------------------------------------

const rang = (e: EtatPartie): Eleve[] => e.joueurs.rouge.rang;

/** Le premier élève du rang qui peut aller sur `cible` (en respectant les interdits). */
function eleveVers(e: EtatPartie, lecon: number, cible: string): Eleve | undefined {
  return rang(e).find((el) => ciblesTuto(e, lecon, el.id).includes(cible));
}

/** Parmi les poses possibles, celle qui rapproche le plus de la cabane bleue (en haut). */
function meilleurePose(e: EtatPartie, lecon: number): { eleveId: string; vers: string } | null {
  let meilleure: { eleveId: string; vers: string; y: number } | null = null;
  for (const el of rang(e)) {
    for (const c of ciblesTuto(e, lecon, el.id)) {
      const y = e.cour.noeuds[c]?.y ?? 1;
      // À hauteur égale, on préfère le milieu (le bac à sable ouvre les deux côtés).
      const score = y + Math.abs((e.cour.noeuds[c]?.x ?? 0.5) - 0.5) * 0.01;
      if (!meilleure || score < meilleure.y) meilleure = { eleveId: el.id, vers: c, y: score };
    }
  }
  return meilleure ? { eleveId: meilleure.eleveId, vers: meilleure.vers } : null;
}

const regarder = (texte: string, reperes: string[] = []): EtapeGuide => ({
  texte,
  geste: { type: 'regarder' },
  reperes,
});

const CABANE_BLEUE = 'CabBleue';
const tientIlots = (e: EtatPartie): number =>
  e.cour.ilots.filter((i) => sommet(e, i)?.bande === 'rouge').length;

// ---------------------------------------------------------------------------
// Les trois leçons
// ---------------------------------------------------------------------------

const T = TEXTES_TUTO;

const LECONS: readonly Lecon[] = [
  // 1. Fonce à la cabane : trois élèves, puis le rang est vide, on appelle, et on entre.
  {
    depart: {
      // L'ordi part sans personne en main : il a de quoi appeler à chaque tour sans jamais poser.
      rang: { rouge: ['grand', 'rapporteuse', 'grand'], bleu: [] },
      couloir: {
        rouge: ['rapporteuse', 'grand', 'fouine', 'contagieux'],
        bleu: [
          'petit',
          'fouine',
          'grand',
          'delegue',
          'contagieux',
          'rapporteuse',
          'populaire',
          'chouchou',
        ],
      },
      piles: {},
      surveillante: 0,
    },
    ciblesPermises: () => null,
    guide(e) {
      if (e.courant !== 'rouge') return regarder(T.lecons[0].ordi);
      const cabane = eleveVers(e, 0, CABANE_BLEUE);
      if (cabane)
        return {
          texte: T.lecons[0].cabane,
          geste: { type: 'glisser', eleveId: cabane.id, vers: CABANE_BLEUE },
          reperes: [CABANE_BLEUE],
        };
      if (rang(e).length === 0)
        return { texte: T.lecons[0].appeler, geste: { type: 'appeler' }, reperes: [] };
      const pose = meilleurePose(e, 0);
      const debut = tientIlots(e) === 0;
      const texte = debut ? T.lecons[0].premiere : T.lecons[0].chemin;
      // Au tout premier coup, on entoure les îlots où l'on peut poser.
      const reperes = debut && pose ? ciblesTuto(e, 0, pose.eleveId) : [];
      return pose
        ? { texte, geste: { type: 'glisser', ...pose }, reperes }
        : { texte: T.lecons[0].appeler, geste: { type: 'appeler' }, reperes: [] };
    },
  },
  // 2. Plaque ! La Fouine (4) d'en face tient le toboggan ; le Grand (7) lui saute dessus.
  {
    depart: {
      rang: { rouge: ['grand', 'populaire'], bleu: [] },
      couloir: {
        rouge: ['rapporteuse', 'chouchou', 'fouine', 'contagieux'],
        bleu: ['petit', 'grand', 'delegue', 'contagieux', 'rapporteuse', 'populaire'],
      },
      piles: {
        B1: ['rouge:delegue'],
        M1: ['rouge:contagieux'],
        A1: ['bleu:fouine'],
        A2: ['bleu:grand'],
        M3: ['bleu:chouchou'],
      },
      surveillante: 3,
    },
    ciblesPermises: (e) => (sommet(e, 'A1')?.bande === 'rouge' ? [CABANE_BLEUE] : ['A1']),
    guide(e) {
      const plaque = sommet(e, 'A1')?.bande === 'rouge';
      if (e.courant !== 'rouge') return regarder(T.lecons[1].plaque, ['A1']);
      if (!plaque) {
        const fort = eleveVers(e, 1, 'A1');
        return fort
          ? {
              texte: T.lecons[1].plaquer,
              geste: { type: 'glisser', eleveId: fort.id, vers: 'A1' },
              reperes: ['A1'],
            }
          : regarder(T.lecons[1].plaquer, ['A1']);
      }
      const petit = eleveVers(e, 1, CABANE_BLEUE);
      return petit
        ? {
            texte: T.lecons[1].cabane,
            geste: { type: 'glisser', eleveId: petit.id, vers: CABANE_BLEUE },
            reperes: [CABANE_BLEUE],
          }
        : regarder(T.lecons[1].cabane);
    },
  },
  // 3. Le goûter : il manque un îlot autour de la sucette, mais le surveillant la garde…
  {
    depart: {
      rang: { rouge: ['grand', 'rapporteuse'], bleu: [] },
      couloir: {
        rouge: ['fouine', 'chouchou', 'populaire', 'petit'],
        bleu: ['petit', 'delegue', 'contagieux', 'rapporteuse', 'populaire', 'chouchou'],
      },
      piles: {
        B2: ['rouge:delegue'],
        M2: ['rouge:contagieux'],
        M3: ['rouge:grand'],
        M1: ['bleu:grand'],
        B1: ['bleu:fouine'],
      },
      // Le goûter de droite (la sucette) : 3e de la ronde gauche, haut, droite, bas.
      surveillante: 2,
      bonsPoints: { rouge: 2 },
    },
    ciblesPermises: () => ['A2'],
    guide(e) {
      const autour = ['A2', 'M3', 'B2', 'M2'];
      if (e.courant !== 'rouge') return regarder(T.lecons[2].garde(), autour);
      const el = eleveVers(e, 2, 'A2');
      return el
        ? {
            texte: T.lecons[2].entourer,
            geste: { type: 'glisser', eleveId: el.id, vers: 'A2' },
            reperes: autour,
          }
        : regarder(T.lecons[2].garde(), autour);
    },
  },
];
