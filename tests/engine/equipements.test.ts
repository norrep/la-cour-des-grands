import { describe, expect, it } from 'vitest';
import { ciblesPossibles, jouer, optionsEffet, type EtatPartie } from '../../src/engine/index';
import { cour1, courTest, idRang, pile, situation, type Situation } from './aide';

const envoyer = (e: EtatPartie, role: Parameters<typeof idRang>[2], cible: string) =>
  jouer(e, { type: 'envoyer', eleveId: idRang(e, e.courant, role), cible });

/** Rouge occupe P : Q est relié. */
const avecP = (s: Situation): Situation => ({
  ...s,
  piles: { P: [['rouge', 'grand']], ...(s.piles ?? {}) },
});

describe('1 — Le banc (cour du premier jour)', () => {
  const cour = courTest({ equipementQ: 'banc' });

  it('remet un autre de ses élèves visibles de la cour dans son rang', () => {
    let e = envoyer(situation(avecP({ cour, rang: { rouge: ['grand'] } })), 'grand', 'Q');
    expect(e.attente?.options).toEqual([{ type: 'rappeler', ilot: 'P' }]);
    e = jouer(e, { type: 'choisir', option: { type: 'rappeler', ilot: 'P' } });
    expect(pile(e, 'P')).toEqual([]);
    expect(e.joueurs.rouge.rang.map((el) => el.role)).toEqual(['grand']);
    expect(pile(e, 'Q')).toEqual(['rouge:grand']);
  });

  it('ne reprend pas l’élève qui vient d’être posé sur le banc', () => {
    const e = envoyer(situation({ cour, rang: { rouge: ['fouine'] } }), 'fouine', 'Q');
    expect(e.attente).toBeNull();
  });

  it('ne reprend pas un élève adverse', () => {
    const e = envoyer(
      situation(avecP({ cour, rang: { rouge: ['grand'] }, piles: { S: [['bleu', 'grand']] } })),
      'grand',
      'Q',
    );
    expect(e.attente?.options).toEqual([{ type: 'rappeler', ilot: 'P' }]);
  });

  it('révèle l’élève du dessous, qui reprend l’îlot', () => {
    let e = envoyer(
      situation({
        cour,
        rang: { rouge: ['grand'] },
        piles: {
          P: [
            ['bleu', 'populaire'],
            ['rouge', 'grand'],
          ],
          L: [['rouge', 'grand']],
        },
      }),
      'grand',
      'Q',
    );
    e = jouer(e, { type: 'choisir', option: { type: 'rappeler', ilot: 'P' } });
    expect(pile(e, 'P')).toEqual(['bleu:populaire']);
  });

  it('ne fait rien si le rang est plein', () => {
    const e = situation(avecP({ cour }));
    e.joueurs.rouge.rang = Array.from({ length: 8 }, (_, i) => ({
      id: `r${i}`,
      bande: 'rouge' as const,
      role: 'grand' as const,
    }));
    expect(
      optionsEffet(e, { type: 'equipement', equipement: 'banc', ilot: 'Q', eleveId: 'x' }),
    ).toEqual([]);
  });

  it('est désactivé quand on joue sans équipements', () => {
    const e = envoyer(
      situation(avecP({ cour, equipements: false, rang: { rouge: ['grand'] } })),
      'grand',
      'Q',
    );
    expect(e.attente).toBeNull();
  });

  it('cour n°1 : le banc est en M2', () => {
    const e = envoyer(
      situation({
        cour: cour1(),
        rang: { rouge: ['grand'] },
        piles: { B1: [['rouge', 'grand']] },
        surveillante: 3,
      }),
      'grand',
      'M2',
    );
    expect(e.attente?.effet).toMatchObject({ type: 'equipement', equipement: 'banc' });
  });
});

