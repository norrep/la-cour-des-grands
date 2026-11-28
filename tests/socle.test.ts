import { describe, expect, it } from 'vitest';
import { TEXTES } from '../src/data/textes';

describe('socle', () => {
  it('regroupe les textes en français', () => {
    expect(TEXTES.titre).toBe('La Cour des Grands');
    expect(Object.keys(TEXTES.roles)).toHaveLength(10);
  });
});
