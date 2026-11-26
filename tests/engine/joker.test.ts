import { describe, expect, it } from 'vitest';
import { ciblesPossibles, jouer, peutRecouvrir } from '../../src/engine/index';
import { courTest, eleve, idRang, situation } from './aide';

describe('Le Petit de maternelle (joker)', () => {
  it('peut se poser sur n’importe quel élève adverse, même le Grand de CM2', () => {
    const e = situation({ rang: { rouge: ['petit'] }, piles: { P: [['bleu', 'grand']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'petit'))).toContain('P');
  });

  it('n’importe quel élève peut le recouvrir, même un Populaire', () => {
    expect(peutRecouvrir(eleve('rouge', 'populaire'), eleve('bleu', 'petit'))).toBe(true);
  });

  it('un joker peut recouvrir un joker adverse', () => {
    expect(peutRecouvrir(eleve('rouge', 'petit'), eleve('bleu', 'petit'))).toBe(true);
  });

  it('ne peut jamais être posé sur la cabane adverse', () => {
    const e = situation({
      rang: { rouge: ['petit', 'grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'petit'))).not.toContain('CabB');
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).toContain('CabB');
  });

  it('ne peut pas recouvrir un élève adverse sous surveillance', () => {
    const cour = courTest({ ronde: [['P', 'L']] });
    const e = situation({ cour, rang: { rouge: ['petit'] }, piles: { P: [['bleu', 'grand']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'petit'))).not.toContain('P');
  });

  it('n’a aucun pouvoir : le tour se termine aussitôt', () => {
    const e = situation({ rang: { rouge: ['petit'] }, piles: { P: [['bleu', 'grand']] } });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'petit'), cible: 'P' });
    expect(apres.attente).toBeNull();
    expect(apres.courant).toBe('bleu');
  });
});