describe('2 — La cabane perchée (cour de l’arbre)', () => {
  const cour = courTest({ equipementQ: 'cabanePerchee' });

  it('pioche 1 élève', () => {
    let e = envoyer(situation(avecP({ cour, rang: { rouge: ['grand'] } })), 'grand', 'Q');
    expect(e.attente?.options).toEqual([{ type: 'piocher' }]);
    e = jouer(e, { type: 'choisir', option: { type: 'piocher' } });
    expect(e.joueurs.rouge.rang).toHaveLength(1);
    expect(e.journal).toContainEqual(
      expect.objectContaining({ type: 'pioche', nombre: 1, source: 'cabanePerchee' }),
    );
  });

  it('s’applique après le pouvoir de l’élève posé', () => {
    let e = envoyer(situation(avecP({ cour, rang: { rouge: ['populaire'] } })), 'populaire', 'Q');
    expect(e.attente?.effet).toMatchObject({ type: 'pouvoir', role: 'populaire' });
    e = jouer(e, { type: 'choisir', option: { type: 'piocher' } });
    expect(e.attente?.effet).toMatchObject({ type: 'equipement', equipement: 'cabanePerchee' });
    e = jouer(e, { type: 'choisir', option: { type: 'piocher' } });
    expect(e.joueurs.rouge.rang).toHaveLength(3);
    const sources = e.journal.filter((ev) => ev.type === 'pioche').map((ev) => ev.source);
    expect(sources).toEqual(['populaire', 'cabanePerchee']);
  });
});

describe('3 — La porte de la vie scolaire (cour du bâtiment)', () => {
  const cour = courTest({ equipementQ: 'porteVieScolaire' });

  it('reprend un de ses élèves de la défausse dans son rang', () => {
    let e = envoyer(
      situation(
        avecP({ cour, rang: { rouge: ['grand'] }, cpe: { rouge: ['fouine'], bleu: ['grand'] } }),
      ),
      'grand',
      'Q',
    );
    expect(e.attente?.options).toHaveLength(1);
    const option = e.attente?.options[0];
    if (!option) throw new Error('option attendue');
    e = jouer(e, { type: 'choisir', option });
    expect(e.joueurs.rouge.cpe).toEqual([]);
    expect(e.joueurs.rouge.rang.map((el) => el.role)).toEqual(['fouine']);
    expect(e.joueurs.bleu.cpe).toHaveLength(1);
  });

  it('ne fait rien si sa défausse est vide', () => {
    const e = envoyer(situation(avecP({ cour, rang: { rouge: ['grand'] } })), 'grand', 'Q');
    expect(e.attente).toBeNull();
  });
});

describe('4 — Les buts (cour du foot)', () => {
  const cour = courTest({ equipementQ: 'buts' });

  it('envoie chez la CPE un adverse de valeur 1 ou 2 à exactement 2 allées', () => {
    let e = envoyer(
      situation(
        avecP({
          cour,
          rang: { rouge: ['grand'] },
          piles: { X: [['bleu', 'chouchou']] },
        }),
      ),
      'grand',
      'Q',
    );
    expect(e.attente?.options).toEqual([{ type: 'cpe', ilot: 'X' }]);
    e = jouer(e, { type: 'choisir', option: { type: 'cpe', ilot: 'X' } });
    expect(e.joueurs.bleu.cpe.map((el) => el.role)).toEqual(['chouchou']);
  });

  it('ignore les valeurs 3 et plus, et le joker', () => {
    const e = envoyer(
      situation(
        avecP({
          cour,
          rang: { rouge: ['grand'] },
          piles: { X: [['bleu', 'rapporteuse']], Y: [['bleu', 'petit']] },
        }),
      ),
      'grand',
      'Q',
    );
    expect(e.attente).toBeNull();
  });

  it('ignore un élève à 1 allée ou à 3 allées', () => {
    const e = situation(
      avecP({ cour, piles: { S: [['bleu', 'populaire']], Y: [['bleu', 'populaire']] } }),
    );
    expect(
      optionsEffet(e, { type: 'equipement', equipement: 'buts', ilot: 'Q', eleveId: 'x' }),
    ).toEqual([]);
  });
});

