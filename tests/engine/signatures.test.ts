import { describe, expect, it } from 'vitest';
import {
  actionsLegales,
  ciblesPossibles,
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
  it('sont tous des 5, à la place du Contagieux', () => {
    expect(valeur('bagarreur')).toBe(5);
    expect(roleRemplace('bagarreur')).toBe('contagieux');
    expect(valeur('teleporteur')).toBe(5);
    expect(roleRemplace('teleporteur')).toBe('contagieux');
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
    expect(compter(e, 'bleu', 'contagieux')).toBe(0);
    expect(compter(e, 'bleu', 'delegue')).toBe(3);
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
        X: [['rouge', 'chouchou']],
        S: [['bleu', 'grand']],
      },
    });

  it('se pose n’importe où sur un élève de sa bande, même loin du chemin', () => {
    const e = depart();
    const cibles = ciblesPossibles(e, idRang(e, 'rouge', 'teleporteur'));
    // X n'est pas relié à la cabane rouge, mais un copain y est.
    expect(cibles).toContain('X');
    expect(cibles).toContain('P');
    // Loin du chemin sur une case vide ou adverse : non.
    expect(cibles).not.toContain('Y');
    expect(cibles).not.toContain('S');
  });

  it('le copain déjà en place retourne dans la main', () => {
    const apres = envoyer(depart(), 'teleporteur', 'X');
    expect(pile(apres, 'X')).toEqual(['rouge:teleporteur']);
    expect(apres.joueurs.rouge.rang.map((el) => el.role)).toEqual(['chouchou']);
    expect(apres.journal.find((ev) => ev.type === 'rappel')).toMatchObject({ ilot: 'X' });
    expect(apres.courant).toBe('bleu');
  });

  it('sur un îlot vide relié, il se pose comme un 5 ordinaire', () => {
    const apres = envoyer(depart(), 'teleporteur', 'Q');
    expect(pile(apres, 'Q')).toEqual(['rouge:teleporteur']);
    expect(apres.joueurs.rouge.rang).toHaveLength(0);
  });
});
