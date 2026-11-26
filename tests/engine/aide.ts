/** Outils pour construire des situations de jeu précises dans les tests. */
import { COURS } from '../../src/data/boards/index';
import {
  chargerCour,
  clonerEtat,
  creerPartie,
  type Bande,
  type Cour,
  type CourData,
  type Eleve,
  type EquipementId,
  type EtatPartie,
  type RoleId,
  type ValeurCase,
} from '../../src/engine/index';

export const cour1 = (): Cour => chargerCour(COURS['cour-premier-jour'] as CourData);

/**
 * Cour de test :
 *
 *            CabB
 *             |
 *        X -- S ----.
 *        |    |      \
 *        Y    Q ---- D
 *        |    |  \
 *        Z    |   L
 *             |  /
 *             P
 *             |
 *            CabR
 *
 * Allées : CabR-P, P-Q, P-L, L-Q, Q-D, Q-S, D-S, S-X, S-CabB, X-Y, Y-Z.
 * Ronde : Y-Z → X-Y (départ Y-Z) : par défaut, la surveillante est loin de l'action.
 * Distances depuis Q : P, L, D, S à 1 ; CabR, CabB, X à 2 ; Y à 3.
 */
export function courTest(
  options: {
    equipementQ?: EquipementId;
    valeursQ?: ValeurCase[];
    valeursCabB?: ValeurCase[];
    regions?: CourData['regions'];
    seuil?: number;
    ronde?: [string, string][];
    depart?: number;
    deuxiemeCabaneBleue?: boolean;
  } = {},
): Cour {
  const data: CourData = {
    id: 'test',
    nom: 'Cour de test',
    cabanes: [
      { id: 'CabR', bande: 'rouge', x: 0.5, y: 1 },
      {
        id: 'CabB',
        bande: 'bleu',
        x: 0.5,
        y: 0,
        ...(options.valeursCabB ? { valeursAutorisees: options.valeursCabB } : {}),
      },
      ...(options.deuxiemeCabaneBleue
        ? [{ id: 'CabB2', bande: 'bleu' as const, x: 1, y: 0.5 }]
        : []),
    ],
    ilots: [
      { id: 'P', nom: 'P', x: 0.5, y: 0.8 },
      {
        id: 'Q',
        nom: 'Q',
        x: 0.5,
        y: 0.5,
        ...(options.equipementQ ? { equipement: options.equipementQ } : {}),
        ...(options.valeursQ ? { valeursAutorisees: options.valeursQ } : {}),
      },
      { id: 'S', nom: 'S', x: 0.5, y: 0.2 },
      { id: 'L', nom: 'L', x: 0.7, y: 0.65 },
      { id: 'D', nom: 'D', x: 0.8, y: 0.35 },
      { id: 'X', nom: 'X', x: 0.2, y: 0.2 },
      { id: 'Y', nom: 'Y', x: 0.2, y: 0.4 },
      { id: 'Z', nom: 'Z', x: 0.2, y: 0.6 },
    ],
    allees: [
      ['CabR', 'P'],
      ['P', 'Q'],
      ['P', 'L'],
      ['L', 'Q'],
      ['Q', 'D'],
      ['Q', 'S'],
      ['D', 'S'],
      ['S', 'X'],
      ['S', 'CabB'],
      ['X', 'Y'],
      ['Y', 'Z'],
      ...(options.deuxiemeCabaneBleue ? ([['D', 'CabB2']] as [string, string][]) : []),
    ],
    regions: options.regions ?? [],
    seuilBonsPoints: options.seuil ?? 5,
    ronde: options.ronde ?? [
      ['Y', 'Z'],
      ['X', 'Y'],
    ],
    departRonde: options.depart ?? 0,
  };
  return chargerCour(data);
}

let compteur = 0;
export function eleve(bande: Bande, role: RoleId): Eleve {
  compteur += 1;
  return { id: `${bande}-${role}-t${compteur}`, bande, role };
}

type Piles = Record<string, [Bande, RoleId][]>;

export interface Situation {
  cour?: Cour;
  equipements?: boolean;
  premier?: Bande;
  courant?: Bande;
  rang?: Partial<Record<Bande, RoleId[]>>;
  couloir?: Partial<Record<Bande, RoleId[]>>;
  cpe?: Partial<Record<Bande, RoleId[]>>;
  piles?: Piles;
  surveillante?: number;
  bonsPoints?: Partial<Record<Bande, number>>;
  regionsPrises?: Record<string, Bande>;
}

/**
 * Construit un état sur mesure. Par défaut : cour de test, rouge commence et joue,
 * rangs vides, couloirs de 10 Grands de CM2 chacun, cour vide.
 */
export function situation(s: Situation = {}): EtatPartie {
  const cour = s.cour ?? courTest();
  const base = creerPartie(cour, {
    graine: 42,
    equipements: s.equipements ?? true,
    premier: s.premier ?? 'rouge',
  });
  const e = clonerEtat(base);
  e.courant = s.courant ?? e.premier;
  for (const b of ['rouge', 'bleu'] as const) {
    const j = e.joueurs[b];
    j.rang = (s.rang?.[b] ?? []).map((r) => eleve(b, r));
    j.couloir = (s.couloir?.[b] ?? Array<RoleId>(10).fill('grand')).map((r) => eleve(b, r));
    j.cpe = (s.cpe?.[b] ?? []).map((r) => eleve(b, r));
    j.absents = [];
    j.bonsPoints = s.bonsPoints?.[b] ?? 0;
  }
  for (const id of cour.ilots) e.piles[id] = [];
  for (const [ilot, pile] of Object.entries(s.piles ?? {})) {
    e.piles[ilot] = pile.map(([b, r]) => eleve(b, r));
  }
  if (s.surveillante !== undefined) e.surveillante = s.surveillante;
  e.regionsPrises = { ...(s.regionsPrises ?? {}) };
  return e;
}

/** Id du premier élève de ce rôle dans le rang d'une bande. */
export function idRang(e: EtatPartie, bande: Bande, role: RoleId, rang = 0): string {
  const trouves = e.joueurs[bande].rang.filter((el) => el.role === role);
  const el = trouves[rang];
  if (!el) throw new Error(`Pas de ${role} n°${rang} dans le rang ${bande}`);
  return el.id;
}

/** Rôles de la pile d'un îlot, du bas vers le haut, sous forme « bande:rôle ». */
export function pile(e: EtatPartie, ilot: string): string[] {
  return (e.piles[ilot] ?? []).map((el) => `${el.bande}:${el.role}`);
}
