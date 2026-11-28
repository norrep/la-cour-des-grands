import { describe, expect, it } from 'vitest';
import {
  actionsLegales,
  creerPartie,
  estSignature,
  jouer,
  roleRemplace,
  valeur,
  type Bande,
  type EtatPartie,
  type RoleId,
} from '../../src/engine/index';
import { signaturesPour } from '../../src/data/equipes';
import { cour1, idRang, pile, situation } from './aide';

const envoyer = (e: EtatPartie, role: RoleId, cible: string) =>
  jouer(e, { type: 'envoyer', eleveId: idRang(e, e.courant, role), cible });

function compter(e: EtatPartie, b: Bande, role: RoleId): number {
  const j = e.joueurs[b];
  return [...j.rang, ...j.couloir, ...j.absents].filter((el) => el.role === role).length;
}

describe('DS.1 — Rôles signature des clans', () => {
  it('gardent le chiffre du rôle qu’ils remplacent', () => {
    expect(valeur('bagarreur')).toBe(5);
    expect(roleRemplace('bagarreur')).toBe('contagieux');
    expect(valeur('teleporteur')).toBe(6);
    expect(roleRemplace('teleporteur')).toBe('delegue');
    expect(estSignature('bagarreur')).toBe(true);
    expect(estSignature('delegue')).toBe(false);
  });

  it('prennent la place des 3 exemplaires du rôle remplacé', () => {
    const e = creerPartie(cour1(), {
      graine: 3,
      signatures: { rouge: 'bagarreur', bleu: 'teleporteur' },
    });
    expect(compter(e, 'rouge', 'bagarreur')).toBe(3);
    expect(compter(e, 'rouge', 'contagieux')).toBe(0);
    expect(compter(e, 'rouge', 'delegue')).toBe(3);
    expect(compter(e, 'bleu', 'teleporteur')).toBe(3);
    expect(compter(e, 'bleu', 'delegue')).toBe(0);
    expect(compter(e, 'bleu', 'contagieux')).toBe(3);
  });

  it('viennent du clan : Écoliers → Bagarreur, Aliens → Téléporteur, Vers → aucun', () => {
    expect(signaturesPour({ rouge: 'ecoliers', bleu: 'aliens' })).toEqual({
      rouge: 'bagarreur',
      bleu: 'teleporteur',
    });
    expect(signaturesPour({ rouge: 'vers', bleu: 'vers' })).toEqual({});
  });

  it('sans signature, les 8 rôles d’origine', () => {
    const e = creerPartie(cour1(), { graine: 3 });
    expect(compter(e, 'rouge', 'contagieux')).toBe(3);
    expect(compter(e, 'rouge', 'bagarreur')).toBe(0);
  });
});

describe('DS.2 — Le Bagarreur', () => {
  const depart = () =>
    situation({
      rang: { rouge: ['bagarreur'] },
      piles: { P: [['rouge', 'grand']], S: [['bleu', 'populaire']], L: [['bleu', 'grand']] },
    });

  it('bouscule un adversaire voisin plus faible vers un îlot vide voisin de lui', () => {
    const e = envoyer(depart(), 'bagarreur', 'Q');
    // S (1) est voisin de Q ; ses voisins vides : D et X (pas Q, où est le Bagarreur).
    // L (Grand, 7) est trop fort.
    expect(e.attente?.options).toEqual([
      { type: 'glisser', depart: 'S', arrivee: 'D' },
      { type: 'glisser', depart: 'S', arrivee: 'X' },
    ]);
    const apres = jouer(e, {
      type: 'choisir',
      option: { type: 'glisser', depart: 'S', arrivee: 'X' },
    });
    expect(pile(apres, 'S')).toEqual([]);
    expect(pile(apres, 'X')).toEqual(['bleu:populaire']);
    expect(apres.journal.find((ev) => ev.type === 'glissade')).toMatchObject({ par: 'bagarreur' });
    expect(apres.courant).toBe('bleu');
  });

  it('est facultatif', () => {
    const e = envoyer(depart(), 'bagarreur', 'Q');
    expect(actionsLegales(e)).toContainEqual({ type: 'passer' });
    const apres = jouer(e, { type: 'passer' });
    expect(pile(apres, 'S')).toEqual(['bleu:populaire']);
  });

  it('ne bouscule ni le Petit ni un élève de 5 ou plus', () => {
    const e = envoyer(
      situation({
        rang: { rouge: ['bagarreur'] },
        piles: { P: [['rouge', 'grand']], S: [['bleu', 'petit']], D: [['bleu', 'contagieux']] },
      }),
      'bagarreur',
      'Q',
    );
    expect(e.attente).toBeNull();
    expect(e.courant).toBe('bleu');
  });

  it('ne pousse pas sur un îlot occupé', () => {
    const e = envoyer(
      situation({
        rang: { rouge: ['bagarreur'] },
        piles: {
          P: [['rouge', 'grand']],
          S: [['bleu', 'fouine']],
          D: [['bleu', 'grand']],
          X: [['rouge', 'populaire']],
        },
      }),
      'bagarreur',
      'Q',
    );
    expect(e.attente).toBeNull();
  });
});

describe('DS.3 — Le Téléporteur', () => {
  const depart = () =>
    situation({
      rang: { rouge: ['teleporteur'] },
      piles: {
        P: [['rouge', 'populaire']],
        D: [['rouge', 'chouchou']],
        L: [['rouge', 'petit']],
        S: [['bleu', 'grand']],
      },
    });

  it('échange sa place avec un élève de sa bande, sauf le Petit', () => {
    const e = envoyer(depart(), 'teleporteur', 'Q');
    expect(e.attente?.options).toEqual([
      { type: 'echanger', ilot: 'P' },
      { type: 'echanger', ilot: 'D' },
    ]);
    const apres = jouer(e, { type: 'choisir', option: { type: 'echanger', ilot: 'D' } });
    expect(pile(apres, 'Q')).toEqual(['rouge:chouchou']);
    expect(pile(apres, 'D')).toEqual(['rouge:teleporteur']);
    const glissades = apres.journal.filter((ev) => ev.type === 'glissade');
    expect(glissades).toHaveLength(2);
    expect(glissades.every((ev) => ev.type === 'glissade' && ev.par === 'teleporteur')).toBe(true);
  });

  it('est facultatif, même avec un seul copain (pouvoirs automatiques)', () => {
    const s = situation({
      rang: { rouge: ['teleporteur'] },
      piles: { P: [['rouge', 'populaire']] },
    });
    const e = envoyer({ ...s, pouvoirsAuto: true }, 'teleporteur', 'Q');
    expect(e.attente?.options).toEqual([{ type: 'echanger', ilot: 'P' }]);
    expect(pile(jouer(e, { type: 'passer' }), 'Q')).toEqual(['rouge:teleporteur']);
  });
});
