import { describe, expect, it } from 'vitest';
import { actionsLegales } from '../../src/engine/index';
import { Controleur } from '../../src/game/controleur';
import { cour1 } from '../engine/aide';

const nouveau = () => new Controleur(cour1(), { graine: 3, premier: 'rouge' });

describe('Contrôleur de partie à deux', () => {
  it('commence par l’écran « Passe le téléphone » pour cacher les rangs', () => {
    const c = nouveau();
    expect(c.phase).toBe('passe');
    expect(c.appeler()).toBe(false);
    c.reprendre();
    expect(c.phase).toBe('jeu');
  });

  it('un coup joué est définitif : on passe aussitôt le téléphone', () => {
    const c = nouveau();
    c.reprendre();
    expect(c.appeler()).toBe(true);
    expect(c.phase).toBe('passe');
    expect(c.appeler()).toBe(false);
    c.reprendre();
    expect(c.phase).toBe('jeu');
    expect(c.etat.courant).toBe('bleu');
  });

  it('un choix de pouvoir garde la main au même joueur jusqu’à la fin du coup', () => {
    const c = nouveau();
    c.reprendre();
    let garde = 0;
    while (c.etat.courant === 'rouge' && c.phase === 'jeu' && garde++ < 50) {
      const a = actionsLegales(c.etat)[0] as never;
      c.jouer(a);
      if (c.etat.attente) expect(c.phase).toBe('jeu');
    }
    expect(c.phase).not.toBe('jeu');
  });

  it('refuse une action illégale sans changer l’état', () => {
    const c = nouveau();
    c.reprendre();
    const avant = c.etat;
    expect(c.envoyer('inconnu', 'A1')).toBe(false);
    expect(c.etat).toBe(avant);
  });

  it('indique combien d’élèves « appeler » piocherait', () => {
    const c = nouveau();
    c.reprendre();
    expect(c.nombreAppel).toBe(2);
  });

  it('passe en fin de partie dès qu’un joueur gagne', () => {
    const c = nouveau();
    c.reprendre();
    // Joue des coups au hasard jusqu'à la fin.
    let garde = 0;
    while (c.phase !== 'fin' && garde++ < 2000) {
      if (c.phase === 'passe') c.reprendre();
      else c.jouer(actionsLegales(c.etat)[0] as never);
    }
    expect(c.phase).toBe('fin');
    expect(c.etat.fin).not.toBeNull();
  });
});
