import { describe, expect, it } from 'vitest';
import { ActionIllegale, actionsLegales, ciblesPossibles, jouer } from '../../src/engine/index';
import { idRang, pile, situation } from './aide';

describe('Action A : appeler des copains', () => {
  it('pioche 2 élèves du couloir dans le rang puis passe la main', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    const apres = jouer(e, { type: 'appeler' });
    expect(apres.joueurs.rouge.rang).toHaveLength(3);
    expect(apres.joueurs.rouge.couloir).toHaveLength(8);
    expect(apres.courant).toBe('bleu');
    expect(apres.tour).toBe(2);
    expect(apres.journal.at(-1)).toMatchObject({ type: 'appel', bande: 'rouge', nombre: 2 });
  });

  it('prend les élèves sur le dessus du couloir', () => {
    const e = situation();
    const dessus = e.joueurs.rouge.couloir.slice(0, 2).map((el) => el.id);
    const apres = jouer(e, { type: 'appeler' });
    expect(apres.joueurs.rouge.rang.map((el) => el.id)).toEqual(dessus);
  });

  it('ne pioche qu’un élève s’il ne reste qu’une place dans le rang', () => {
    const e = situation({ rang: { rouge: Array(7).fill('grand') } });
    expect(jouer(e, { type: 'appeler' }).joueurs.rouge.rang).toHaveLength(8);
  });

  it('ne pioche qu’un élève s’il n’en reste qu’un dans le couloir', () => {
    const e = situation({ couloir: { rouge: ['fouine'] } });
    const apres = jouer(e, { type: 'appeler' });
    expect(apres.joueurs.rouge.rang).toHaveLength(1);
    expect(apres.joueurs.rouge.couloir).toHaveLength(0);
  });

  it('est interdit si le rang contient déjà 8 élèves', () => {
    const e = situation({ rang: { rouge: Array(8).fill('grand') } });
    expect(actionsLegales(e)).not.toContainEqual({ type: 'appeler' });
    expect(() => jouer(e, { type: 'appeler' })).toThrow(ActionIllegale);
  });

  it('est interdit si le couloir est vide', () => {
    const e = situation({ rang: { rouge: ['grand'] }, couloir: { rouge: [] } });
    expect(() => jouer(e, { type: 'appeler' })).toThrow(ActionIllegale);
  });

  it('ne modifie jamais l’état d’origine', () => {
    const e = situation();
    const copie = structuredClone({ j: e.joueurs, p: e.piles });
    jouer(e, { type: 'appeler' });
    expect({ j: e.joueurs, p: e.piles }).toEqual(copie);
  });
});

describe('Action B : envoyer un élève', () => {
  it('pose sur un îlot vide relié à sa cabane, et retire l’élève du rang', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    const id = idRang(e, 'rouge', 'grand');
    const apres = jouer(e, { type: 'envoyer', eleveId: id, cible: 'P' });
    expect(pile(apres, 'P')).toEqual(['rouge:grand']);
    expect(apres.joueurs.rouge.rang).toHaveLength(0);
    expect(apres.courant).toBe('bleu');
  });

  it('pose sur un de ses élèves, quelle que soit sa valeur', () => {
    const e = situation({ rang: { rouge: ['populaire'] }, piles: { P: [['rouge', 'grand']] } });
    const apres = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'populaire'),
      cible: 'P',
    });
    expect(pile(apres, 'P')).toEqual(['rouge:grand', 'rouge:populaire']);
  });

  it('pose sur un élève adverse de valeur strictement inférieure', () => {
    const e = situation({ rang: { rouge: ['chouchou'] }, piles: { P: [['bleu', 'populaire']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'chouchou'))).toContain('P');
  });

  it('refuse un élève adverse de même valeur', () => {
    const e = situation({ rang: { rouge: ['fouine'] }, piles: { P: [['bleu', 'fouine']] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'fouine'))).not.toContain('P');
  });

  it('refuse un élève adverse de valeur supérieure', () => {
    const e = situation({ rang: { rouge: ['delegue'] }, piles: { P: [['bleu', 'grand']] } });
    const id = idRang(e, 'rouge', 'delegue');
    expect(ciblesPossibles(e, id)).not.toContain('P');
    expect(() => jouer(e, { type: 'envoyer', eleveId: id, cible: 'P' })).toThrow(ActionIllegale);
  });

  it('ne pose jamais sur sa propre cabane', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).not.toContain('CabR');
  });

  it('refuse un élève absent du rang', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    expect(() => jouer(e, { type: 'envoyer', eleveId: 'inconnu', cible: 'P' })).toThrow(
      ActionIllegale,
    );
  });

  it('refuse une cible inconnue', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    const id = idRang(e, 'rouge', 'grand');
    expect(() => jouer(e, { type: 'envoyer', eleveId: id, cible: 'Lune' })).toThrow(ActionIllegale);
  });

  it('refuse de choisir ou passer quand aucun choix n’est attendu', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    expect(() => jouer(e, { type: 'passer' })).toThrow(ActionIllegale);
    expect(() => jouer(e, { type: 'choisir', option: { type: 'piocher' } })).toThrow(
      ActionIllegale,
    );
  });

  it('liste toutes les actions légales : appeler et chaque pose possible', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    const id = idRang(e, 'rouge', 'grand');
    expect(actionsLegales(e)).toEqual([
      { type: 'appeler' },
      { type: 'envoyer', eleveId: id, cible: 'P' },
    ]);
  });
});
