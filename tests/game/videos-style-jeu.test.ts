import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TENUES } from '../../src/data/equipes';
import { bandeSonDe } from '../../src/game/sons';

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

  it('chaque vidéo a sa bande son à côté (DV.9)', () => {
    const videos = readdirSync('public/videos/cartoon').filter((f) => f.endsWith('.mp4'));
    expect(videos.length).toBeGreaterThan(40);
    for (const v of videos) {
      const bande = bandeSonDe(`public/videos/cartoon/${v}`);
      expect(bande.endsWith('.m4a')).toBe(true);
      expect(existsSync(bande), bande).toBe(true);
    }
  });
});
