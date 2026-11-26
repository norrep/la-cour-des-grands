import { describe, expect, it } from 'vitest';
import { COURS } from '../../src/data/boards/index';
import { chargerCour, distancesDepuis, ErreurCour, type CourData } from '../../src/engine/index';
import { cour1 } from './aide';

const base = (): CourData => structuredClone(COURS['cour-premier-jour'] as CourData);

describe('Cour n°1 : la cour du premier jour', () => {
  const cour = cour1();

  it('a 7 îlots, 2 cabanes et 14 allées', () => {
    expect(cour.ilots).toEqual(['A1', 'A2', 'M1', 'M2', 'M3', 'B1', 'B2']);
    expect(cour.cabanes).toEqual({ bleu: ['CabBleue'], rouge: ['CabRouge'] });
    expect(cour.allees).toHaveLength(14);
  });

  it('a les coordonnées du cahier des charges', () => {
    expect(cour.noeuds.CabBleue).toMatchObject({ x: 0.5, y: 0.06 });
    expect(cour.noeuds.CabRouge).toMatchObject({ x: 0.5, y: 0.82 });
    expect(cour.noeuds.M1).toMatchObject({ x: 0.1, y: 0.44 });
    expect(cour.noeuds.B2).toMatchObject({ x: 0.72, y: 0.66 });
  });

  it('a deux bancs, un de chaque côté (M1 et M3)', () => {
    const speciaux = cour.ilots.filter((id) => cour.noeuds[id]?.equipement);
    expect(speciaux).toEqual(['M1', 'M3']);
    expect(cour.noeuds.M1?.equipement).toBe('banc');
  });

  it('a 4 régions et un seuil de 3 bons points', () => {
    expect(cour.regions.map((r) => [r.id, r.bonsPoints])).toEqual([
      ['haut', 2],
      ['bas', 2],
      ['gauche', 1],
      ['droite', 1],
    ]);
    expect(cour.seuilBonsPoints).toBe(3);
  });

  it('a une ronde des 4 goûters qui part de la gauche', () => {
    expect(cour.ronde.map((i) => cour.regions[i]?.id)).toEqual(['gauche', 'haut', 'droite', 'bas']);
    expect(cour.departRonde).toBe(0);
  });

  it('calcule les distances en allées', () => {
    const d = distancesDepuis(cour, 'CabRouge');
    expect(d.B1).toBe(1);
    expect(d.M2).toBe(2);
    expect(d.CabBleue).toBe(4);
  });
});

describe('Validation des données de cour', () => {
  it('refuse une allée vers un nœud inconnu', () => {
    const d = base();
    d.allees.push(['A1', 'ZZ']);
    expect(() => chargerCour(d)).toThrow(ErreurCour);
  });
  it('refuse une allée en double', () => {
    const d = base();
    d.allees.push(['A2', 'A1']);
    expect(() => chargerCour(d)).toThrow(/double/);
  });
  it('refuse une ronde qui passe par une région inexistante', () => {
    const d = base();
    d.ronde.push('milieu');
    expect(() => chargerCour(d)).toThrow(/ronde/);
  });
  it('refuse une région qui contient une cabane', () => {
    const d = base();
    d.regions[0]?.ilots.push('CabBleue');
    expect(() => chargerCour(d)).toThrow(/région/);
  });
  it('refuse un départ de ronde hors limites', () => {
    const d = base();
    d.departRonde = 4;
    expect(() => chargerCour(d)).toThrow(/départ/);
  });
  it('refuse une bande sans cabane', () => {
    const d = base();
    d.cabanes = d.cabanes.filter((c) => c.bande !== 'rouge');
    expect(() => chargerCour(d)).toThrow(/cabane/);
  });
  it('refuse un équipement inconnu', () => {
    const d = base();
    (d.ilots[0] as { equipement?: string }).equipement = 'trampoline';
    expect(() => chargerCour(d)).toThrow(/équipement/);
  });
  it('refuse un identifiant en double', () => {
    const d = base();
    d.ilots.push({ id: 'A1', nom: 'bis', x: 0, y: 0 });
    expect(() => chargerCour(d)).toThrow(/double/);
  });
});
