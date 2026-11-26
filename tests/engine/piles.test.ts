import { describe, expect, it } from 'vitest';
import { ciblesPossibles, jouer, noeudsConnectes, sommet } from '../../src/engine/index';
import { idRang, pile, situation } from './aide';

describe('Piles', () => {
  it('on pose par-dessus : l’élève recouvert reste dessous', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: { P: [['bleu', 'fouine']] } });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'P' });
    expect(pile(apres, 'P')).toEqual(['bleu:fouine', 'rouge:grand']);
    expect(apres.journal.find((ev) => ev.type === 'pose')).toMatchObject({ plaque: 'fouine' });
  });

  it('seul l’élève du dessus est visible et occupe l’îlot', () => {
    const e = situation({
      piles: {
        P: [
          ['bleu', 'fouine'],
          ['rouge', 'grand'],
        ],
      },
    });
    expect(sommet(e, 'P')?.bande).toBe('rouge');
    expect(noeudsConnectes(e, 'rouge').has('Q')).toBe(true);
  });

  it('la valeur à battre est celle du dessus, pas celle de dessous', () => {
    const e = situation({
      courant: 'bleu',
      rang: { bleu: ['chouchou'] },
      piles: {
        S: [['bleu', 'grand']],
        Q: [
          ['bleu', 'grand'],
          ['rouge', 'populaire'],
        ],
      },
    });
    expect(ciblesPossibles(e, idRang(e, 'bleu', 'chouchou'))).toContain('Q');
  });

  it('les piles n’ont pas de hauteur maximale', () => {
    let e = situation({ rang: { rouge: Array(8).fill('populaire') } });
    for (let i = 0; i < 8; i++) {
      e = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'populaire'), cible: 'P' });
      if (e.attente) e = jouer(e, { type: 'passer' });
      e.courant = 'rouge';
    }
    expect(pile(e, 'P')).toHaveLength(8);
  });

  it('si l’élève du dessus est retiré, celui du dessous redevient visible et occupe l’îlot', () => {
    const e = situation({
      rang: { rouge: ['rapporteuse'] },
      piles: {
        P: [['rouge', 'grand']],
        Q: [
          ['rouge', 'grand'],
          ['bleu', 'delegue'],
        ],
      },
    });
    let apres = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'rapporteuse'),
      cible: 'L',
    });
    apres = jouer(apres, { type: 'choisir', option: { type: 'cpe', ilot: 'Q' } });
    expect(pile(apres, 'Q')).toEqual(['rouge:grand']);
    expect(sommet(apres, 'Q')?.bande).toBe('rouge');
  });
});
