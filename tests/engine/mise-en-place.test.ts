import { describe, expect, it } from 'vitest';
import { creerPartie, ROLES } from '../../src/engine/index';
import { cour1 } from './aide';

describe('Mise en place', () => {
  const cour = cour1();

  it('donne 24 élèves à chaque bande : 8 rôles en 3 exemplaires', () => {
    const e = creerPartie(cour, { graine: 1 });
    for (const b of ['rouge', 'bleu'] as const) {
      const j = e.joueurs[b];
      const tous = [...j.couloir, ...j.rang, ...j.absents];
      expect(tous).toHaveLength(24);
      for (const r of ROLES) expect(tous.filter((el) => el.role === r.id)).toHaveLength(3);
      expect(tous.every((el) => el.bande === b)).toBe(true);
    }
  });

  it('retire 4 absents à l’appel, hors jeu', () => {
    const e = creerPartie(cour, { graine: 2 });
    expect(e.joueurs.rouge.absents).toHaveLength(4);
    expect(e.joueurs.bleu.absents).toHaveLength(4);
  });

  it('le premier joueur a 3 élèves dans son rang, le second 4', () => {
    for (let g = 0; g < 20; g++) {
      const e = creerPartie(cour, { graine: g });
      const second = e.premier === 'rouge' ? 'bleu' : 'rouge';
      expect(e.joueurs[e.premier].rang).toHaveLength(3);
      expect(e.joueurs[e.premier].couloir).toHaveLength(17);
      expect(e.joueurs[second].rang).toHaveLength(4);
      expect(e.joueurs[second].couloir).toHaveLength(16);
      expect(e.courant).toBe(e.premier);
    }
  });

  it('tire le premier joueur au hasard', () => {
    const premiers = new Set(
      Array.from({ length: 30 }, (_, g) => creerPartie(cour, { graine: g }).premier),
    );
    expect(premiers).toEqual(new Set(['rouge', 'bleu']));
  });

  it('permet de forcer le premier joueur', () => {
    expect(creerPartie(cour, { graine: 1, premier: 'bleu' }).premier).toBe('bleu');
    expect(creerPartie(cour, { graine: 1, premier: 'rouge' }).premier).toBe('rouge');
  });

  it('est déterministe pour une même graine', () => {
    const a = creerPartie(cour, { graine: 99 });
    const b = creerPartie(cour, { graine: 99 });
    expect(a.joueurs).toEqual(b.joueurs);
    expect(a.premier).toBe(b.premier);
  });

  it('mélange différemment selon la graine', () => {
    const a = creerPartie(cour, { graine: 1 });
    const b = creerPartie(cour, { graine: 2 });
    expect(a.joueurs.rouge.couloir.map((el) => el.id)).not.toEqual(
      b.joueurs.rouge.couloir.map((el) => el.id),
    );
  });

  it('part d’une cour vide, sans bons points, surveillante au départ de sa ronde', () => {
    const e = creerPartie(cour, { graine: 3 });
    for (const id of cour.ilots) expect(e.piles[id]).toEqual([]);
    expect(e.joueurs.rouge.bonsPoints).toBe(0);
    expect(e.joueurs.bleu.bonsPoints).toBe(0);
    expect(e.regionsPrises).toEqual({});
    expect(e.surveillante).toBe(cour.departRonde);
    expect(e.equipements).toBe(true);
    expect(e.fin).toBeNull();
  });

  it('permet de désactiver les équipements spéciaux', () => {
    expect(creerPartie(cour, { graine: 3, equipements: false }).equipements).toBe(false);
  });
});
