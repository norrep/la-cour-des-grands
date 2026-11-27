/**
 * Sons du jeu. Chaque son a son emplacement : un fichier pourra être branché plus tard dans
 * `FICHIERS_SONS`. En attendant, un petit bruitage synthétisé (provisoire) le remplace.
 */
export type SonId =
  | 'bouton'
  | 'prise'
  | 'pose'
  | 'plaque'
  | 'gouter'
  | 'pioche'
  | 'glissade'
  | 'cpe'
  | 'infirmerie'
  | 'grandsFreres'
  | 'sonnerie'
  | 'victoire'
  | 'sifflet'
  | 'pendule'
  | 'passe';

/** Fichiers audio définitifs (vides pour l'instant). */
export const FICHIERS_SONS: Partial<Record<SonId, string>> = {};

/** Bruitages provisoires : suites de notes (fréquence en Hz, durée en s), forme d'onde. */
const BRUITAGES: Record<
  SonId,
  { notes: [number, number][]; onde: OscillatorType; volume: number }
> = {
  bouton: { notes: [[660, 0.04]], onde: 'triangle', volume: 0.12 },
  prise: {
    notes: [
      [420, 0.05],
      [560, 0.06],
    ],
    onde: 'triangle',
    volume: 0.15,
  },
  pose: {
    notes: [
      [300, 0.05],
      [220, 0.08],
    ],
    onde: 'sine',
    volume: 0.3,
  },
  plaque: {
    notes: [
      [140, 0.06],
      [90, 0.14],
    ],
    onde: 'square',
    volume: 0.18,
  },
  gouter: {
    notes: [
      [660, 0.07],
      [880, 0.07],
      [1320, 0.12],
    ],
    onde: 'triangle',
    volume: 0.18,
  },
  pioche: {
    notes: [
      [500, 0.05],
      [620, 0.05],
    ],
    onde: 'triangle',
    volume: 0.12,
  },
  glissade: {
    notes: [
      [900, 0.06],
      [700, 0.06],
      [500, 0.06],
      [350, 0.08],
    ],
    onde: 'sine',
    volume: 0.2,
  },
  cpe: {
    notes: [
      [392, 0.12],
      [330, 0.12],
      [262, 0.2],
    ],
    onde: 'square',
    volume: 0.1,
  },
  infirmerie: {
    notes: [
      [880, 0.08],
      [0, 0.04],
      [880, 0.08],
    ],
    onde: 'sine',
    volume: 0.15,
  },
  grandsFreres: {
    notes: [
      [262, 0.08],
      [330, 0.08],
      [392, 0.14],
    ],
    onde: 'square',
    volume: 0.1,
  },
  sonnerie: {
    notes: [
      [1200, 0.08],
      [1000, 0.08],
      [1200, 0.08],
      [1000, 0.08],
      [1200, 0.2],
    ],
    onde: 'square',
    volume: 0.08,
  },
  victoire: {
    notes: [
      [523, 0.1],
      [659, 0.1],
      [784, 0.1],
      [1047, 0.25],
    ],
    onde: 'triangle',
    volume: 0.2,
  },
  sifflet: {
    notes: [
      [1500, 0.12],
      [0, 0.06],
      [1500, 0.2],
    ],
    onde: 'square',
    volume: 0.06,
  },
  pendule: { notes: [[1800, 0.03]], onde: 'square', volume: 0.06 },
  passe: {
    notes: [
      [523, 0.08],
      [784, 0.14],
    ],
    onde: 'triangle',
    volume: 0.12,
  },
};

let contexte: AudioContext | null = null;
let actifs = true;

export function activerSons(oui: boolean): void {
  actifs = oui;
}

/** Durée totale d'un bruitage provisoire, en secondes. */
export function dureeBruitage(id: SonId): number {
  return BRUITAGES[id].notes.reduce((t, [, d]) => t + d, 0);
}

/** Joue un son. Ne fait rien (sans erreur) si le son est coupé ou si l'audio est indisponible. */
export function jouerSon(id: SonId): void {
  if (!actifs) return;
  try {
    const fichier = FICHIERS_SONS[id];
    if (fichier) {
      void new Audio(fichier).play().catch(() => undefined);
      return;
    }
    const Ctx =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    contexte ??= new Ctx();
    if (contexte.state === 'suspended') void contexte.resume();
    const b = BRUITAGES[id];
    let t = contexte.currentTime;
    for (const [freq, duree] of b.notes) {
      if (freq > 0) {
        const osc = contexte.createOscillator();
        const gain = contexte.createGain();
        osc.type = b.onde;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(b.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duree);
        osc.connect(gain).connect(contexte.destination);
        osc.start(t);
        osc.stop(t + duree);
      }
      t += duree;
    }
  } catch {
    // Audio indisponible : le jeu continue en silence.
  }
}
