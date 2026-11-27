import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { construire, SORTIE } from '../../scripts/construire-arbitre';

describe('Paquet de la fonction serveur', () => {
  it('est à jour avec src/reseau (sinon : npm run serveur:construire)', async () => {
    expect(readFileSync(SORTIE, 'utf8')).toBe(await construire(false));
  });
});
