import { describe, expect, it } from 'vitest';
import { ciblesPossibles, jouer, noeudsConnectes } from '../../src/engine/index';
import { courTest, idRang, situation } from './aide';

describe('Connexion à la cabane', () => {
  it('au départ, seuls les îlots voisins de sa cabane sont reliés', () => {
    const e = situation({ rang: { rouge: ['grand'], bleu: ['grand'] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).toEqual(['P']);
    const b = situation({ courant: 'bleu', rang: { bleu: ['grand'] } });
    expect(ciblesPossibles(b, idRang(b, 'bleu', 'grand'))).toEqual(['S']);
  });

  it('un chemin d’îlots occupés par sa bande prolonge la connexion', () => {
    const e = situation({
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'populaire']], Q: [['rouge', 'populaire']] },
    });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand')).sort()).toEqual(
      ['D', 'L', 'P', 'Q', 'S'].sort(),
    );
  });

  it('un îlot vide coupe le chemin', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: { Q: [['rouge', 'grand']] } });
    // Q est à rouge mais P est vide : Q n'est pas relié.
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).toEqual(['P']);
  });

  it('un îlot adverse coupe le chemin, même si on peut le recouvrir', () => {
    const e = situation({
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['bleu', 'populaire']] },
    });
    const cibles = ciblesPossibles(e, idRang(e, 'rouge', 'grand'));
    expect(cibles).toContain('Q');
    expect(cibles).not.toContain('S');
    expect(cibles).not.toContain('D');
  });

  it('l’allée de la surveillante est bloquée', () => {
    const cour = courTest({ ronde: [['P', 'Q']] });
    const e = situation({ cour, rang: { rouge: ['grand'] }, piles: { P: [['rouge', 'grand']] } });
    const cibles = ciblesPossibles(e, idRang(e, 'rouge', 'grand'));
    expect(cibles).not.toContain('Q');
    expect(cibles).toContain('L');
  });

  it('un détour par d’autres îlots contourne l’allée bloquée', () => {
    const cour = courTest({ ronde: [['P', 'Q']] });
    const e = situation({
      cour,
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], L: [['rouge', 'grand']] },
    });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).toContain('Q');
  });

  it('la connexion se calcule depuis chaque cabane de la bande', () => {
    const cour = courTest({ deuxiemeCabaneBleue: true });
    const e = situation({ cour, courant: 'bleu' });
    expect([...noeudsConnectes(e, 'bleu')].sort()).toEqual(['D', 'S']);
  });

  it('la cabane adverse est reliée quand sa bande occupe un îlot voisin relié', () => {
    const e = situation({
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    const apres = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'grand'),
      cible: 'CabB',
    });
    expect(apres.fin).toEqual({ gagnant: 'rouge', raison: 'cabane' });
  });

  it('la cabane adverse non reliée est interdite', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: { S: [['rouge', 'grand']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).not.toContain('CabB');
  });
});
