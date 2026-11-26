import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/engine/index';
import { MESURES } from '../../src/game/skins/cartoon/mesures';

const BANDES = ['rouge', 'bleu'] as const;

describe('Skin Cartoon', () => {
  it('a une image et des mesures pour chaque rôle dans les deux bandes', () => {
    for (const { id } of ROLES) {
      for (const b of BANDES) {
        const nom = `${b}-${id}`;
        const fichier = `public/skins/dessin/${nom}.png`;
        expect(existsSync(fichier), fichier).toBe(true);
        const m = MESURES[nom];
        expect(m, nom).toBeDefined();
        if (!m) continue;
        // Largeur et hauteur relevées = celles du PNG (en-tête IHDR).
        const png = readFileSync(fichier);
        expect(png.readUInt32BE(16)).toBe(m.largeur);
        expect(png.readUInt32BE(20)).toBe(m.hauteur);
        expect(m.main.x).toBeGreaterThanOrEqual(0);
        expect(m.main.x).toBeLessThan(m.largeur);
        expect(m.main.y).toBeGreaterThan(m.hauteur / 3);
        expect(m.main.y).toBeLessThan(m.hauteur);
        expect(m.peau).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("n'a pas d'image en trop", () => {
    expect(Object.keys(MESURES)).toHaveLength(ROLES.length * BANDES.length);
  });
});
