/** Règles finales de l'audit d'équilibrage (DR.1 à DR.6). */
import { describe, expect, it } from 'vitest';
import { ciblesPossibles, jouer, type EtatPartie, type RoleId } from '../../src/engine/index';
import { idRang, situation } from './aide';

const envoyer = (e: EtatPartie, role: RoleId, cible: string) =>
  jouer(e, { type: 'envoyer', eleveId: idRang(e, e.courant, role), cible });

describe('DR.3 — Le Petit intouchable', () => {
  it('aucun adversaire ne peut le recouvrir, même un Grand', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: { P: [['bleu', 'petit']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).not.toContain('P');
  });

  it('sa propre bande peut toujours poser sur lui', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: { P: [['rouge', 'petit']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).toContain('P');
  });

  it('il prolonge le chemin vers la cabane comme les autres', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: { P: [['rouge', 'petit']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).toContain('Q');
  });
});

describe('DR.4 — La Fouine passe par les buissons', () => {
  it('posée hors du chemin, elle pioche 1 élève', () => {
    const e = envoyer(situation({ rang: { rouge: ['fouine'] } }), 'fouine', 'Y');
    expect(e.attente?.options).toEqual([{ type: 'piocher' }]);
    const apres = jouer(e, { type: 'choisir', option: { type: 'piocher' } });
    expect(apres.joueurs.rouge.rang).toHaveLength(1);
    expect(apres.journal).toContainEqual(
      expect.objectContaining({ type: 'pioche', source: 'fouine', nombre: 1 }),
    );
  });

  it('posée sur le chemin, elle ne pioche pas', () => {
    const e = envoyer(situation({ rang: { rouge: ['fouine'] } }), 'fouine', 'P');
    expect(e.attente).toBeNull();
    expect(e.joueurs.rouge.rang).toHaveLength(0);
  });
});

describe('DR.6 — La sonnerie se départage aux îlots tenus', () => {
  it('à égalité de goûters, gagne celui qui tient le plus d’îlots', () => {
    const e = situation({
      couloir: { bleu: [] },
      rang: { bleu: [] },
      bonsPoints: { rouge: 1, bleu: 1 },
      piles: { S: [['bleu', 'grand']], X: [['bleu', 'grand']], P: [['rouge', 'grand']] },
    });
    const apres = jouer(e, { type: 'appeler' });
    expect(apres.fin).toEqual({ gagnant: 'bleu', raison: 'sonnerie' });
  });
});
