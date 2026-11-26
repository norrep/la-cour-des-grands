/**
 * Le style « cartoon » de l'interface, accordé aux élèves dessinés : trait noir un peu tremblé,
 * aplats pastel, ombre portée pleine comme un autocollant. Toutes les formes de l'interface
 * (boutons, panneaux, îlots, étiquettes) passent par ici.
 */
import type Phaser from 'phaser';
import { COULEURS } from '../config';

export interface P {
  x: number;
  y: number;
}

/** Petit générateur reproductible : une même forme tremble toujours pareil. */
function alea(graine: number): () => number {
  let a = Math.floor(graine * 9973) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Graine tirée d'une position : deux formes au même endroit tremblent pareil. */
export const graineDe = (x: number, y: number): number => Math.abs(x * 7.3 + y * 3.1) + 1;

/** Contour d'un rectangle arrondi, avec un léger tremblé. */
export function contourRect(
  x: number,
  y: number,
  l: number,
  h: number,
  r: number,
  graine: number,
  amp = 1.3,
): P[] {
  const rnd = alea(graine);
  const pts: P[] = [];
  const rr = Math.min(r, l / 2, h / 2);
  const coins: [number, number, number][] = [
    [x + l - rr, y + rr, -Math.PI / 2],
    [x + l - rr, y + h - rr, 0],
    [x + rr, y + h - rr, Math.PI / 2],
    [x + rr, y + rr, Math.PI],
  ];
  const bord = (a: P, b: P) => {
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 26));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push({
        x: a.x + (b.x - a.x) * t + (rnd() - 0.5) * 2 * amp,
        y: a.y + (b.y - a.y) * t + (rnd() - 0.5) * 2 * amp,
      });
    }
  };
  coins.forEach(([cx, cy, a0], i) => {
    for (let k = 0; k <= 4; k++) {
      const a = a0 + (k / 4) * (Math.PI / 2);
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    const fin = pts[pts.length - 1] as P;
    const [nx, ny, na] = coins[(i + 1) % 4] as [number, number, number];
    bord(fin, { x: nx + Math.cos(na) * rr, y: ny + Math.sin(na) * rr });
  });
  return pts;
}

/** Contour d'un rond un peu mou. */
export function contourRond(x: number, y: number, r: number, graine: number, amp = 0.035): P[] {
  const rnd = alea(graine);
  const n = Math.max(14, Math.round(r / 2.5));
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rnd() - 0.5) * 2 * amp;
    pts.push({ x: x + Math.cos(a) * r * k, y: y + Math.sin(a) * r * k });
  }
  return pts;
}

export interface StyleForme {
  remplissage: number;
  alpha?: number;
  trait?: number;
  couleurTrait?: number;
  /** Décalage de l'ombre pleine (0 : pas d'ombre). */
  ombre?: number;
}

/** Dessine une forme : ombre pleine décalée, aplat, trait noir. */
export function forme(g: Phaser.GameObjects.Graphics, pts: P[], s: StyleForme): void {
  const ombre = s.ombre ?? 0;
  if (ombre > 0) {
    g.fillStyle(COULEURS.encre, 0.85);
    g.fillPoints(
      pts.map((p) => ({ x: p.x + ombre * 0.4, y: p.y + ombre })),
      true,
    );
  }
  g.fillStyle(s.remplissage, s.alpha ?? 1);
  g.fillPoints(pts, true);
  const trait = s.trait ?? 4;
  if (trait > 0) {
    g.lineStyle(trait, s.couleurTrait ?? COULEURS.encre, 1);
    g.strokePoints(pts, true, true);
  }
}

/** Panneau de papier crème au trait noir (fiches, journal, conseils…). */
export function panneau(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  l: number,
  h: number,
  options: Partial<StyleForme> & { rayon?: number } = {},
): void {
  forme(g, contourRect(x, y, l, h, options.rayon ?? 18, graineDe(x, y)), {
    remplissage: COULEURS.papier,
    ombre: 6,
    ...options,
  });
}

/** Style de texte encre sur papier, dans la police ronde du jeu. */
export const ENCRE = COULEURS.texteSombre;
