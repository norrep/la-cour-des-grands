import { describe, expect, it } from 'vitest';
import { choixUnique, jouer, type EtatPartie } from '../../src/engine/index';
import { courTest, idRang, pile, situation } from './aide';

/** DF.40 : à l'écran, un pouvoir sans vrai choix s'applique tout seul. */
const auto = (e: EtatPartie): EtatPartie => ({ ...e, pouvoirsAuto: true });
const envoyer = (e: EtatPartie, role: Parameters<typeof idRang>[2], cible: string) =>
  jouer(e, { type: 'envoyer', eleveId: idRang(e, e.courant, role), cible });

const courRonde = () =>
  courTest({
    regions: [
      { id: 'haut', nom: 'Haut', ilots: ['S', 'X'], bonsPoints: 1 },
      { id: 'cote', nom: 'Côté', ilots: ['Y', 'Z'], bonsPoints: 1 },
    ],
    ronde: ['haut', 'cote'],
  });

describe('DF.40 — Pouvoirs appliqués sans demande', () => {
  it('la Populaire pioche tout de suite et le tour passe', () => {
    const e = envoyer(auto(situation({ rang: { rouge: ['populaire'] } })), 'populaire', 'P');
    expect(e.attente).toBeNull();
    expect(e.joueurs.rouge.rang).toHaveLength(3);
    expect(e.courant).toBe('bleu');
  });

  it('le Contagieux éternue tout de suite', () => {
    const e = envoyer(
      auto(situation({ rang: { rouge: ['contagieux'], bleu: ['grand', 'petit'] } })),
      'contagieux',
      'P',
    );
    expect(e.attente).toBeNull();
    expect(e.joueurs.bleu.infirmerie).toHaveLength(1);
  });

  it('la Rapporteuse punit seule son unique cible, et demande s’il y en a deux', () => {
    const une = envoyer(
      auto(
        situation({
          rang: { rouge: ['rapporteuse'] },
          piles: { P: [['rouge', 'grand']], Q: [['bleu', 'grand']] },
        }),
      ),
      'rapporteuse',
      'L',
    );
    expect(une.attente).toBeNull();
    expect(pile(une, 'Q')).toEqual([]);
    const deux = envoyer(
      auto(
        situation({
          rang: { rouge: ['rapporteuse'] },
          piles: { P: [['rouge', 'grand']], D: [['bleu', 'grand']], S: [['bleu', 'grand']] },
        }),
      ),
      'rapporteuse',
      'Q',
    );
    expect(deux.attente?.options).toHaveLength(2);
  });

  it('le Délégué demande toujours : on peut garder le mot d’excuse', () => {
    const e = envoyer(
      auto(situation({ cour: courRonde(), rang: { rouge: ['delegue'] } })),
      'delegue',
      'P',
    );
    expect(e.attente?.options.every((o) => o.type === 'surveillante')).toBe(true);
    expect(e.attente?.options.length).toBeGreaterThan(0);
  });

  it('le Chouchou demande quand il y a plusieurs poses possibles', () => {
    const e = envoyer(auto(situation({ rang: { rouge: ['chouchou', 'grand'] } })), 'chouchou', 'P');
    expect(e.attente?.options.length).toBeGreaterThan(1);
  });

  it('deux élèves identiques au même endroit reviennent au même choix', () => {
    const e = situation({ rang: { rouge: ['grand', 'grand', 'delegue'] } });
    const [a, b, c] = e.joueurs.rouge.rang.map((el) => el.id) as [string, string, string];
    const effet = { type: 'pouvoir', role: 'chouchou', ilot: 'P', eleveId: 'x' } as const;
    const poser = (eleveId: string, cible: string) => ({ type: 'poser', eleveId, cible }) as const;
    expect(choixUnique(e, effet, [poser(a, 'Q'), poser(b, 'Q')])).toBe(true);
    expect(choixUnique(e, effet, [poser(a, 'Q'), poser(b, 'L')])).toBe(false);
    expect(choixUnique(e, effet, [poser(a, 'Q'), poser(c, 'Q')])).toBe(false);
  });

  it('sans l’option, la règle stricte garde la demande', () => {
    const e = envoyer(situation({ rang: { rouge: ['populaire'] } }), 'populaire', 'P');
    expect(e.attente?.options).toEqual([{ type: 'piocher' }]);
  });
});