describe('5 — Le toboggan (cour des jeux)', () => {
  const cour = courTest({ equipementQ: 'toboggan' });

  it('déplace un adverse d’un îlot voisin vers un îlot adjacent à son départ, sans règles de pose', () => {
    let e = envoyer(
      situation(
        avecP({
          cour,
          rang: { rouge: ['grand'] },
          piles: { S: [['bleu', 'populaire']], X: [['rouge', 'grand']] },
        }),
      ),
      'grand',
      'Q',
    );
    const options = e.attente?.options ?? [];
    expect(options).toContainEqual({ type: 'glisser', depart: 'S', arrivee: 'X' });
    expect(options).toContainEqual({ type: 'glisser', depart: 'S', arrivee: 'D' });
    expect(options).toContainEqual({ type: 'glisser', depart: 'S', arrivee: 'Q' });
    // Glisser le 1 bleu sur un Grand rouge : les règles de pose sont ignorées.
    e = jouer(e, { type: 'choisir', option: { type: 'glisser', depart: 'S', arrivee: 'X' } });
    expect(pile(e, 'S')).toEqual([]);
    expect(pile(e, 'X')).toEqual(['rouge:grand', 'bleu:populaire']);
  });
});

describe('6 — La marelle', () => {
  it('n’accepte que certaines valeurs, vérifiées avant la pose', () => {
    const cour = courTest({ equipementQ: 'marelle', valeursQ: [2, 4, 'joker'] });
    const e = situation(avecP({ cour, rang: { rouge: ['grand', 'fouine', 'petit', 'chouchou'] } }));
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).not.toContain('Q');
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'fouine'))).toContain('Q');
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'petit'))).toContain('Q');
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'chouchou'))).toContain('Q');
  });

  it('s’applique aussi aux cabanes de la cour', () => {
    const cour = courTest({ valeursCabB: [3] });
    const e = situation({
      cour,
      rang: { rouge: ['grand', 'rapporteuse'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).not.toContain('CabB');
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'rapporteuse'))).toContain('CabB');
  });

  it('ne s’applique pas quand on joue sans équipements', () => {
    const cour = courTest({ equipementQ: 'marelle', valeursQ: [2] });
    const e = situation(avecP({ cour, equipements: false, rang: { rouge: ['grand'] } }));
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).toContain('Q');
  });
});

describe('7 — Le banc des maîtresses (cour du préau)', () => {
  const cour = courTest({ equipementQ: 'bancMaitresses' });

  it('les pouvoirs des élèves ne s’appliquent pas sur cet îlot', () => {
    const e = envoyer(situation(avecP({ cour, rang: { rouge: ['populaire'] } })), 'populaire', 'Q');
    expect(e.attente).toBeNull();
    expect(e.joueurs.rouge.rang).toHaveLength(0);
  });

  it('les pouvoirs s’appliquent ailleurs', () => {
    const e = envoyer(situation(avecP({ cour, rang: { rouge: ['populaire'] } })), 'populaire', 'L');
    expect(e.attente).not.toBeNull();
  });

  it('annule aussi le pouvoir du 2e élève du Chouchou s’il y est posé', () => {
    let e = envoyer(
      situation(avecP({ cour, rang: { rouge: ['chouchou', 'delegue'] } })),
      'chouchou',
      'L',
    );
    e = jouer(e, {
      type: 'choisir',
      option: { type: 'poser', eleveId: idRang(e, 'rouge', 'delegue'), cible: 'Q' },
    });
    expect(e.attente).toBeNull();
    expect(e.courant).toBe('bleu');
  });
});

describe('8 — La cour du bac à sable (asymétrique)', () => {
  const cour = courTest({ deuxiemeCabaneBleue: true });

  it('capturer une seule des deux cabanes adverses suffit pour gagner', () => {
    const e = situation({
      cour,
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], D: [['rouge', 'grand']] },
    });
    const apres = envoyer(e, 'grand', 'CabB2');
    expect(apres.fin).toEqual({ gagnant: 'rouge', raison: 'cabane' });
  });

  it('la bande aux deux cabanes ne peut poser sur aucune des siennes', () => {
    const e = situation({ cour, courant: 'bleu', rang: { bleu: ['grand'] } });
    const cibles = ciblesPossibles(e, idRang(e, 'bleu', 'grand'));
    expect(cibles).not.toContain('CabB');
    expect(cibles).not.toContain('CabB2');
  });
});
