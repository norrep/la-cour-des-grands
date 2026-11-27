import Phaser from 'phaser';
import { COULEURS } from '../config';

/** Mélange une couleur avec du blanc (`t` = part de blanc, de 0 à 1). */
function eclaircir(couleur: number, t: number): number {
  const c = Phaser.Display.Color.IntegerToColor(couleur);
  const m = (v: number): number => Math.round(v + (255 - v) * t);
  return Phaser.Display.Color.GetColor(m(c.red), m(c.green), m(c.blue));
}

/**
 * Fond manga animé, dessiné en code (DV.3) : éclats qui tournent lentement à la couleur de la
 * bande, trame de points qui grossit vers les bords, et lignes de vitesse qui convergent vers
 * le centre en scintillant. Le même fond va avec toutes les cartes : rien à générer par lieu.
 * Tout s'arrête quand le conteneur est détruit.
 */
export function fondManga(
  scene: Phaser.Scene,
  zone: { x: number; y: number; w: number; h: number },
  centre: { x: number; y: number },
  couleur: number,
): Phaser.GameObjects.Container {
  const rayon = Math.hypot(zone.w, zone.h);
  const base = scene.add.rectangle(zone.x, zone.y, zone.w, zone.h, eclaircir(couleur, 0.55));
  base.setOrigin(0, 0);

  // Éclats : rayons alternés, plus clairs et plus soutenus.
  const eclats = scene.add.graphics({ x: centre.x, y: centre.y });
  const n = 22;
  eclats.fillStyle(eclaircir(couleur, 0.25), 1);
  for (let i = 0; i < n; i += 2) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    eclats.fillTriangle(
      0,
      0,
      Math.cos(a) * rayon,
      Math.sin(a) * rayon,
      Math.cos(b) * rayon,
      Math.sin(b) * rayon,
    );
  }

  // Trame : des points qui grossissent en s'éloignant du centre.
  const trame = scene.add.graphics();
  trame.fillStyle(COULEURS.encre, 0.13);
  const pas = 26;
  for (let y = zone.y; y < zone.y + zone.h + pas; y += pas) {
    const decale = (Math.round((y - zone.y) / pas) % 2) * (pas / 2);
    for (let x = zone.x + decale; x < zone.x + zone.w + pas; x += pas) {
      const d = Math.hypot(x - centre.x, y - centre.y) / (rayon * 0.5);
      const r = Math.min(1, Math.max(0, d - 0.35)) * 7;
      if (r > 0.6) trame.fillCircle(x, y, r);
    }
  }

  // Lignes de vitesse : fines pointes noires qui partent des bords, redessinées en boucle.
  const vitesse = scene.add.graphics({ x: centre.x, y: centre.y });
  const dessinerLignes = (): void => {
    vitesse.clear();
    vitesse.fillStyle(COULEURS.encre, 0.85);
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const debut = 380 + Math.random() * 260;
      const largeur = 0.004 + Math.random() * 0.012;
      vitesse.fillTriangle(
        Math.cos(a) * debut,
        Math.sin(a) * debut,
        Math.cos(a - largeur) * rayon,
        Math.sin(a - largeur) * rayon,
        Math.cos(a + largeur) * rayon,
        Math.sin(a + largeur) * rayon,
      );
    }
  };
  dessinerLignes();

  const conteneur = scene.add.container(0, 0, [base, eclats, trame, vitesse]);
  const boucle = scene.time.addEvent({ delay: 90, loop: true, callback: dessinerLignes });
  const tour = scene.tweens.add({
    targets: eclats,
    angle: 360 / n,
    duration: 1400,
    repeat: -1,
  });
  // Petite pulsation, comme un battement d'effet.
  const pouls = scene.tweens.add({
    targets: eclats,
    scale: { from: 1, to: 1.08 },
    duration: 300,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  conteneur.once(Phaser.GameObjects.Events.DESTROY, () => {
    boucle.remove();
    tour.remove();
    pouls.remove();
  });
  return conteneur;
}

/** Cadre de case de manga (bord blanc, puis trait d'encre) autour d'un rectangle centré. */
export function cadreManga(
  scene: Phaser.Scene,
  x: number,
  y: number,
  cote: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  g.lineStyle(26, COULEURS.encre, 1);
  g.strokeRect(-cote / 2 - 13, -cote / 2 - 13, cote + 26, cote + 26);
  g.lineStyle(14, 0xffffff, 1);
  g.strokeRect(-cote / 2 - 7, -cote / 2 - 7, cote + 14, cote + 14);
  return g;
}
