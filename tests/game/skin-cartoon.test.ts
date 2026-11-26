import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/engine/index';
import { svgCorps, svgPortrait, svgTete } from '../../src/game/skins/cartoon/eleves';
import { alea, lisse } from '../../src/game/skins/trace';

const VALEUR = { petit: 'J' } as Record<string, string>;

describe('Skin Cartoon', () => {
  it('dessine les 8 rôles dans les deux bandes, avec leur numéro sur la chasuble', () => {
    for (const { id, valeur } of ROLES) {
      for (const b of ['rouge', 'bleu'] as const) {
        const svg = svgPortrait(id, b);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain(`>${VALEUR[id] ?? String(valeur)}</text>`);
        expect(svg).not.toContain('NaN');
        expect(svgCorps(id, b)).not.toContain('NaN');
      }
      expect(svgTete(id)).not.toContain('NaN');
    }
  });

  it('donne un dessin différent à chaque rôle', () => {
    const tetes = new Set(ROLES.map((r) => svgTete(r.id)));
    expect(tetes.size).toBe(ROLES.length);
  });

  it('distingue les bandes sans la couleur : pastille ronde ou carrée', () => {
    expect(svgCorps('grand', 'rouge')).not.toEqual(svgCorps('grand', 'bleu'));
  });

  it('dessine toujours pareil (trait tremblé mais reproductible)', () => {
    expect(svgPortrait('fouine', 'bleu')).toEqual(svgPortrait('fouine', 'bleu'));
    const a = alea(5);
    const b = alea(5);
    expect(a()).toEqual(b());
    expect(
      lisse(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        true,
      ),
    ).toMatch(/Z$/);
  });
});
