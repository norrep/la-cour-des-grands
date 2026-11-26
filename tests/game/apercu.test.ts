import { describe, expect, it } from 'vitest';
import { apercu } from '../../src/game/apercu';
import { courTest, idRang, situation } from '../engine/aide';

// Allées de la cour de test : 0 CabR-P, 1 P-Q, 2 P-L, 3 L-Q, 4 Q-D, 5 Q-S, 6 D-S, 7 S-X, 8 S-CabB…
describe('Aperçu d’un coup', () => {
  it('annonce le plaquage et le chemin gagné, sans toucher à l’état', () => {
    const e = situation({
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['bleu', 'populaire']] },
    });
    const avant = JSON.stringify(e.piles);
    const a = apercu(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'Q' });
    expect(a?.plaque).toBe('populaire');
    expect(a?.nouvellesAllees).toEqual([1]);
    expect(a?.victoire).toBe(false);
    expect(JSON.stringify(e.piles)).toBe(avant);
  });

  it('annonce le goûter ramassé', () => {
    const cour = courTest({
      regions: [{ id: 'r1', nom: 'Zone', ilots: ['P', 'L'], bonsPoints: 2 }],
    });
    const e = situation({ cour, rang: { rouge: ['grand'] }, piles: { P: [['rouge', 'grand']] } });
    const a = apercu(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'L' });
    expect(a?.gouters).toEqual([{ region: 'r1', bonsPoints: 2 }]);
  });

  it('annonce la victoire par la cabane', () => {
    const e = situation({
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    const a = apercu(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'CabB' });
    expect(a?.victoire).toBe(true);
  });

  it('renvoie null pour un coup illégal', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    expect(
      apercu(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'S' }),
    ).toBeNull();
  });
});
