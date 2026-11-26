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

  it('un coup terminé attend une confirmation, puis on passe le téléphone', () => {
    const c = nouveau();
    c.reprendre();
    expect(c.appeler()).toBe(true);
    expect(c.phase).toBe('aConfirmer');
    c.valider();
    expect(c.phase).toBe('passe');
    c.reprendre();
    expect(c.phase).toBe('jeu');
    expect(c.etat.courant).toBe('bleu');
  });

  it('annule le dernier coup non confirmé', () => {
    const c = nouveau();
    c.reprendre();
    const avant = c.etat;
    c.appeler();
    expect(c.peutAnnuler).toBe(true);
    c.annuler();
    expect(c.etat).toBe(avant);
    expect(c.phase).toBe('jeu');
  });

  it('annule aussi un coup en plein choix de pouvoir', () => {
    const c = nouveau();
    c.reprendre();
    const pose = actionsLegales(c.etat).find((a) => a.type === 'envoyer');
    if (!pose || pose.type !== 'envoyer') throw new Error('pose attendue');
    c.envoyer(pose.eleveId, pose.cible);
    c.annuler();
    expect(c.etat.joueurs.rouge.rang).toHaveLength(3);
    expect(c.etat.attente).toBeNull();
  });

  it('ne peut pas annuler un coup confirmé', () => {
    const c = nouveau();
    c.reprendre();
    c.appeler();
    c.valider();
    c.reprendre();
    expect(c.peutAnnuler).toBe(false);
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
      if (c.phase === 'aConfirmer') c.valider();
      else if (c.phase === 'passe') c.reprendre();
      else c.jouer(actionsLegales(c.etat)[0] as never);
    }
    expect(c.phase).toBe('fin');
    expect(c.etat.fin).not.toBeNull();
  });
});
