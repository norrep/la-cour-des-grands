/**
 * Outils de dessin « à la main » pour les skins en SVG : contours un peu tremblés, formes molles.
 * Tout est déterministe (graine) : un même élève est toujours dessiné pareil.
 */
export interface P {
  x: number;
  y: number;
}

/** Petit générateur pseudo-aléatoire reproductible (mulberry32). */
export function alea(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number) => (Math.round(v * 10) / 10).toString();

/** Courbe lisse qui passe par tous les points (Catmull-Rom convertie en Bézier). */
export function lisse(points: readonly P[], fermee: boolean): string {
  const k = points.length;
  if (k < 2) return '';
  const pt = (i: number): P => {
    if (fermee) return points[((i % k) + k) % k] as P;
    return points[Math.max(0, Math.min(k - 1, i))] as P;
  };
  const p0 = pt(0);
  let d = `M${n(p0.x)} ${n(p0.y)}`;
  const fin = fermee ? k : k - 1;
  for (let i = 0; i < fin; i++) {
    const a = pt(i - 1);
    const b = pt(i);
    const c = pt(i + 1);
    const e = pt(i + 2);
    const c1 = { x: b.x + (c.x - a.x) / 6, y: b.y + (c.y - a.y) / 6 };
    const c2 = { x: c.x - (e.x - b.x) / 6, y: c.y - (e.y - b.y) / 6 };
    d += `C${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(c.x)} ${n(c.y)}`;
  }
  return fermee ? `${d}Z` : d;
}

/** Bouge chaque point d'au plus `amp` : le trait n'est jamais parfaitement régulier. */
export function trembler(points: readonly P[], graine: number, amp: number): P[] {
  const r = alea(graine);
  return points.map((p) => ({ x: p.x + (r() - 0.5) * 2 * amp, y: p.y + (r() - 0.5) * 2 * amp }));
}

/** Tache ovale molle, centrée en (cx, cy). `bosse` déforme le bas (>0 : ventre, <0 : poire). */
export function tache(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  graine: number,
  options: { amp?: number; points?: number; bosse?: number } = {},
): string {
  const { amp = 0.05, points = 12, bosse = 0 } = options;
  const r = alea(graine);
  const pts: P[] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * amp;
    const bas = Math.max(0, Math.sin(t));
    pts.push({ x: cx + Math.cos(t) * rx * k * (1 + bosse * bas), y: cy + Math.sin(t) * ry * k });
  }
  return lisse(pts, true);
}

/** Forme fermée qui passe par ces points, avec un léger tremblé. */
export function forme(points: readonly P[], graine: number, amp = 1.2): string {
  return lisse(trembler(points, graine, amp), true);
}

/** Trait ouvert qui passe par ces points, avec un léger tremblé. */
export function trait(points: readonly P[], graine: number, amp = 0.8): string {
  return lisse(trembler(points, graine, amp), false);
}
