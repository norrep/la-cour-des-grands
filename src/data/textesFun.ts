/**
 * Les aides « pour rire », montrées une fois le tuto passé : même information que les textes
 * de `textes.ts`, mais sur le ton de la cour de récré. Chaque entrée a plusieurs variantes, tirées
 * selon le tour pour ne pas lire toujours la même phrase. Jamais méchant : on chahute, on ne blesse pas.
 */
import type { Bande, RaisonFin, RoleId } from '../engine/types';
import { TEXTES } from './textes';

const B = (b: Bande) => TEXTES.bandes[b];
const BT = (b: Bande) => TEXTES.bandesTitre[b];
const R = (r: RoleId) => TEXTES.roles[r];
const s = (n: number) => (n > 1 ? 's' : '');
const min = (t: string) => `${t.charAt(0).toLowerCase()}${t.slice(1)}`;

export const FUN = {
  hud: {
    consigneTour: [
      'Qui part au charbon ? Glisse-le, ou :',
      'Un volontaire pour la cour ? Sinon :',
      'Lâche un élève dans la mêlée, ou :',
      'Allez hop, quelqu’un sur le goudron ! Ou :',
    ],
    consigneSansPose: [
      'Embouteillage dans la cour : va chercher du renfort !',
      'Plus une place nulle part… siffle tes copains !',
    ],
    rangVide: [
      'Ton rang est vide comme une trousse en juin : appelle des copains !',
      'Personne ? Siffle fort, les copains vont venir !',
    ],
    toucherCarte: ['Touche un élève : il se vante', 'Touche un élève : il raconte tout'],
  },
  choix: {
    populaire: ['La Populaire claque des doigts : touche ton portail, 2 copains rappliquent.'],
    chouchou: ['« Mes grands frères vont venir ! » Glisse un 5 ou plus (cartes claires).'],
    rapporteuse: ['« Madaaame ! » Touche l’adversaire qui tremble, direction la CPE.'],
    contagieux: ['Atchoum ! Touche le portail d’en face pour refiler le rhume.'],
    delegue: ['Mot d’excuse en main : touche Mme Josiane pour l’éloigner, ou garde-le pour toi.'],
    banc: ['★ Banc : planqué sur le banc, il ne bouge plus d’un poil.'],
    cabanePerchee: ['★ Cabane perchée : touche ton portail, un copain grimpe.'],
    porteVieScolaire: ['★ Vie scolaire : touche le copain à faire sortir de chez la CPE.'],
    buts: ['★ Buts : touche le petit (1 ou 2) à envoyer chez la CPE. Tir cadré !'],
    tobogganDepart: ['★ Toboggan : qui on fait glisser ? Touche-le.'],
    tobogganArrivee: ['★ Toboggan : il atterrit où ? Touche l’îlot.'],
  },
  fiche: {
    glisser: ['Hop, lâche-le sur un îlot jaune.', 'Vise un îlot jaune et lâche tout.'],
    infirmerie: ['Il a le nez qui coule : il reste à l’infirmerie ce tour-ci.'],
    nonJouable: ['Il cherche sa place… rien de libre pour l’instant.'],
    ilotVide: ['Personne ici. Même pas un chewing-gum.', 'Îlot désert. Un pigeon passe.'],
  },
  passe: {
    cache: [
      'Mains sur les yeux : on ne regarde pas le rang d’en face !',
      'Pas de triche : le rang d’en face, c’est top secret.',
    ],
  },
  fin: {
    raison: {
      cabane: 'a envahi la cabane d’en face !',
      bonsPoints: 'a dévalisé le goûter !',
      sonnerie: 'gagne sur le fil, à la sonnerie !',
    } as Record<RaisonFin, string>,
  },
  journal: {
    vide: ['La cloche a sonné : la récré commence !', 'Tout le monde dehors, c’est la récré !'],
    appel: (b: Bande, n: number) => [
      `${BT(b)} siffle : ${n} copain${s(n)} arrive${n > 1 ? 'nt' : ''} en courant.`,
      `${BT(b)} : « Eh, venez ! » ${n} copain${s(n)} rapplique${n > 1 ? 'nt' : ''}.`,
    ],
    pose: (b: Bande, role: RoleId, lieu: string) => [
      `${R(role)} (${B(b)}) file vers ${lieu}.`,
      `${R(role)} (${B(b)}) s’installe sur ${lieu}, l’air de rien.`,
      `${R(role)} (${B(b)}) débarque sur ${lieu}.`,
    ],
    plaque: (role: RoleId) => [
      `Patatras ! ${R(role)} finit à plat ventre.`,
      `${R(role)} se retrouve en dessous. Oups.`,
    ],
    pioche: (b: Bande, n: number) => [
      `${BT(b)} récupère ${n} élève${s(n)} qui traînai${n > 1 ? 'ent' : 't'} dans le couloir.`,
    ],
    cpe: (role: RoleId, b: Bande) => [
      `${R(role)} (${B(b)}) file chez la CPE, oreilles basses.`,
      `Direction le bureau de la CPE pour ${min(R(role))} (${B(b)}).`,
    ],
    infirmerie: (b: Bande) => [
      `Atchoum ! Un élève de la ${B(b)} file à l’infirmerie, mouchoir en main.`,
    ],
    surveillanteDelegue: [
      'Le Délégué agite son mot d’excuse : la surveillante file garder un autre goûter.',
      '« C’est signé par le directeur ! » La surveillante change de goûter.',
    ],
    rappel: (b: Bande) => [`${BT(b)} rappelle un élève : « Reviens, on a besoin de toi ! »`],
    repechage: (b: Bande) => [`${BT(b)} négocie un retour de chez la CPE. Promis, il sera sage.`],
    glissade: (role: RoleId) => [`Wiiiz ! ${R(role)} dévale le toboggan.`],
    passe: (b: Bande) => [`${BT(b)} garde son pouvoir dans sa poche.`],
    region: (b: Bande, nom: string, n: number) => [
      `Miam ! ${BT(b)} ramasse ${min(nom)} : +${n} !`,
      `${BT(b)} rafle ${min(nom)} (+${n}). Il en reste des miettes.`,
    ],
    fin: (b: Bande) => [`Victoire de la ${B(b)} ! Tour d’honneur autour du préau.`],
  },
} as const;

/** Une variante tirée selon `graine` (le même tour donne toujours la même phrase). */
export function variante(liste: readonly string[], graine: number): string {
  const n = liste.length;
  return liste[((Math.floor(graine) % n) + n) % n] as string;
}
