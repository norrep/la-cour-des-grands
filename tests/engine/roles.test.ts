import { describe, expect, it } from 'vitest';
import {
  ActionIllegale,
  actionsLegales,
  ciblesPossibles,
  jouer,
  optionsEffet,
  valeur,
  type EtatPartie,
} from '../../src/engine/index';
import { idRang, pile, situation } from './aide';

const envoyer = (e: EtatPartie, role: Parameters<typeof idRang>[2], cible: string) =>
  jouer(e, { type: 'envoyer', eleveId: idRang(e, e.courant, role), cible });

describe('Valeurs des rôles', () => {
  it('joker, puis 1 à 7', () => {
    expect(
      (
        [
          'petit',
          'populaire',
          'chouchou',
          'rapporteuse',
          'fouine',
          'contagieux',
          'delegue',
          'grand',
        ] as const
      ).map(valeur),
    ).toEqual([null, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('1 — La Populaire', () => {
  it('pioche 2 élèves', () => {
    const e = envoyer(situation({ rang: { rouge: ['populaire'] } }), 'populaire', 'P');
    expect(e.attente?.options).toEqual([{ type: 'piocher' }]);
    const apres = jouer(e, { type: 'choisir', option: { type: 'piocher' } });
    expect(apres.joueurs.rouge.rang).toHaveLength(2);
    expect(apres.courant).toBe('bleu');
  });

  it('ne pioche qu’un élève s’il ne reste qu’une place dans le rang', () => {
    const e = envoyer(
      situation({ rang: { rouge: ['populaire', ...Array(7).fill('grand')] } }),
      'populaire',
      'P',
    );
    const apres = jouer(e, { type: 'choisir', option: { type: 'piocher' } });
    expect(apres.joueurs.rouge.rang).toHaveLength(8);
  });

  it('son pouvoir est facultatif', () => {
    const e = envoyer(situation({ rang: { rouge: ['populaire'] } }), 'populaire', 'P');
    const apres = jouer(e, { type: 'passer' });
    expect(apres.joueurs.rouge.rang).toHaveLength(0);
    expect(apres.journal).toContainEqual(
      expect.objectContaining({ type: 'passe', effet: 'populaire' }),
    );
  });

  it('sans couloir, le pouvoir ne fait rien', () => {
    const e = envoyer(
      situation({ rang: { rouge: ['populaire'] }, couloir: { rouge: [] } }),
      'populaire',
      'P',
    );
    expect(e.attente).toBeNull();
    expect(e.courant).toBe('bleu');
  });
});

describe('2 — Le Chouchou', () => {
  it('propose de poser un 2e élève de valeur 5 ou plus, sans joker', () => {
    const e = envoyer(
      situation({ rang: { rouge: ['chouchou', 'contagieux', 'fouine', 'petit', 'grand'] } }),
      'chouchou',
      'P',
    );
    const roles = new Set(
      e.attente?.options.map((o) =>
        o.type === 'poser' ? e.joueurs.rouge.rang.find((el) => el.id === o.eleveId)?.role : null,
      ),
    );
    expect(roles).toEqual(new Set(['contagieux', 'grand']));
  });

  it('le 2e élève respecte toutes les règles de pose (connexion comprise)', () => {
    const e = envoyer(situation({ rang: { rouge: ['chouchou', 'grand'] } }), 'chouchou', 'P');
    const cibles = e.attente?.options.map((o) => (o.type === 'poser' ? o.cible : '')).sort();
    // Depuis P (rouge) : P lui-même, Q et L. Pas S ni D (non reliés).
    expect(cibles).toEqual(['L', 'P', 'Q']);
  });

  it('applique ensuite le pouvoir du 2e élève', () => {
    let e = envoyer(situation({ rang: { rouge: ['chouchou', 'delegue'] } }), 'chouchou', 'P');
    const id = idRang(e, 'rouge', 'delegue');
    e = jouer(e, { type: 'choisir', option: { type: 'poser', eleveId: id, cible: 'Q' } });
    expect(pile(e, 'Q')).toEqual(['rouge:delegue']);
    expect(e.attente?.effet).toMatchObject({ type: 'pouvoir', role: 'delegue' });
    e = jouer(e, { type: 'choisir', option: { type: 'surveillante', pas: 1 } });
    expect(e.surveillante).toBe(1);
    expect(e.courant).toBe('bleu');
  });

  it('refuse un élève de valeur inférieure à 5', () => {
    const e = envoyer(situation({ rang: { rouge: ['chouchou', 'fouine'] } }), 'chouchou', 'P');
    expect(e.attente).toBeNull();
    const id = 'x';
    expect(() =>
      jouer(e, { type: 'choisir', option: { type: 'poser', eleveId: id, cible: 'Q' } }),
    ).toThrow(ActionIllegale);
  });

  it('est facultatif', () => {
    const e = envoyer(situation({ rang: { rouge: ['chouchou', 'grand'] } }), 'chouchou', 'P');
    const apres = jouer(e, { type: 'passer' });
    expect(apres.joueurs.rouge.rang).toHaveLength(1);
    expect(apres.courant).toBe('bleu');
  });

  it('peut envoyer le 2e élève sur la cabane adverse, ce qui gagne', () => {
    let e = situation({
      rang: { rouge: ['chouchou', 'grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    e = envoyer(e, 'chouchou', 'D');
    const id = idRang(e, 'rouge', 'grand');
    e = jouer(e, { type: 'choisir', option: { type: 'poser', eleveId: id, cible: 'CabB' } });
    expect(e.fin).toEqual({ gagnant: 'rouge', raison: 'cabane' });
  });
});

describe('3 — La Rapporteuse', () => {
  const base = () =>
    situation({
      rang: { rouge: ['rapporteuse'] },
      piles: { P: [['rouge', 'grand']], Q: [['bleu', 'grand']], S: [['bleu', 'grand']] },
    });

  it('envoie chez la CPE un élève adverse visible sur un îlot voisin', () => {
    let e = envoyer(base(), 'rapporteuse', 'L');
    expect(e.attente?.options).toEqual([{ type: 'cpe', ilot: 'Q' }]);
    e = jouer(e, { type: 'choisir', option: { type: 'cpe', ilot: 'Q' } });
    expect(pile(e, 'Q')).toEqual([]);
    expect(e.joueurs.bleu.cpe.map((el) => el.role)).toEqual(['grand']);
  });

  it('ne touche pas un élève à deux allées', () => {
    const e = envoyer(base(), 'rapporteuse', 'L');
    expect(e.attente?.options).not.toContainEqual({ type: 'cpe', ilot: 'S' });
  });

  it('ne touche pas ses propres élèves', () => {
    const e = envoyer(
      situation({ rang: { rouge: ['rapporteuse'] }, piles: { P: [['rouge', 'grand']] } }),
      'rapporteuse',
      'L',
    );
    expect(e.attente).toBeNull();
  });

  it('est facultative', () => {
    const e = jouer(envoyer(base(), 'rapporteuse', 'L'), { type: 'passer' });
    expect(pile(e, 'Q')).toEqual(['bleu:grand']);
  });
});

describe('4 — La Fouine', () => {
  it('ignore la règle de connexion pour sa pose sur un îlot', () => {
    const e = situation({ rang: { rouge: ['fouine'] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'fouine')).sort()).toEqual(
      ['D', 'L', 'P', 'Q', 'S', 'X', 'Y', 'Z'].sort(),
    );
  });

  it('respecte toujours la règle de valeur', () => {
    const e = situation({ rang: { rouge: ['fouine'] }, piles: { S: [['bleu', 'grand']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'fouine'))).not.toContain('S');
  });

  it('la cabane adverse exige toujours une connexion', () => {
    const e = situation({ rang: { rouge: ['fouine'] }, piles: { S: [['rouge', 'grand']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'fouine'))).not.toContain('CabB');
  });

  it('peut entrer dans la cabane adverse si elle est reliée', () => {
    const e = situation({
      rang: { rouge: ['fouine'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'fouine'))).toContain('CabB');
  });
});

describe('5 — Le Contagieux', () => {
  const base = () =>
    situation({ rang: { rouge: ['contagieux'], bleu: ['grand', 'delegue', 'fouine'] } });

  it('envoie un élève tiré au hasard du rang adverse à l’infirmerie', () => {
    const e = jouer(envoyer(base(), 'contagieux', 'P'), {
      type: 'choisir',
      option: { type: 'infirmerie' },
    });
    expect(e.joueurs.bleu.infirmerie).toHaveLength(1);
    const malade = e.joueurs.bleu.infirmerie[0];
    expect(e.joueurs.bleu.rang.some((el) => el.id === malade)).toBe(true);
    expect(e.journal).toContainEqual(
      expect.objectContaining({ type: 'infirmerie', eleveId: malade }),
    );
  });

  it('le tirage est déterministe (générateur à graine)', () => {
    const a = jouer(envoyer(base(), 'contagieux', 'P'), {
      type: 'choisir',
      option: { type: 'infirmerie' },
    });
    const b = jouer(envoyer(base(), 'contagieux', 'P'), {
      type: 'choisir',
      option: { type: 'infirmerie' },
    });
    const role = (e: EtatPartie) =>
      e.joueurs.bleu.rang.find((el) => el.id === e.joueurs.bleu.infirmerie[0])?.role;
    expect(role(a)).toBe(role(b));
  });

  it('l’adversaire ne peut pas le jouer à son prochain tour', () => {
    const e = jouer(envoyer(base(), 'contagieux', 'P'), {
      type: 'choisir',
      option: { type: 'infirmerie' },
    });
    const malade = e.joueurs.bleu.infirmerie[0] as string;
    expect(actionsLegales(e).some((a) => a.type === 'envoyer' && a.eleveId === malade)).toBe(false);
    expect(() => jouer(e, { type: 'envoyer', eleveId: malade, cible: 'S' })).toThrow(
      ActionIllegale,
    );
  });

  it('il compte toujours dans la limite des 8', () => {
    const e = jouer(
      envoyer(
        situation({ rang: { rouge: ['contagieux'], bleu: Array(8).fill('grand') } }),
        'contagieux',
        'P',
      ),
      { type: 'choisir', option: { type: 'infirmerie' } },
    );
    expect(actionsLegales(e)).not.toContainEqual({ type: 'appeler' });
  });

  it('il revient à la fin de ce tour', () => {
    let e = jouer(envoyer(base(), 'contagieux', 'P'), {
      type: 'choisir',
      option: { type: 'infirmerie' },
    });
    const malade = e.joueurs.bleu.infirmerie[0] as string;
    e = jouer(e, { type: 'appeler' }); // tour de bleu
    expect(e.joueurs.bleu.infirmerie).toEqual([]);
    e = jouer(e, { type: 'appeler' }); // tour de rouge
    expect(actionsLegales(e).some((a) => a.type === 'envoyer' && a.eleveId === malade)).toBe(true);
  });

  it('sans élève dans le rang adverse, le pouvoir ne fait rien', () => {
    const e = envoyer(situation({ rang: { rouge: ['contagieux'] } }), 'contagieux', 'P');
    expect(e.attente).toBeNull();
  });

  it('peut provoquer la sonnerie si l’adversaire n’a plus rien de jouable', () => {
    const e = jouer(
      envoyer(
        situation({ rang: { rouge: ['contagieux'], bleu: ['grand'] }, couloir: { bleu: [] } }),
        'contagieux',
        'P',
      ),
      { type: 'choisir', option: { type: 'infirmerie' } },
    );
    expect(e.fin).toEqual({ gagnant: 'rouge', raison: 'sonnerie' });
  });
});

describe('6 — Le Délégué', () => {
  it('fait avancer ou reculer la surveillante de 1 ou 2 allées', () => {
    const e = envoyer(situation({ rang: { rouge: ['delegue'] } }), 'delegue', 'P');
    expect(e.attente?.options).toEqual([
      { type: 'surveillante', pas: -2 },
      { type: 'surveillante', pas: -1 },
      { type: 'surveillante', pas: 1 },
      { type: 'surveillante', pas: 2 },
    ]);
  });

  it('boucle sur la ronde dans les deux sens', () => {
    const cour = situation().cour; // ronde de 2 allées
    expect(cour.ronde).toHaveLength(2);
    const recul = jouer(envoyer(situation({ rang: { rouge: ['delegue'] } }), 'delegue', 'P'), {
      type: 'choisir',
      option: { type: 'surveillante', pas: -1 },
    });
    expect(recul.surveillante).toBe(1);
    expect(recul.journal).toContainEqual(
      expect.objectContaining({ type: 'surveillante', parDelegue: true, pas: -1 }),
    );
  });

  it('est facultatif', () => {
    const e = jouer(envoyer(situation({ rang: { rouge: ['delegue'] } }), 'delegue', 'P'), {
      type: 'passer',
    });
    expect(e.surveillante).toBe(0);
  });
});

describe('7 — Le Grand de CM2', () => {
  it('n’a aucun pouvoir', () => {
    const e = envoyer(situation({ rang: { rouge: ['grand'] } }), 'grand', 'P');
    expect(e.attente).toBeNull();
    expect(optionsEffet(e, { type: 'pouvoir', role: 'grand', ilot: 'P', eleveId: 'x' })).toEqual(
      [],
    );
  });
});

describe('Choix des pouvoirs', () => {
  it('refuse un choix qui ne figure pas dans les options', () => {
    const e = envoyer(
      situation({
        rang: { rouge: ['rapporteuse'] },
        piles: { P: [['rouge', 'grand']], Q: [['bleu', 'grand']] },
      }),
      'rapporteuse',
      'L',
    );
    expect(() => jouer(e, { type: 'choisir', option: { type: 'cpe', ilot: 'S' } })).toThrow(
      ActionIllegale,
    );
    expect(() => jouer(e, { type: 'appeler' })).toThrow(ActionIllegale);
  });

  it('les actions légales pendant un choix sont les options et « passer »', () => {
    const e = envoyer(situation({ rang: { rouge: ['populaire'] } }), 'populaire', 'P');
    expect(actionsLegales(e)).toEqual([
      { type: 'choisir', option: { type: 'piocher' } },
      { type: 'passer' },
    ]);
  });
});
