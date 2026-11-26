import type { Bande, CourData, Cour, EquipementId, Noeud, Voisin } from './types';

const EQUIPEMENTS: readonly EquipementId[] = [
  'banc',
  'cabanePerchee',
  'porteVieScolaire',
  'buts',
  'toboggan',
  'marelle',
  'bancMaitresses',
];

export class ErreurCour extends Error {}

function cleAllee(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Vérifie les données d'une cour et construit son graphe. Lève `ErreurCour` si elles sont incohérentes. */
export function chargerCour(data: CourData): Cour {
  const erreur = (message: string): never => {
    throw new ErreurCour(`Cour « ${data.id} » : ${message}`);
  };

  const noeuds: Record<string, Noeud> = {};
  const ajouter = (n: Noeud): void => {
    if (noeuds[n.id]) erreur(`identifiant en double « ${n.id} »`);
    noeuds[n.id] = n;
  };

  const cabanes: Record<Bande, string[]> = { rouge: [], bleu: [] };
  for (const c of data.cabanes) {
    if (c.bande !== 'rouge' && c.bande !== 'bleu') erreur(`bande inconnue pour « ${c.id} »`);
    ajouter({
      id: c.id,
      type: 'cabane',
      nom: c.id,
      x: c.x,
      y: c.y,
      bande: c.bande,
      ...(c.valeursAutorisees ? { valeursAutorisees: c.valeursAutorisees } : {}),
    });
    cabanes[c.bande].push(c.id);
  }
  if (cabanes.rouge.length === 0 || cabanes.bleu.length === 0) {
    erreur('chaque bande doit avoir au moins une cabane');
  }

  const ilots: string[] = [];
  for (const i of data.ilots) {
    if (i.equipement !== undefined && !EQUIPEMENTS.includes(i.equipement)) {
      erreur(`équipement inconnu « ${String(i.equipement)} » sur « ${i.id} »`);
    }
    ajouter({
      id: i.id,
      type: 'ilot',
      nom: i.nom,
      x: i.x,
      y: i.y,
      ...(i.equipement ? { equipement: i.equipement } : {}),
      ...(i.decor ? { decor: i.decor } : {}),
      ...(i.valeursAutorisees ? { valeursAutorisees: i.valeursAutorisees } : {}),
    });
    ilots.push(i.id);
  }

  const voisins: Record<string, Voisin[]> = {};
  for (const id of Object.keys(noeuds)) voisins[id] = [];
  const indexAllee = new Map<string, number>();
  data.allees.forEach(([a, b], index) => {
    if (!noeuds[a] || !noeuds[b]) erreur(`allée ${a}-${b} : extrémité inconnue`);
    if (a === b) erreur(`allée ${a}-${b} : boucle sur elle-même`);
    const cle = cleAllee(a, b);
    if (indexAllee.has(cle)) erreur(`allée ${a}-${b} en double`);
    indexAllee.set(cle, index);
    voisins[a]?.push({ noeud: b, allee: index });
    voisins[b]?.push({ noeud: a, allee: index });
  });

  for (const r of data.regions) {
    if (r.ilots.length === 0) erreur(`région « ${r.id} » vide`);
    for (const i of r.ilots) {
      if (noeuds[i]?.type !== 'ilot') erreur(`région « ${r.id} » : « ${i} » n'est pas un îlot`);
    }
    if (r.bonsPoints <= 0) erreur(`région « ${r.id} » : bons points invalides`);
  }

  const ronde = data.ronde.map((id) => {
    const index = data.regions.findIndex((r) => r.id === id);
    if (index < 0) erreur(`ronde : la région « ${id} » n'existe pas`);
    return index;
  });
  if (
    !Number.isInteger(data.departRonde) ||
    data.departRonde < 0 ||
    (ronde.length > 0 && data.departRonde >= ronde.length)
  ) {
    erreur('départ de la ronde hors limites');
  }
  if (!(data.seuilBonsPoints > 0)) erreur('seuil de bons points invalide');

  return {
    id: data.id,
    nom: data.nom,
    noeuds,
    ilots,
    cabanes,
    allees: data.allees.map(([a, b]) => [a, b]),
    voisins,
    regions: data.regions.map((r) => ({ ...r, ilots: r.ilots.slice() })),
    seuilBonsPoints: data.seuilBonsPoints,
    ronde,
    departRonde: data.departRonde,
  };
}

/** Distances (en nombre d'allées) depuis un nœud, par toutes les allées. */
export function distancesDepuis(cour: Cour, depart: string): Record<string, number> {
  const dist: Record<string, number> = { [depart]: 0 };
  const file = [depart];
  while (file.length > 0) {
    const n = file.shift() as string;
    const d = dist[n] as number;
    for (const v of cour.voisins[n] ?? []) {
      if (dist[v.noeud] === undefined) {
        dist[v.noeud] = d + 1;
        file.push(v.noeud);
      }
    }
  }
  return dist;
}

/** Îlots voisins d'un nœud (une allée d'écart), sans les cabanes. */
export function ilotsVoisins(cour: Cour, noeud: string): string[] {
  return (cour.voisins[noeud] ?? [])
    .map((v) => v.noeud)
    .filter((id) => cour.noeuds[id]?.type === 'ilot');
}
