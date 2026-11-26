import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/engine/index';
import { RIGS } from '../../src/game/skins/cartoon/rig';

const BANDES = ['rouge', 'bleu'] as const;
const PIECES = ['jambeG', 'jambeD', 'brasG', 'brasD', 'tronc', 'tete'] as const;

describe('Skin Cartoon (marionnettes)', () => {
  it('a une texture et une marionnette pour chaque rôle dans les deux bandes', () => {
    for (const { id } of ROLES) {
      for (const b of BANDES) {
        const nom = `${b}-${id}`;
        const f = `public/skins/dodu/${nom}.png`;
        expect(existsSync(f), f).toBe(true);
        const png = readFileSync(f);
        const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
        // Textures en puissances de 2 (mipmaps : pas de trait qui scintille une fois réduit).
        expect(w & (w - 1), f).toBe(0);
        expect(h & (h - 1), f).toBe(0);
        const r = RIGS[nom];
        expect(r, nom).toBeDefined();
        if (!r) continue;
        for (const p of PIECES) {
          const [x, y, l, ht] = r.pieces[p].cadre;
          // Chaque pièce tient dans la texture, son pivot dans la pièce.
          expect(x + l, `${nom} ${p}`).toBeLessThanOrEqual(w);
          expect(y + ht, `${nom} ${p}`).toBeLessThanOrEqual(h);
          expect(r.pieces[p].pivot[0]).toBeGreaterThanOrEqual(0);
          expect(r.pieces[p].pivot[0]).toBeLessThanOrEqual(l);
        }
        // La tête est au-dessus du tronc, le tronc au-dessus des pieds.
        expect(r.pieces.tete.pos[1]).toBeLessThan(r.pieces.tronc.pos[1]);
        expect(r.pieces.tronc.pos[1]).toBeLessThan(0);
        // Bras gauche à gauche de l'écran, bras droit à droite.
        expect(r.pieces.brasG.pos[0]).toBeLessThan(0);
        expect(r.pieces.brasD.pos[0]).toBeGreaterThan(0);
      }
    }
  });

  it("n'a pas de marionnette en trop", () => {
    expect(Object.keys(RIGS)).toHaveLength(ROLES.length * BANDES.length);
  });
});
