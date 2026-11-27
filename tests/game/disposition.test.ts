import { describe, expect, it } from 'vitest';
import { HAUTEUR, LARGEUR } from '../../src/game/config';
import { noeudSous, positionNoeud, RANG, versEcran, xCarteRang } from '../../src/game/disposition';
import { cour1 } from '../engine/aide';

const cour = cour1();

describe('Disposition à l’écran (720×1280)', () => {
  it('place toute la cour dans l’écran, au-dessus du bouton d’appel', () => {
    for (const id of Object.keys(cour.noeuds)) {
      const p = positionNoeud(cour, id);
      expect(p.x).toBeGreaterThan(50);
      expect(p.x).toBeLessThan(LARGEUR - 50);
      expect(p.y).toBeGreaterThan(140);
      expect(p.y).toBeLessThan(1000);
    }
  });

  it('la cabane bleue est en haut, la rouge en bas', () => {
    expect(positionNoeud(cour, 'CabBleue').y).toBeLessThan(positionNoeud(cour, 'CabRouge').y);
  });

  it('trouve l’îlot sous le doigt, dans un rayon donné', () => {
    const p = versEcran(0.28, 0.22);
    expect(noeudSous(cour, ['A1', 'A2'], { x: p.x + 20, y: p.y - 20 }, 60)).toBe('A1');
    expect(noeudSous(cour, ['A2'], p, 60)).toBeNull();
  });

  it('8 cartes tiennent dans la largeur du rang', () => {
    const gauche = xCarteRang(0, 8) - RANG.largeurCarte / 2;
    const droite = xCarteRang(7, 8) + RANG.largeurCarte / 2;
    expect(gauche).toBeGreaterThanOrEqual(0);
    expect(droite).toBeLessThanOrEqual(LARGEUR);
    expect(RANG.y + RANG.hauteurCarte / 2).toBeLessThanOrEqual(HAUTEUR);
  });
});
