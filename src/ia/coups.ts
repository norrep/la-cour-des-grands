import { actionsLegales, jouer, pouvoirFacultatif } from '../engine/partie';
import type { Action, EtatPartie, Option } from '../engine/types';

/** Un tour complet : les actions jouées à la suite et l'état obtenu (au tour adverse, ou fini). */
export interface Coup {
  actions: Action[];
  etat: EtatPartie;
}

/**
 * Règle d'écran (DF.8, DF.9) : « Passer » n'est proposé que pour le mot d'excuse du Délégué.
 * L'IA s'y tient, pour ne rien pouvoir faire qu'un joueur humain ne peut pas faire.
 */
export function passerPermis(e: EtatPartie): boolean {
  const a = e.attente;
  if (!a) return false;
  if (pouvoirFacultatif(a.effet)) return true;
  // Filet de sécurité de l'écran : aucun choix possible sauf passer.
  return a.options.length === 0;
}

function roleDe(e: EtatPartie, eleveId: string): string {
  const j = e.joueurs[e.courant];
  return (
    j.rang.find((el) => el.id === eleveId)?.role ??
    j.cpe.find((el) => el.id === eleveId)?.role ??
    eleveId
  );
}

function cleOption(e: EtatPartie, o: Option): string {
  switch (o.type) {
    case 'poser':
      return `poser:${roleDe(e, o.eleveId)}:${o.cible}`;
    case 'repecher':
      return `repecher:${roleDe(e, o.eleveId)}`;
    case 'cpe':
    case 'rappeler':
      return `${o.type}:${o.ilot}`;
    case 'glisser':
      return `glisser:${o.depart}:${o.arrivee}`;
    case 'surveillante':
      return `surveillante:${o.position}`;
    case 'echanger':
      return `echanger:${o.ilot}`;
    default:
      return o.type;
  }
}

/** Clé d'équivalence : deux élèves du même rôle posés au même endroit donnent le même coup. */
export function cleAction(e: EtatPartie, a: Action): string {
  switch (a.type) {
    case 'envoyer':
      return `envoyer:${roleDe(e, a.eleveId)}:${a.cible}`;
    case 'choisir':
      return cleOption(e, a.option);
    default:
      return a.type;
  }
}

/** Actions légales pour l'IA : sans doublons d'élèves identiques, « Passer » selon l'écran. */
export function actionsIA(e: EtatPartie): Action[] {
  const vues = new Set<string>();
  const res: Action[] = [];
  for (const a of actionsLegales(e)) {
    if (a.type === 'passer' && !passerPermis(e)) continue;
    const cle = cleAction(e, a);
    if (vues.has(cle)) continue;
    vues.add(cle);
    res.push(a);
  }
  // Ne jamais rester sans action : si l'écran n'offrait rien, on garde ce que le moteur permet.
  return res.length > 0 ? res : actionsLegales(e).slice(0, 1);
}

/**
 * Énumère tous les tours complets possibles du joueur courant, depuis l'état donné (qui peut
 * déjà être au milieu d'un coup, en attente d'un choix). `limite` borne le nombre de tours.
 */
export function coupsDuTour(depart: EtatPartie, limite = 600): Coup[] {
  const bande = depart.courant;
  const tour = depart.tour;
  const res: Coup[] = [];
  const explorer = (e: EtatPartie, actions: Action[]) => {
    if (res.length >= limite) return;
    if (e.fin || e.courant !== bande || e.tour !== tour) {
      res.push({ actions, etat: e });
      return;
    }
    for (const a of actionsIA(e)) {
      explorer(jouer(e, a), [...actions, a]);
      if (res.length >= limite) return;
    }
  };
  explorer(depart, []);
  return res;
}
