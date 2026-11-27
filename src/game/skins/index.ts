/**
 * Le skin actif et le catalogue des skins. Changer de skin ne demande que d'appeler
 * `choisirSkin` puis `preparerSkin` : aucune règle du jeu n'en dépend.
 */
import type Phaser from 'phaser';
import { lireSkin, ecrireSkin } from '../preferences';
import { SKIN_CARTOON } from './cartoon/index';
import { SKIN_CLASSIQUE } from './classique';
import type { Skin, SkinId, TextureSkin } from './types';
import type { EquipeId } from '../../data/equipes';
import { avecVersion } from '../../version';

export type { Skin, SkinId } from './types';

const SKINS: Record<SkinId, Skin> = {
  cartoon: SKIN_CARTOON,
  classique: SKIN_CLASSIQUE,
};

/** L'ordre dans lequel le bouton de l'accueil fait défiler les skins. */
export const ORDRE_SKINS: readonly SkinId[] = ['cartoon', 'classique'];
export const SKIN_PAR_DEFAUT: SkinId = 'cartoon';

const estSkin = (id: string | null): id is SkinId => id !== null && id in SKINS;

let actif: SkinId = SKIN_PAR_DEFAUT;
let lu = false;

export function skinActif(): Skin {
  if (!lu) {
    lu = true;
    const pref = lireSkin();
    if (estSkin(pref)) actif = pref;
  }
  return SKINS[actif];
}

export function choisirSkin(id: SkinId): void {
  lu = true;
  actif = id;
  ecrireSkin(id);
}

export function skinSuivant(id: SkinId): SkinId {
  const i = ORDRE_SKINS.indexOf(id);
  return ORDRE_SKINS[(i + 1) % ORDRE_SKINS.length] ?? SKIN_PAR_DEFAUT;
}

function chargerImage(scene: Phaser.Scene, t: TextureSkin): Promise<void> {
  if (scene.textures.exists(t.cle)) return Promise.resolve();
  const source = t.svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t.svg)}`
    : t.url && avecVersion(t.url);
  if (!source) return Promise.resolve();
  return new Promise((ok, echec) => {
    const img = new Image();
    img.onload = () => {
      if (!scene.textures.exists(t.cle)) scene.textures.addImage(t.cle, img);
      ok();
    };
    img.onerror = () => echec(new Error(`Image du skin introuvable : ${t.cle}`));
    img.src = source;
  });
}

/** Prépare les images d'un skin (une seule fois par partie). */
export async function preparerSkin(scene: Phaser.Scene, id: SkinId): Promise<void> {
  await Promise.all(SKINS[id].textures().map((t) => chargerImage(scene, t)));
}

/** Charge les élèves des équipes choisies pour la partie (les Rouges et les Bleus le sont déjà). */
export async function preparerEquipes(scene: Phaser.Scene, equipes: EquipeId[]): Promise<void> {
  const skin = skinActif();
  if (!skin.texturesEquipe) return;
  const t = equipes.flatMap((e) => skin.texturesEquipe?.(e) ?? []);
  await Promise.all(t.map((x) => chargerImage(scene, x)));
}
