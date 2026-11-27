import { describe, expect, it } from 'vitest';
import { COURS } from '../../src/data/boards/index';
import {
  chargerCour,
  ciblesPossibles,
  ErreurCour,
  jouer,
  type CourData,
} from '../../src/engine/index';
import { idRang, pile, situation } from './aide';

const scout = () => chargerCour(COURS['camp-scout'] as CourData);
const piscine = () => chargerCour(COURS.piscine as CourData);

describe('Camp scout : sentiers à sens unique', () => {
  it('les bleus descendent par la tyrolienne', () => {
    const e = situation({
      cour: scout(),
      courant: 'bleu',
      rang: { bleu: ['grand'] },
      piles: { A1: [['bleu', 'populaire']], M1: [['bleu', 'populaire']] },
    });
    expect(ciblesPossibles(e, idRang(e, 'bleu', 'grand'))).toContain('B1');
  });

  it('les rouges ne remontent pas la tyrolienne', () => {
    const e = situation({
      cour: scout(),
      rang: { rouge: ['grand'] },
      piles: { B1: [['rouge', 'populaire']] },
    });
    const cibles = ciblesPossibles(e, idRang(e, 'rouge', 'grand'));
    expect(cibles).not.toContain('M1');
    expect(cibles).toContain('M2');
  });

  it('les rouges montent par l’échelle de corde, pas les bleus qui descendent', () => {
    const r = situation({
      cour: scout(),
      rang: { rouge: ['grand'] },
      piles: { B2: [['rouge', 'populaire']], M3: [['rouge', 'populaire']] },
    });
    expect(ciblesPossibles(r, idRang(r, 'rouge', 'grand'))).toContain('A2');
    const b = situation({
      cour: scout(),
      courant: 'bleu',
      rang: { bleu: ['grand'] },
      piles: { A2: [['bleu', 'populaire']] },
    });
    expect(ciblesPossibles(b, idRang(b, 'bleu', 'grand'))).not.toContain('M3');
  });

  it('un sens unique doit suivre une allée existante', () => {
    const data = { ...(COURS['camp-scout'] as CourData), sensUnique: [['A1', 'B2']] };
    expect(() => chargerCour(data as CourData)).toThrow(ErreurCour);
  });
});

describe('Piscine : le courant', () => {
  it('après un tour complet, les piles du grand bain tournent d’un cran', () => {
    const e = situation({
      cour: piscine(),
      premier: 'rouge',
      courant: 'bleu',
      rang: { rouge: ['grand'], bleu: ['grand'] },
      piles: { F1: [['bleu', 'populaire']], F3: [['rouge', 'chouchou']] },
    });
    const apres = jouer(e, { type: 'appeler' });
    expect(pile(apres, 'F1')).toEqual([]);
    expect(pile(apres, 'F2')).toEqual(['bleu:populaire']);
    expect(pile(apres, 'F4')).toEqual(['rouge:chouchou']);
    expect(apres.journal.some((ev) => ev.type === 'courant')).toBe(true);
  });

  it('rien ne tourne après le tour du premier joueur', () => {
    const e = situation({
      cour: piscine(),
      premier: 'rouge',
      rang: { rouge: ['grand'], bleu: ['grand'] },
      piles: { F1: [['bleu', 'populaire']] },
    });
    const apres = jouer(e, { type: 'appeler' });
    expect(pile(apres, 'F1')).toEqual(['bleu:populaire']);
  });

  it('le courant ne passe que par des îlots', () => {
    const data = { ...(COURS.piscine as CourData), courant: ['F1', 'CabRouge'] };
    expect(() => chargerCour(data)).toThrow(ErreurCour);
  });
});
