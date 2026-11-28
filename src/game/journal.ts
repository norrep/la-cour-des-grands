import { TEXTES } from '../data/textes';
import { FUN, variante } from '../data/textesFun';
import type { Cour, Evenement } from '../engine/index';

const J = TEXTES.journal;

/**
 * Traduit un événement du moteur en phrase pour le journal (ou `null` s'il ne mérite pas de ligne).
 * `fun` : ton pour rire (tuto passé), avec une variante tirée selon `graine`.
 */
export function phraseEvenement(ev: Evenement, cour: Cour, fun = false, graine = 0): string | null {
  if (fun) return phraseDrole(ev, cour, graine);
  const lieu = (id: string) => nomLieu(cour, id);
  switch (ev.type) {
    case 'appel':
      return J.appel(ev.bande, ev.nombre);
    case 'pose': {
      const base = J.pose(ev.bande, ev.role, lieu(ev.cible));
      return ev.plaque ? `${base} ${J.plaque(ev.plaque)}` : base;
    }
    case 'pioche':
      return J.pioche(ev.bande, ev.nombre);
    case 'cpe':
      return J.cpe(ev.role, ev.bande);
    case 'infirmerie':
      return J.infirmerie(ev.bande);
    case 'surveillante':
      return ev.parDelegue ? J.surveillanteDelegue : null;
    case 'courant':
      return J.courant;
    case 'rappel':
      return J.rappel(ev.bande);
    case 'repechage':
      return J.repechage(ev.bande);
    case 'glissade':
      // Téléportation : une seule ligne, celle du Téléporteur (pas celle du copain échangé).
      if (ev.par === 'teleporteur')
        return ev.role === 'teleporteur' ? J.teleportation(ev.role) : null;
      return ev.par === 'bagarreur' ? J.bousculade(ev.role) : J.glissade(ev.role);
    case 'passe':
      return J.passe(ev.bande);
    case 'region': {
      return J.region(ev.bande, nomGouter(cour, ev.region), ev.bonsPoints);
    }
    case 'fin':
      return J.fin(ev.gagnant);
  }
}

function phraseDrole(ev: Evenement, cour: Cour, g: number): string | null {
  const F = FUN.journal;
  const v = (liste: readonly string[]) => variante(liste, g);
  const lieu = (id: string) => nomLieu(cour, id);
  switch (ev.type) {
    case 'appel':
      return v(F.appel(ev.bande, ev.nombre));
    case 'pose': {
      const base = v(F.pose(ev.bande, ev.role, lieu(ev.cible)));
      return ev.plaque ? `${base} ${v(F.plaque(ev.plaque))}` : base;
    }
    case 'pioche':
      return v(F.pioche(ev.bande, ev.nombre));
    case 'cpe':
      return v(F.cpe(ev.role, ev.bande));
    case 'infirmerie':
      return v(F.infirmerie(ev.bande));
    case 'surveillante':
      return ev.parDelegue ? v(F.surveillanteDelegue) : null;
    case 'courant':
      return v(F.courant);
    case 'rappel':
      return v(F.rappel(ev.bande));
    case 'repechage':
      return v(F.repechage(ev.bande));
    case 'glissade':
      if (ev.par === 'teleporteur')
        return ev.role === 'teleporteur' ? v(F.teleportation(ev.role)) : null;
      return v(ev.par === 'bagarreur' ? F.bousculade(ev.role) : F.glissade(ev.role));
    case 'passe':
      return v(F.passe(ev.bande));
    case 'region':
      return v(F.region(ev.bande, nomGouter(cour, ev.region), ev.bonsPoints));
    case 'fin':
      return v(F.fin(ev.gagnant));
  }
}

/** Nom d'un lieu dans le journal : seuls la cabane et les îlots spéciaux ont un nom affiché. */
function nomLieu(cour: Cour, id: string): string {
  const n = cour.noeuds[id];
  if (n?.type === 'cabane') return J.cabane;
  return n?.equipement ? n.nom : J.ilot;
}

/** Les dernières lignes du journal, de la plus ancienne à la plus récente. */
export function dernieresLignes(
  journal: readonly Evenement[],
  cour: Cour,
  n: number,
  fun = false,
): string[] {
  const lignes: string[] = [];
  for (let i = journal.length - 1; i >= 0 && lignes.length < n; i--) {
    const p = phraseEvenement(journal[i] as Evenement, cour, fun, i);
    if (p) lignes.unshift(p);
  }
  if (lignes.length > 0) return lignes;
  return [fun ? variante(FUN.journal.vide, journal.length) : J.vide];
}

/** Le goûter posé sur une zone à bons points (un par zone, dans l'ordre de la cour). */
export function nomGouter(cour: Cour, regionId: string): string {
  const i = Math.max(
    0,
    cour.regions.findIndex((r) => r.id === regionId),
  );
  return TEXTES.gouters[i % TEXTES.gouters.length] as string;
}
