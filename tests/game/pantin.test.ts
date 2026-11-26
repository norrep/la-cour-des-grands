import { describe, expect, it } from 'vitest';
import { avancerMembre, membreAuRepos, SuiviDoigt } from '../../src/game/pantin';

const bras = { longueur: 40, amorti: 4 };

describe('Pantin (faux ragdoll)', () => {
  it('reste pendu à la verticale quand le doigt ne bouge pas', () => {
    const m = avancerMembre(membreAuRepos(), 0, 0, 1, bras);
    expect(Math.abs(m.angle)).toBeLessThan(1e-9);
  });

  it('traîne derrière le doigt qui part vers la droite', () => {
    const m = avancerMembre(membreAuRepos(), 3000, 0, 0.1, bras);
    expect(m.angle).toBeLessThan(-0.1);
  });

  it('se balance puis retombe à la verticale', () => {
    let m = { angle: 1, vitesse: 0 };
    let changeDeCote = false;
    for (let i = 0; i < 300; i++) {
      m = avancerMembre(m, 0, 0, 1 / 60, bras);
      if (m.angle < 0) changeDeCote = true;
    }
    expect(changeDeCote).toBe(true);
    expect(Math.abs(m.angle)).toBeLessThan(0.02);
  });

  it('ne fait jamais le tour complet, même secoué violemment', () => {
    let m = membreAuRepos();
    for (let i = 0; i < 120; i++) m = avancerMembre(m, i % 2 ? 9000 : -9000, -9000, 1 / 60, bras);
    expect(Math.abs(m.angle)).toBeLessThanOrEqual(2.4);
  });

  it('estime une accélération vers la droite quand le doigt accélère', () => {
    const s = new SuiviDoigt(1);
    s.suivre(0, 0, 1 / 60);
    s.suivre(1, 0, 1 / 60);
    s.suivre(4, 0, 1 / 60);
    expect(s.ax).toBeGreaterThan(0);
    expect(s.ay).toBe(0);
  });
});
