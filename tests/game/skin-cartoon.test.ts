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
        for (const piece of ['', '-corps', '-pastille']) {
          const f = `public/skins/dessin/${nom}${piece}.png`;
          expect(existsSync(f), f).toBe(true);
          // Textures en puissances de 2 (mipmaps : pas de trait qui scintille une fois réduit).
          const entete = readFileSync(f);
          for (const cote of [entete.readUInt32BE(16), entete.readUInt32BE(20)]) {
            expect(cote & (cote - 1), f).toBe(0);
          }
        }
        const m = MESURES[nom];
        expect(m, nom).toBeDefined();
        if (!m) continue;
        // Le dessin tient dans la texture (calé en haut à gauche).
        const png = readFileSync(fichier);
        expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(m.largeur);
        expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(m.hauteur);
        expect(m.aisselle.y).toBeGreaterThan(m.col);
        expect(m.basBras).toBeGreaterThan(m.aisselle.y);
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
