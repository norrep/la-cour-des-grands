import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TENUES } from '../../src/data/equipes';

const ROLES_VIDEO = [
  'chouchou',
  'rapporteuse',
  'fouine',
  'contagieux',
  'delegue',
  'petit',
  'populaire',
];

describe('Vidéos de pouvoir en style du jeu (DV.8)', () => {
  it('chaque tenue a la vidéo de chaque rôle à pouvoir, chasuble à sa couleur', () => {
    for (const t of Object.keys(TENUES))
      for (const r of ROLES_VIDEO) {
        const f = `public/videos/cartoon/${t}-${r}.mp4`;
        expect(existsSync(f), f).toBe(true);
      }
  });

  it('les quatre goûters ont leur vidéo', () => {
    for (const g of ['chocolat', 'biscuits', 'bonbon', 'sucette'])
      expect(existsSync(`public/videos/cartoon/gouter-${g}.mp4`), g).toBe(true);
  });
});
