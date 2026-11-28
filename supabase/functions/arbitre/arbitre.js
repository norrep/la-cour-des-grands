// Généré par scripts/construire-arbitre.ts — ne pas modifier à la main.

// src/reseau/protocole.ts
var Refus = class extends Error {
  constructor(code, message = code) {
    super(message);
    this.code = code;
  }
  code;
};

// src/engine/roles.ts
var ROLES = [
  { id: "petit", valeur: null },
  { id: "populaire", valeur: 1 },
  { id: "chouchou", valeur: 2 },
  { id: "rapporteuse", valeur: 3 },
  { id: "fouine", valeur: 4 },
  { id: "contagieux", valeur: 5 },
  { id: "delegue", valeur: 6 },
  { id: "grand", valeur: 7 }
];
var EXEMPLAIRES_PAR_ROLE = 3;
var TAILLE_RANG = 8;
var ABSENTS_A_L_APPEL = 4;
var RANG_DEPART_PREMIER = 4;
var RANG_DEPART_SECOND = 5;
var PIOCHE_POPULAIRE = 3;
var VALEUR_MIN_CHOUCHOU = 5;
var PAR_ID = Object.fromEntries(
  ROLES.map((r) => [r.id, r])
);
var SIGNATURES = {
  bagarreur: { valeur: 5, remplace: "contagieux" },
  teleporteur: { valeur: 6, remplace: "delegue" }
};
var VALEUR_MAX_BOUSCULE = 4;
function valeur(role) {
  const signature = SIGNATURES[role];
  if (signature) return signature.valeur;
  return PAR_ID[role].valeur;
}
function estJoker(role) {
  return valeur(role) === null;
}

// src/engine/rng.ts
function tirer(etatRng) {
  const suivant = etatRng + 1831565813 >>> 0;
  let t = suivant;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const valeur2 = ((t ^ t >>> 14) >>> 0) / 4294967296;
  return [valeur2, suivant];
}
function tirerEntier(etatRng, n) {
  const [v, s] = tirer(etatRng);
  return [Math.floor(v * n), s];
}
function melanger(liste, etatRng) {
  const resultat = liste.slice();
  let rng = etatRng;
  for (let i = resultat.length - 1; i > 0; i--) {
    const [j, s] = tirerEntier(rng, i + 1);
    rng = s;
    const tmp = resultat[i];
    resultat[i] = resultat[j];
    resultat[j] = tmp;
  }
  return [resultat, rng];
}
function graineVersEtat(graine) {
  return (Math.floor(graine) ^ 2654435769) >>> 0;
}

// src/engine/cour.ts
var EQUIPEMENTS = [
  "banc",
  "cabanePerchee",
  "porteVieScolaire",
  "buts",
  "toboggan",
  "marelle",
  "bancMaitresses"
];
var ErreurCour = class extends Error {
};
function cleAllee(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function chargerCour(data) {
  const erreur = (message) => {
    throw new ErreurCour(`Cour \xAB ${data.id} \xBB : ${message}`);
  };
  const noeuds = {};
  const ajouter = (n) => {
    if (noeuds[n.id]) erreur(`identifiant en double \xAB ${n.id} \xBB`);
    noeuds[n.id] = n;
  };
  const cabanes = { rouge: [], bleu: [] };
  for (const c of data.cabanes) {
    if (c.bande !== "rouge" && c.bande !== "bleu") erreur(`bande inconnue pour \xAB ${c.id} \xBB`);
    ajouter({
      id: c.id,
      type: "cabane",
      nom: c.id,
      x: c.x,
      y: c.y,
      bande: c.bande,
      ...c.valeursAutorisees ? { valeursAutorisees: c.valeursAutorisees } : {}
    });
    cabanes[c.bande].push(c.id);
  }
  if (cabanes.rouge.length === 0 || cabanes.bleu.length === 0) {
    erreur("chaque bande doit avoir au moins une cabane");
  }
  const ilots = [];
  for (const i of data.ilots) {
    if (i.equipement !== void 0 && !EQUIPEMENTS.includes(i.equipement)) {
      erreur(`\xE9quipement inconnu \xAB ${String(i.equipement)} \xBB sur \xAB ${i.id} \xBB`);
    }
    ajouter({
      id: i.id,
      type: "ilot",
      nom: i.nom,
      x: i.x,
      y: i.y,
      ...i.equipement ? { equipement: i.equipement } : {},
      ...i.decor ? { decor: i.decor } : {},
      ...i.valeursAutorisees ? { valeursAutorisees: i.valeursAutorisees } : {}
    });
    ilots.push(i.id);
  }
  const voisins = {};
  for (const id of Object.keys(noeuds)) voisins[id] = [];
  const indexAllee = /* @__PURE__ */ new Map();
  data.allees.forEach(([a, b], index) => {
    if (!noeuds[a] || !noeuds[b]) erreur(`all\xE9e ${a}-${b} : extr\xE9mit\xE9 inconnue`);
    if (a === b) erreur(`all\xE9e ${a}-${b} : boucle sur elle-m\xEAme`);
    const cle = cleAllee(a, b);
    if (indexAllee.has(cle)) erreur(`all\xE9e ${a}-${b} en double`);
    indexAllee.set(cle, index);
    voisins[a]?.push({ noeud: b, allee: index });
    voisins[b]?.push({ noeud: a, allee: index });
  });
  for (const r of data.regions) {
    if (r.ilots.length === 0) erreur(`r\xE9gion \xAB ${r.id} \xBB vide`);
    for (const i of r.ilots) {
      if (noeuds[i]?.type !== "ilot") erreur(`r\xE9gion \xAB ${r.id} \xBB : \xAB ${i} \xBB n'est pas un \xEElot`);
    }
    if (r.bonsPoints <= 0) erreur(`r\xE9gion \xAB ${r.id} \xBB : bons points invalides`);
  }
  const ronde = data.ronde.map((id) => {
    const index = data.regions.findIndex((r) => r.id === id);
    if (index < 0) erreur(`ronde : la r\xE9gion \xAB ${id} \xBB n'existe pas`);
    return index;
  });
  if (!Number.isInteger(data.departRonde) || data.departRonde < 0 || ronde.length > 0 && data.departRonde >= ronde.length) {
    erreur("d\xE9part de la ronde hors limites");
  }
  if (!(data.seuilBonsPoints > 0)) erreur("seuil de bons points invalide");
  const sensUnique = {};
  for (const [de, vers] of data.sensUnique ?? []) {
    const index = indexAllee.get(cleAllee(de, vers));
    if (index === void 0) erreur(`sens unique ${de}\u2192${vers} : all\xE9e inconnue`);
    if (sensUnique[index] !== void 0) erreur(`sens unique ${de}\u2192${vers} en double`);
    sensUnique[index] = de;
  }
  const courant = (data.courant ?? []).slice();
  if (courant.length === 1) erreur("le courant doit compter au moins deux \xEElots");
  for (const id of courant) {
    if (noeuds[id]?.type !== "ilot") erreur(`courant : \xAB ${id} \xBB n'est pas un \xEElot`);
  }
  if (new Set(courant).size !== courant.length) erreur("courant : \xEElot en double");
  return {
    id: data.id,
    nom: data.nom,
    noeuds,
    ilots,
    cabanes,
    allees: data.allees.map(([a, b]) => [a, b]),
    voisins,
    regions: data.regions.map((r) => ({ ...r, ilots: r.ilots.slice() })),
    seuilBonsPoints: data.seuilBonsPoints,
    ronde,
    departRonde: data.departRonde,
    sensUnique,
    courant
  };
}
function alleeOuverte(cour, allee, depuis) {
  const de = cour.sensUnique[allee];
  return de === void 0 || de === depuis;
}
function distancesDepuis(cour, depart) {
  const dist = { [depart]: 0 };
  const file = [depart];
  while (file.length > 0) {
    const n = file.shift();
    const d = dist[n];
    for (const v of cour.voisins[n] ?? []) {
      if (dist[v.noeud] === void 0) {
        dist[v.noeud] = d + 1;
        file.push(v.noeud);
      }
    }
  }
  return dist;
}
function ilotsVoisins(cour, noeud) {
  return (cour.voisins[noeud] ?? []).map((v) => v.noeud).filter((id) => cour.noeuds[id]?.type === "ilot");
}

// src/engine/partie.ts
var ActionIllegale = class extends Error {
};
var BANDES = ["rouge", "bleu"];
function adversaire(bande) {
  return bande === "rouge" ? "bleu" : "rouge";
}
function creerBande(bande, signature) {
  const remplace = signature ? SIGNATURES[signature]?.remplace : void 0;
  const eleves = [];
  for (const r of ROLES) {
    const role = signature && r.id === remplace ? signature : r.id;
    for (let n = 1; n <= EXEMPLAIRES_PAR_ROLE; n++) {
      eleves.push({ id: `${bande}-${role}-${n}`, bande, role });
    }
  }
  return eleves;
}
function creerPartie(cour, options) {
  let rng = graineVersEtat(options.graine);
  const joueurs = {};
  for (const bande of BANDES) {
    const [melange, suivant] = melanger(creerBande(bande, options.signatures?.[bande]), rng);
    rng = suivant;
    joueurs[bande] = {
      absents: melange.slice(0, ABSENTS_A_L_APPEL),
      couloir: melange.slice(ABSENTS_A_L_APPEL),
      rang: [],
      cpe: [],
      infirmerie: [],
      bonsPoints: 0
    };
  }
  let premier;
  if (options.premier) {
    premier = options.premier;
  } else {
    const [i, suivant] = tirerEntier(rng, 2);
    rng = suivant;
    premier = i === 0 ? "rouge" : "bleu";
  }
  const second = adversaire(premier);
  const jp = joueurs[premier];
  const js = joueurs[second];
  jp.rang = jp.couloir.splice(0, RANG_DEPART_PREMIER);
  js.rang = js.couloir.splice(0, RANG_DEPART_SECOND);
  const piles = {};
  for (const id of cour.ilots) piles[id] = [];
  return {
    cour,
    equipements: options.equipements ?? true,
    pouvoirsAuto: options.pouvoirsAuto ?? false,
    rng,
    joueurs,
    piles,
    surveillante: cour.departRonde,
    premier,
    courant: premier,
    tour: 1,
    regionsPrises: {},
    effets: [],
    attente: null,
    fin: null,
    journal: []
  };
}
function clonerEtat(e) {
  const joueurs = {};
  for (const b of BANDES) {
    const j = e.joueurs[b];
    joueurs[b] = {
      couloir: j.couloir.slice(),
      rang: j.rang.slice(),
      cpe: j.cpe.slice(),
      absents: j.absents.slice(),
      infirmerie: j.infirmerie.slice(),
      bonsPoints: j.bonsPoints
    };
  }
  const piles = {};
  for (const [id, pile] of Object.entries(e.piles)) piles[id] = pile.slice();
  return {
    ...e,
    joueurs,
    piles,
    regionsPrises: { ...e.regionsPrises },
    effets: e.effets.slice(),
    journal: e.journal.slice()
  };
}
function sommet(e, ilot) {
  const pile = e.piles[ilot];
  return pile ? pile[pile.length - 1] : void 0;
}
function gouterSurveille(e) {
  const n = e.cour.ronde.length;
  if (n === 0) return null;
  return e.cour.regions[e.cour.ronde[e.surveillante % n]]?.id ?? null;
}
function equipementActif(e, noeud) {
  return e.equipements ? e.cour.noeuds[noeud]?.equipement : void 0;
}
function noeudsConnectes(e, bande) {
  const depart = e.cour.cabanes[bande];
  const traverses = new Set(depart);
  const file = depart.slice();
  const atteints = /* @__PURE__ */ new Set();
  while (file.length > 0) {
    const n = file.shift();
    for (const v of e.cour.voisins[n] ?? []) {
      if (!alleeOuverte(e.cour, v.allee, n)) continue;
      atteints.add(v.noeud);
      if (!traverses.has(v.noeud) && e.cour.noeuds[v.noeud]?.type === "ilot" && sommet(e, v.noeud)?.bande === bande) {
        traverses.add(v.noeud);
        file.push(v.noeud);
      }
    }
  }
  return atteints;
}
function valeurAutorisee(e, noeud, role) {
  if (!e.equipements) return true;
  const n = e.cour.noeuds[noeud];
  if (!n?.valeursAutorisees) return true;
  if (n.type === "ilot" && n.equipement !== "marelle") return true;
  const v = valeur(role);
  return n.valeursAutorisees.includes(v === null ? "joker" : v);
}
function estPlanque(e, ilot) {
  return equipementActif(e, ilot) === "banc" && sommet(e, ilot) !== void 0;
}
function peutRecouvrir(pose, dessous) {
  if (dessous.bande === pose.bande) return true;
  if (estJoker(dessous.role) || estJoker(pose.role)) return true;
  return valeur(pose.role) > valeur(dessous.role);
}
function estJouable(e, bande, eleveId) {
  const j = e.joueurs[bande];
  return j.rang.some((el) => el.id === eleveId) && !j.infirmerie.includes(eleveId);
}
function posePossible(e, bande, eleve2, cible, connectes) {
  const noeud = e.cour.noeuds[cible];
  if (!noeud) return false;
  if (!valeurAutorisee(e, cible, eleve2.role)) return false;
  const relie = () => (connectes ?? noeudsConnectes(e, bande)).has(cible);
  if (noeud.type === "cabane") {
    if (noeud.bande === bande) return false;
    if (estJoker(eleve2.role)) return false;
    return relie();
  }
  const dessus = sommet(e, cible);
  if (dessus && dessus.bande !== bande) {
    if (estPlanque(e, cible)) return false;
    if (dessus.role === "petit") return false;
    if (!peutRecouvrir(eleve2, dessus)) return false;
  }
  if (eleve2.role === "fouine") return true;
  return relie();
}
function nombreAPiocher(j, voulu) {
  return Math.max(0, Math.min(voulu, TAILLE_RANG - j.rang.length, j.couloir.length));
}
function peutAppeler(e, bande) {
  return nombreAPiocher(e.joueurs[bande], 2) > 0;
}
function peutEnvoyer(e, bande) {
  const j = e.joueurs[bande];
  const connectes = noeudsConnectes(e, bande);
  const ids = Object.keys(e.cour.noeuds);
  return j.rang.some(
    (el) => !j.infirmerie.includes(el.id) && ids.some((id) => posePossible(e, bande, el, id, connectes))
  );
}
function optionsEffet(e, effet2) {
  const bande = e.courant;
  const adv = adversaire(bande);
  const moi = e.joueurs[bande];
  const cour = e.cour;
  const adverseVisible = (ilot) => sommet(e, ilot)?.bande === adv && !estPlanque(e, ilot);
  if (effet2.type === "pouvoir") {
    switch (effet2.role) {
      case "populaire":
        return nombreAPiocher(moi, PIOCHE_POPULAIRE) > 0 ? [{ type: "piocher" }] : [];
      case "chouchou": {
        const options = [];
        const connectes = noeudsConnectes(e, bande);
        for (const el of moi.rang) {
          const v = valeur(el.role);
          if (v === null || v < VALEUR_MIN_CHOUCHOU || moi.infirmerie.includes(el.id)) continue;
          for (const cible of Object.keys(cour.noeuds)) {
            if (posePossible(e, bande, el, cible, connectes)) {
              options.push({ type: "poser", eleveId: el.id, cible });
            }
          }
        }
        return options;
      }
      case "rapporteuse":
        return ilotsVoisins(cour, effet2.ilot).filter(adverseVisible).map((ilot) => ({ type: "cpe", ilot }));
      case "contagieux": {
        const j = e.joueurs[adv];
        return j.rang.some((el) => !j.infirmerie.includes(el.id)) ? [{ type: "infirmerie" }] : [];
      }
      case "delegue": {
        if (e.cour.ronde.length <= 1) return [];
        const vus = /* @__PURE__ */ new Set([e.cour.ronde[e.surveillante]]);
        const opts = [];
        e.cour.ronde.forEach((region, position) => {
          if (vus.has(region)) return;
          vus.add(region);
          opts.push({ type: "surveillante", position });
        });
        return opts;
      }
      case "bagarreur": {
        const opts = [];
        for (const depart of ilotsVoisins(cour, effet2.ilot)) {
          if (!adverseVisible(depart)) continue;
          const v = valeur(sommet(e, depart).role);
          if (v === null || v > VALEUR_MAX_BOUSCULE) continue;
          for (const arrivee of ilotsVoisins(cour, depart)) {
            if (arrivee === effet2.ilot || (e.piles[arrivee]?.length ?? 0) > 0) continue;
            opts.push({ type: "glisser", depart, arrivee });
          }
        }
        return opts;
      }
      case "teleporteur":
        if (estPlanque(e, effet2.ilot)) return [];
        return cour.ilots.filter((ilot) => {
          const s = sommet(e, ilot);
          return ilot !== effet2.ilot && s?.bande === bande && s.role !== "petit" && !estPlanque(e, ilot);
        }).map((ilot) => ({ type: "echanger", ilot }));
      case "fouine":
        return effet2.horsChemin && nombreAPiocher(moi, 1) > 0 ? [{ type: "piocher" }] : [];
      default:
        return [];
    }
  }
  switch (effet2.equipement) {
    case "cabanePerchee":
      return nombreAPiocher(moi, 1) > 0 ? [{ type: "piocher" }] : [];
    case "porteVieScolaire":
      if (moi.rang.length >= TAILLE_RANG) return [];
      return moi.cpe.map((el) => ({ type: "repecher", eleveId: el.id }));
    case "buts": {
      const dist = distancesDepuis(cour, effet2.ilot);
      return cour.ilots.filter((ilot) => {
        if (dist[ilot] !== 2 || !adverseVisible(ilot)) return false;
        const v = valeur(sommet(e, ilot).role);
        return v === 1 || v === 2;
      }).map((ilot) => ({ type: "cpe", ilot }));
    }
    case "toboggan": {
      const options = [];
      for (const depart of ilotsVoisins(cour, effet2.ilot)) {
        if (!adverseVisible(depart)) continue;
        for (const arrivee of ilotsVoisins(cour, depart)) {
          if (estPlanque(e, arrivee)) continue;
          options.push({ type: "glisser", depart, arrivee });
        }
      }
      return options;
    }
    default:
      return [];
  }
}
function sourceEffet(effet2) {
  return effet2.type === "pouvoir" ? effet2.role : effet2.equipement;
}
function memeOption(a, b) {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "piocher":
    case "infirmerie":
      return true;
    case "poser":
      return b.type === "poser" && a.eleveId === b.eleveId && a.cible === b.cible;
    case "cpe":
      return b.type === "cpe" && a.ilot === b.ilot;
    case "surveillante":
      return b.type === "surveillante" && a.position === b.position;
    case "rappeler":
      return b.type === "rappeler" && a.ilot === b.ilot;
    case "repecher":
      return b.type === "repecher" && a.eleveId === b.eleveId;
    case "glisser":
      return b.type === "glisser" && a.depart === b.depart && a.arrivee === b.arrivee;
    case "echanger":
      return b.type === "echanger" && a.ilot === b.ilot;
  }
}
function jouer(etat, action) {
  if (etat.fin) throw new ActionIllegale("La partie est termin\xE9e.");
  const e = clonerEtat(etat);
  const bande = e.courant;
  if (e.attente) {
    const attente = e.attente;
    if (action.type === "passer") {
      e.effets.pop();
      e.attente = null;
      noter(e, { type: "passe", tour: e.tour, bande, effet: sourceEffet(attente.effet) });
    } else if (action.type === "choisir") {
      if (!attente.options.some((o) => memeOption(o, action.option))) {
        throw new ActionIllegale("Ce choix n\u2019est pas possible.");
      }
      e.effets.pop();
      e.attente = null;
      appliquerOption(e, attente.effet, action.option);
    } else {
      throw new ActionIllegale("Un choix est attendu pour terminer le coup.");
    }
    resoudre(e);
    return e;
  }
  switch (action.type) {
    case "appeler": {
      const n = nombreAPiocher(e.joueurs[bande], 2);
      if (n === 0) throw new ActionIllegale("Impossible d\u2019appeler des copains.");
      piocher(e, bande, n);
      noter(e, { type: "appel", tour: e.tour, bande, nombre: n });
      finirTour(e);
      return e;
    }
    case "envoyer": {
      if (!estJouable(e, bande, action.eleveId)) {
        throw new ActionIllegale("Cet \xE9l\xE8ve ne peut pas \xEAtre jou\xE9.");
      }
      const eleve2 = e.joueurs[bande].rang.find((el) => el.id === action.eleveId);
      if (!posePossible(e, bande, eleve2, action.cible)) {
        throw new ActionIllegale("Pose impossible \xE0 cet endroit.");
      }
      poser(e, bande, eleve2, action.cible);
      resoudre(e);
      return e;
    }
    default:
      throw new ActionIllegale("Aucun choix n\u2019est attendu.");
  }
}
function noter(e, ev) {
  e.journal.push(ev);
}
function piocher(e, bande, n) {
  const j = e.joueurs[bande];
  j.rang.push(...j.couloir.splice(0, n));
}
function terminer(e, gagnant, raison) {
  if (e.fin) return;
  e.fin = { gagnant, raison };
  e.effets = [];
  e.attente = null;
  noter(e, { type: "fin", tour: e.tour, gagnant, raison });
}
function poser(e, bande, eleve2, cible) {
  const horsChemin = eleve2.role === "fouine" && !noeudsConnectes(e, bande).has(cible);
  const j = e.joueurs[bande];
  j.rang = j.rang.filter((el) => el.id !== eleve2.id);
  const noeud = e.cour.noeuds[cible];
  if (noeud?.type === "cabane") {
    noter(e, { type: "pose", tour: e.tour, bande, eleveId: eleve2.id, role: eleve2.role, cible });
    terminer(e, bande, "cabane");
    return;
  }
  const dessous = sommet(e, cible);
  e.piles[cible].push(eleve2);
  noter(e, {
    type: "pose",
    tour: e.tour,
    bande,
    eleveId: eleve2.id,
    role: eleve2.role,
    cible,
    ...dessous && dessous.bande !== bande ? { plaque: dessous.role } : {}
  });
  verifierRegions(e);
  if (e.fin) return;
  const equipement = equipementActif(e, cible);
  if (equipement && equipement !== "marelle" && equipement !== "bancMaitresses") {
    e.effets.push({ type: "equipement", equipement, ilot: cible, eleveId: eleve2.id });
  }
  if (equipement !== "bancMaitresses") {
    e.effets.push({
      type: "pouvoir",
      role: eleve2.role,
      ilot: cible,
      eleveId: eleve2.id,
      ...horsChemin ? { horsChemin } : {}
    });
  }
}
function envoyerCpe(e, ilot) {
  const eleve2 = e.piles[ilot].pop();
  e.joueurs[eleve2.bande].cpe.push(eleve2);
  noter(e, {
    type: "cpe",
    tour: e.tour,
    bande: eleve2.bande,
    eleveId: eleve2.id,
    role: eleve2.role,
    ilot
  });
}
function appliquerOption(e, effet2, option) {
  const bande = e.courant;
  const moi = e.joueurs[bande];
  const source = sourceEffet(effet2);
  switch (option.type) {
    case "piocher": {
      const n = nombreAPiocher(moi, source === "populaire" ? PIOCHE_POPULAIRE : 1);
      piocher(e, bande, n);
      noter(e, { type: "pioche", tour: e.tour, bande, nombre: n, source });
      break;
    }
    case "poser": {
      const eleve2 = moi.rang.find((el) => el.id === option.eleveId);
      poser(e, bande, eleve2, option.cible);
      break;
    }
    case "cpe":
      envoyerCpe(e, option.ilot);
      verifierRegions(e);
      break;
    case "infirmerie": {
      const adv = e.joueurs[adversaire(bande)];
      const eligibles = adv.rang.filter((el) => !adv.infirmerie.includes(el.id));
      const [i, suivant] = tirerEntier(e.rng, eligibles.length);
      e.rng = suivant;
      const malade = eligibles[i];
      adv.infirmerie.push(malade.id);
      noter(e, { type: "infirmerie", tour: e.tour, bande: malade.bande, eleveId: malade.id });
      break;
    }
    case "surveillante": {
      const n = e.cour.ronde.length;
      deplacerSurveillante(e, ((option.position - e.surveillante) % n + n) % n, true);
      break;
    }
    case "rappeler": {
      const eleve2 = e.piles[option.ilot].pop();
      moi.rang.push(eleve2);
      noter(e, { type: "rappel", tour: e.tour, bande, eleveId: eleve2.id, ilot: option.ilot });
      verifierRegions(e);
      break;
    }
    case "repecher": {
      const eleve2 = moi.cpe.find((el) => el.id === option.eleveId);
      moi.cpe = moi.cpe.filter((el) => el.id !== option.eleveId);
      moi.rang.push(eleve2);
      noter(e, { type: "repechage", tour: e.tour, bande, eleveId: eleve2.id });
      break;
    }
    case "glisser": {
      const eleve2 = e.piles[option.depart].pop();
      e.piles[option.arrivee].push(eleve2);
      noter(e, {
        type: "glissade",
        tour: e.tour,
        eleveId: eleve2.id,
        role: eleve2.role,
        depart: option.depart,
        arrivee: option.arrivee,
        ...source === "bagarreur" ? { par: "bagarreur" } : {}
      });
      verifierRegions(e);
      break;
    }
    case "echanger": {
      const ici = e.piles[effet2.ilot];
      const la = e.piles[option.ilot];
      const teleporteur = ici.pop();
      const copain = la.pop();
      ici.push(copain);
      la.push(teleporteur);
      for (const [el, depart, arrivee] of [
        [teleporteur, effet2.ilot, option.ilot],
        [copain, option.ilot, effet2.ilot]
      ]) {
        noter(e, {
          type: "glissade",
          tour: e.tour,
          eleveId: el.id,
          role: el.role,
          depart,
          arrivee,
          par: "teleporteur"
        });
      }
      verifierRegions(e);
      break;
    }
  }
}
function deplacerSurveillante(e, pas, parDelegue) {
  const n = e.cour.ronde.length;
  if (n === 0) return;
  e.surveillante = ((e.surveillante + pas) % n + n) % n;
  noter(e, { type: "surveillante", tour: e.tour, position: e.surveillante, pas, parDelegue });
  verifierRegions(e);
}
function faireTournerCourant(e) {
  const anneau = e.cour.courant;
  if (anneau.length < 2) return;
  const piles = anneau.map((id) => e.piles[id]);
  anneau.forEach((id, i) => {
    e.piles[id] = piles[(i - 1 + anneau.length) % anneau.length];
  });
  noter(e, { type: "courant", tour: e.tour, anneau: anneau.slice() });
  verifierRegions(e);
}
function verifierRegions(e) {
  for (const bande of [e.courant, adversaire(e.courant)]) {
    const garde = gouterSurveille(e);
    for (const region of e.cour.regions) {
      if (e.regionsPrises[region.id] || region.id === garde) continue;
      if (region.ilots.every((ilot) => sommet(e, ilot)?.bande === bande)) {
        e.regionsPrises[region.id] = bande;
        e.joueurs[bande].bonsPoints += region.bonsPoints;
        noter(e, {
          type: "region",
          tour: e.tour,
          bande,
          region: region.id,
          bonsPoints: region.bonsPoints
        });
      }
    }
  }
  for (const bande of [e.courant, adversaire(e.courant)]) {
    if (e.joueurs[bande].bonsPoints >= e.cour.seuilBonsPoints) {
      terminer(e, bande, "bonsPoints");
      return;
    }
  }
}
function cleOption(e, o) {
  const moi = e.joueurs[e.courant];
  const role = (id) => (moi.rang.find((el) => el.id === id) ?? moi.cpe.find((el) => el.id === id))?.role ?? id;
  switch (o.type) {
    case "poser":
      return `poser:${role(o.eleveId)}:${o.cible}`;
    case "repecher":
      return `repecher:${role(o.eleveId)}`;
    case "cpe":
    case "rappeler":
      return `${o.type}:${o.ilot}`;
    case "glisser":
      return `glisser:${o.depart}:${o.arrivee}`;
    case "echanger":
      return `echanger:${o.ilot}`;
    default:
      return o.type;
  }
}
function pouvoirFacultatif(effet2) {
  return effet2.type === "pouvoir" && (effet2.role === "delegue" || effet2.role === "bagarreur" || effet2.role === "teleporteur");
}
function choixUnique(e, effet2, options) {
  if (pouvoirFacultatif(effet2)) return false;
  const premiere = options[0];
  if (!premiere) return false;
  const cle = cleOption(e, premiere);
  return options.every((o) => cleOption(e, o) === cle);
}
function resoudre(e) {
  while (!e.fin && e.effets.length > 0) {
    const effet2 = e.effets[e.effets.length - 1];
    const options = optionsEffet(e, effet2);
    if (e.pouvoirsAuto && options.length > 0 && choixUnique(e, effet2, options)) {
      e.effets.pop();
      appliquerOption(e, effet2, options[0]);
      continue;
    }
    if (options.length > 0) {
      e.attente = { effet: effet2, options };
      return;
    }
    e.effets.pop();
  }
  if (!e.fin) finirTour(e);
}
function finirTour(e) {
  const bande = e.courant;
  e.joueurs[bande].infirmerie = [];
  if (bande !== e.premier) {
    deplacerSurveillante(e, 1, false);
    if (e.fin) return;
    faireTournerCourant(e);
  }
  if (e.fin) return;
  e.courant = adversaire(bande);
  e.tour += 1;
  const suivant = e.courant;
  if (!peutAppeler(e, suivant) && !peutEnvoyer(e, suivant)) {
    const autre2 = adversaire(suivant);
    const ptsSuivant = e.joueurs[suivant].bonsPoints;
    const ptsAutre = e.joueurs[autre2].bonsPoints;
    if (ptsSuivant !== ptsAutre) {
      terminer(e, ptsSuivant > ptsAutre ? suivant : autre2, "sonnerie");
      return;
    }
    const tenus = (b) => e.cour.ilots.filter((i) => sommet(e, i)?.bande === b).length;
    terminer(e, tenus(suivant) > tenus(autre2) ? suivant : autre2, "sonnerie");
  }
}

// src/reseau/vue.ts
var PREFIXE_CACHE = "?";
function estCache(eleve2) {
  return eleve2.id.startsWith(PREFIXE_CACHE);
}
function caches(bande, lieu, n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${PREFIXE_CACHE}${bande}-${lieu}-${i}`,
    bande,
    role: "petit"
  }));
}
function elevesConnusDuRang(e, bande) {
  const reveles = new Set(e.joueurs[bande].infirmerie);
  for (const ev of e.journal) {
    if ((ev.type === "repechage" || ev.type === "rappel" || ev.type === "infirmerie") && ev.bande === bande) {
      reveles.add(ev.eleveId);
    }
  }
  return reveles;
}
function joueurVu(e, bande, vue) {
  const j = e.joueurs[bande];
  let rang;
  if (bande === vue) {
    rang = j.rang.slice();
  } else {
    const connus = elevesConnusDuRang(e, bande);
    let n = 0;
    rang = j.rang.map(
      (el) => connus.has(el.id) ? el : { id: `${PREFIXE_CACHE}${bande}-rang-${n++}`, bande, role: "petit" }
    );
  }
  return {
    couloir: caches(bande, "couloir", j.couloir.length),
    rang,
    cpe: j.cpe.slice(),
    absents: caches(bande, "absents", j.absents.length),
    infirmerie: j.infirmerie.slice(),
    bonsPoints: j.bonsPoints
  };
}
function masquer(e, vue) {
  const joueurs = {};
  for (const b of BANDES) joueurs[b] = joueurVu(e, b, vue);
  const piles = {};
  for (const [id, pile] of Object.entries(e.piles)) piles[id] = pile.slice();
  let attente = e.attente;
  if (attente && e.courant === adversaire(vue)) attente = { effet: attente.effet, options: [] };
  return {
    ...e,
    rng: 0,
    joueurs,
    piles,
    regionsPrises: { ...e.regionsPrises },
    effets: e.effets.slice(),
    attente,
    journal: e.journal.slice()
  };
}

// src/data/boards/camp-scout.json
var camp_scout_default = {
  id: "camp-scout",
  nom: "Le camp scout",
  cabanes: [
    { id: "CabBleue", bande: "bleu", x: 0.5, y: 0.05 },
    { id: "CabRouge", bande: "rouge", x: 0.5, y: 0.88 }
  ],
  ilots: [
    { id: "A1", nom: "Le hamac", x: 0.28, y: 0.25, decor: "hamac" },
    { id: "A2", nom: "Le tas de bois", x: 0.72, y: 0.25, decor: "tasDeBois" },
    { id: "M1", nom: "La tyrolienne", x: 0.1, y: 0.475, decor: "tyrolienne" },
    { id: "M2", nom: "Le feu de camp", x: 0.5, y: 0.475, decor: "feuDeCamp" },
    { id: "M3", nom: "L\u2019\xE9chelle de corde", x: 0.9, y: 0.475, decor: "echelleDeCorde" },
    { id: "B1", nom: "La source", x: 0.28, y: 0.69, decor: "source" },
    { id: "B2", nom: "Le totem", x: 0.72, y: 0.69, decor: "totem" }
  ],
  allees: [
    ["CabBleue", "A1"],
    ["CabBleue", "A2"],
    ["A1", "A2"],
    ["A1", "M1"],
    ["A1", "M2"],
    ["A2", "M2"],
    ["A2", "M3"],
    ["M1", "B1"],
    ["M2", "B1"],
    ["M2", "B2"],
    ["M3", "B2"],
    ["B1", "B2"],
    ["B1", "CabRouge"],
    ["B2", "CabRouge"]
  ],
  regions: [
    { id: "haut", nom: "Le haut du camp", ilots: ["A1", "A2", "M2"], bonsPoints: 2 },
    { id: "bas", nom: "Le bas du camp", ilots: ["B1", "B2", "M2"], bonsPoints: 2 },
    {
      id: "gauche",
      nom: "Le c\xF4t\xE9 de la tyrolienne",
      ilots: ["A1", "M1", "B1", "M2"],
      bonsPoints: 1
    },
    {
      id: "droite",
      nom: "Le c\xF4t\xE9 de l\u2019\xE9chelle",
      ilots: ["A2", "M3", "B2", "M2"],
      bonsPoints: 1
    }
  ],
  seuilBonsPoints: 3,
  ronde: ["gauche", "haut", "droite", "bas"],
  departRonde: 0,
  sensUnique: [
    ["A1", "M1"],
    ["M1", "B1"],
    ["B2", "M3"],
    ["M3", "A2"]
  ]
};

// src/data/boards/cour-premier-jour.json
var cour_premier_jour_default = {
  id: "cour-premier-jour",
  nom: "La cour du premier jour",
  cabanes: [
    { id: "CabBleue", bande: "bleu", x: 0.5, y: 0.05 },
    { id: "CabRouge", bande: "rouge", x: 0.5, y: 0.88 }
  ],
  ilots: [
    { id: "A1", nom: "Le toboggan", x: 0.28, y: 0.25, decor: "toboggan" },
    { id: "A2", nom: "Les jeux \xE0 ressort", x: 0.72, y: 0.25, decor: "jeuxRessort" },
    { id: "M1", nom: "Le banc", x: 0.1, y: 0.475, equipement: "banc" },
    { id: "M2", nom: "Le bac \xE0 sable", x: 0.5, y: 0.475, decor: "bacASable" },
    { id: "M3", nom: "Le banc", x: 0.9, y: 0.475, equipement: "banc" },
    { id: "B1", nom: "L\u2019arbre", x: 0.28, y: 0.69, decor: "arbre" },
    { id: "B2", nom: "Les buts", x: 0.72, y: 0.69, decor: "buts" }
  ],
  allees: [
    ["CabBleue", "A1"],
    ["CabBleue", "A2"],
    ["A1", "A2"],
    ["A1", "M1"],
    ["A1", "M2"],
    ["A2", "M2"],
    ["A2", "M3"],
    ["M1", "B1"],
    ["M2", "B1"],
    ["M2", "B2"],
    ["M3", "B2"],
    ["B1", "B2"],
    ["B1", "CabRouge"],
    ["B2", "CabRouge"]
  ],
  regions: [
    { id: "haut", nom: "Le haut de la cour", ilots: ["A1", "A2", "M2"], bonsPoints: 2 },
    { id: "bas", nom: "Le bas de la cour", ilots: ["B1", "B2", "M2"], bonsPoints: 2 },
    { id: "gauche", nom: "Le c\xF4t\xE9 gauche", ilots: ["A1", "M1", "B1", "M2"], bonsPoints: 1 },
    { id: "droite", nom: "Le c\xF4t\xE9 droit", ilots: ["A2", "M3", "B2", "M2"], bonsPoints: 1 }
  ],
  seuilBonsPoints: 3,
  ronde: ["gauche", "haut", "droite", "bas"],
  departRonde: 0
};

// src/data/boards/piscine.json
var piscine_default = {
  id: "piscine",
  nom: "La piscine",
  cabanes: [
    {
      id: "CabBleue",
      bande: "bleu",
      x: 0.5,
      y: 0.05
    },
    {
      id: "CabRouge",
      bande: "rouge",
      x: 0.5,
      y: 0.88
    }
  ],
  ilots: [
    {
      id: "H1",
      nom: "Les douches",
      x: 0.2,
      y: 0.22,
      decor: "douches"
    },
    {
      id: "H2",
      nom: "Le plongeoir",
      x: 0.8,
      y: 0.22,
      decor: "plongeoir"
    },
    {
      id: "F1",
      nom: "Le beignet",
      x: 0.27,
      y: 0.4,
      decor: "beignet"
    },
    {
      id: "F2",
      nom: "Le matelas",
      x: 0.73,
      y: 0.4,
      decor: "matelas"
    },
    {
      id: "F3",
      nom: "La bou\xE9e",
      x: 0.73,
      y: 0.58,
      decor: "bouee"
    },
    {
      id: "F4",
      nom: "Le canard",
      x: 0.27,
      y: 0.58,
      decor: "canard"
    },
    {
      id: "B1",
      nom: "L\u2019\xE9chelle",
      x: 0.2,
      y: 0.74,
      decor: "echelle"
    },
    {
      id: "B2",
      nom: "Le bord",
      x: 0.8,
      y: 0.74,
      decor: "bord"
    }
  ],
  allees: [
    ["CabBleue", "H1"],
    ["CabBleue", "H2"],
    ["H1", "H2"],
    ["H1", "F1"],
    ["H2", "F2"],
    ["F1", "F2"],
    ["F2", "F3"],
    ["F3", "F4"],
    ["F4", "F1"],
    ["F4", "B1"],
    ["F3", "B2"],
    ["B1", "B2"],
    ["B1", "CabRouge"],
    ["B2", "CabRouge"]
  ],
  regions: [
    {
      id: "nordOuest",
      nom: "Le coin des douches",
      ilots: ["H1", "F1"],
      bonsPoints: 1
    },
    {
      id: "nordEst",
      nom: "Le coin du plongeoir",
      ilots: ["H2", "F2"],
      bonsPoints: 1
    },
    {
      id: "grandBain",
      nom: "Le grand bain",
      ilots: ["F1", "F2", "F3", "F4"],
      bonsPoints: 2
    },
    {
      id: "sudEst",
      nom: "Le coin du bord",
      ilots: ["B2", "F3"],
      bonsPoints: 1
    },
    {
      id: "sudOuest",
      nom: "Le coin de l\u2019\xE9chelle",
      ilots: ["B1", "F4"],
      bonsPoints: 1
    }
  ],
  seuilBonsPoints: 3,
  ronde: ["nordOuest", "nordEst", "sudEst", "sudOuest"],
  departRonde: 0,
  courant: ["F1", "F4", "F3", "F2"]
};

// src/data/boards/index.ts
var COURS = {
  "cour-premier-jour": cour_premier_jour_default,
  piscine: piscine_default,
  "camp-scout": camp_scout_default
};

// src/data/equipes.ts
var EQUIPES = {
  ecoliers: {
    id: "ecoliers",
    nom: "Les \xC9coliers",
    tenue: "rouges",
    miroir: "bleus",
    signature: "bagarreur"
  },
  // Les Vers gardent leurs 8 rôles : le Fouisseur n'a pas pu être équilibré (DS.4).
  vers: { id: "vers", nom: "Les Vers de terre", tenue: "vers", miroir: "vers2" },
  aliens: {
    id: "aliens",
    nom: "Les Aliens",
    tenue: "aliens",
    miroir: "aliens2",
    signature: "teleporteur"
  }
};
function signaturesPour(c) {
  const s = {};
  for (const b of ["rouge", "bleu"]) {
    const r = EQUIPES[c[b]]?.signature;
    if (r) s[b] = r;
  }
  return s;
}

// src/reseau/arbitre.ts
var DELAI_TOUR_DEFAUT = 120;
var DELAI_TOUR_MIN = 30;
var DELAI_TOUR_MAX = 7 * 24 * 3600;
var cours = /* @__PURE__ */ new Map();
function courDe(carte) {
  let cour = cours.get(carte);
  if (!cour) {
    const data = COURS[carte];
    if (!data) throw new Refus("reglages_invalides", `Carte inconnue : ${carte}`);
    cour = chargerCour(data);
    cours.set(carte, cour);
  }
  return cour;
}
function stocker(e) {
  const { cour, ...reste } = e;
  return { ...reste, courId: cour.id };
}
function restaurer(s) {
  const { courId, ...reste } = s;
  return { ...reste, cour: courDe(courId) };
}
function validerReglages(r) {
  const carte = r.carte ?? "cour-premier-jour";
  courDe(carte);
  const equipes = r.equipes ?? { rouge: "ecoliers", bleu: "ecoliers" };
  for (const b of ["rouge", "bleu"]) {
    if (!(equipes[b] in EQUIPES)) throw new Refus("reglages_invalides", "\xC9quipe inconnue.");
  }
  const delai = r.delaiTour ?? DELAI_TOUR_DEFAUT;
  if (!Number.isFinite(delai) || delai < DELAI_TOUR_MIN || delai > DELAI_TOUR_MAX) {
    throw new Refus("reglages_invalides", "Temps par tour hors limites.");
  }
  return {
    carte,
    equipements: r.equipements ?? true,
    equipes: { rouge: equipes.rouge, bleu: equipes.bleu },
    delaiTour: Math.round(delai)
  };
}
function ouvrirPartie(id, code, hote, reglages, maintenant, nom) {
  return {
    id,
    code,
    reglages: validerReglages(reglages),
    statut: "attente",
    joueurs: { rouge: hote },
    etat: null,
    version: 0,
    issue: null,
    echeance: null,
    creeLe: maintenant,
    majLe: maintenant,
    ...nom ? { noms: { rouge: nom } } : {}
  };
}
function rejoindrePartie(p, invite, graine, maintenant, equipe, nom) {
  if (equipe !== void 0 && !(equipe in EQUIPES)) {
    throw new Refus("reglages_invalides", "\xC9quipe inconnue.");
  }
  if (p.joueurs.rouge === invite || p.joueurs.bleu === invite) {
    throw new Refus("deja_dedans", "Tu es d\xE9j\xE0 dans cette partie.");
  }
  if (p.statut !== "attente" || p.joueurs.bleu) throw new Refus("partie_pleine");
  const reglages = equipe ? { ...p.reglages, equipes: { ...p.reglages.equipes, bleu: equipe } } : p.reglages;
  const etat = creerPartie(courDe(p.reglages.carte), {
    graine,
    equipements: p.reglages.equipements,
    // Comme à l'écran : un pouvoir sans vrai choix s'applique tout seul (DF.40).
    pouvoirsAuto: true,
    // Chaque clan joue avec son rôle signature (DS.1).
    signatures: signaturesPour(reglages.equipes)
  });
  return {
    ...p,
    reglages,
    statut: "en_cours",
    joueurs: { ...p.joueurs, bleu: invite },
    ...nom ? { noms: { ...p.noms, bleu: nom } } : {},
    etat: stocker(etat),
    version: p.version + 1,
    echeance: maintenant + p.reglages.delaiTour * 1e3,
    majLe: maintenant
  };
}
function bandeDe(p, compte) {
  if (p.joueurs.rouge === compte) return "rouge";
  if (p.joueurs.bleu === compte) return "bleu";
  throw new Refus("pas_joueur", "Tu ne joues pas dans cette partie.");
}
function terminer2(p, issue, maintenant) {
  return {
    ...p,
    statut: "finie",
    issue,
    echeance: null,
    version: p.version + 1,
    majLe: maintenant
  };
}
function enCours(p) {
  if (p.statut === "finie") throw new Refus("finie", "La partie est termin\xE9e.");
  if (p.statut !== "en_cours" || !p.etat) throw new Refus("pas_commencee");
  return p.etat;
}
function jouerAction(p, bande, action, version, maintenant) {
  const etat = enCours(p);
  if (version !== p.version) {
    throw new Refus("version_perimee", "La partie a chang\xE9 entre-temps.");
  }
  if (etat.courant !== bande) throw new Refus("pas_ton_tour", "Ce n\u2019est pas ton tour.");
  if (p.echeance !== null && maintenant > p.echeance) {
    throw new Refus("pas_ton_tour", "Ton temps est \xE9coul\xE9.");
  }
  let suivant;
  try {
    suivant = jouer(restaurer(etat), action);
  } catch (err) {
    if (err instanceof ActionIllegale) throw new Refus("coup_illegal", err.message);
    throw err;
  }
  const s = stocker(suivant);
  if (suivant.fin) {
    return terminer2(
      { ...p, etat: s },
      { gagnant: suivant.fin.gagnant, raison: suivant.fin.raison },
      maintenant
    );
  }
  const nouveauTour = suivant.courant !== etat.courant;
  return {
    ...p,
    etat: s,
    version: p.version + 1,
    echeance: nouveauTour ? maintenant + p.reglages.delaiTour * 1e3 : p.echeance,
    majLe: maintenant
  };
}
function traiter(p, compte, demande, maintenant) {
  const bande = bandeDe(p, compte);
  const echue = verifierTemps(p, maintenant);
  if (echue !== p) return echue;
  switch (demande.type) {
    case "jouer":
      return jouerAction(p, bande, demande.action, demande.version, maintenant);
    case "abandonner": {
      if (p.statut === "finie") throw new Refus("finie");
      if (p.statut === "attente") {
        return { ...p, statut: "finie", version: p.version + 1, majLe: maintenant };
      }
      return terminer2(p, { gagnant: adversaire(bande), raison: "abandon" }, maintenant);
    }
    case "reclamer":
      enCours(p);
      throw new Refus("pas_encore", "Le joueur a encore le temps de jouer.");
  }
}
function verifierTemps(p, maintenant) {
  if (p.statut !== "en_cours" || !p.etat || p.echeance === null || maintenant <= p.echeance) {
    return p;
  }
  return terminer2(p, { gagnant: adversaire(p.etat.courant), raison: "temps" }, maintenant);
}
function vuePour(p, compte) {
  const bande = bandeDe(p, compte);
  return {
    id: p.id,
    code: p.code,
    version: p.version,
    reglages: p.reglages,
    statut: p.statut,
    bande,
    adversairePresent: Boolean(p.joueurs[adversaire(bande)]),
    // Une fois la partie finie, tout est montré : chacun peut voir la main de l'autre.
    etat: p.etat ? p.statut === "finie" ? p.etat : masquer(p.etat, bande) : null,
    issue: p.issue,
    echeance: p.echeance,
    adversaire: p.noms?.[adversaire(bande)] ?? null
  };
}

// src/reseau/codes.ts
var ALPHABET_CODE = "ABCDEFGHJKMNPRSTVXYZ";
var LONGUEUR_CODE = 6;
function nouveauCode(hasard) {
  let code = "";
  for (let i = 0; i < LONGUEUR_CODE; i++) {
    code += ALPHABET_CODE[(hasard() >>> 0) % ALPHABET_CODE.length];
  }
  return code;
}
function normaliserCode(saisie) {
  const code = saisie.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== LONGUEUR_CODE) return null;
  for (const c of code) if (!ALPHABET_CODE.includes(c)) return null;
  return code;
}

// src/reseau/amis.ts
var PSEUDO_MIN = 2;
var PSEUDO_MAX = 16;
function validerPseudo(saisie) {
  const propre = String(saisie ?? "").replace(/\p{Cc}/gu, "").trim().replace(/\s+/g, " ");
  const longueur = [...propre].length;
  if (longueur < PSEUDO_MIN || longueur > PSEUDO_MAX) {
    throw new Refus("pseudo_invalide", `Un pseudo de ${PSEUDO_MIN} \xE0 ${PSEUDO_MAX} lettres.`);
  }
  return propre;
}
var DUREE_INVITATION = 24 * 3600 * 1e3;

// src/reseau/client.ts
var SalleMemoire = class {
  constructor(horloge = () => Date.now(), hasard = () => Math.floor(Math.random() * 4294967296)) {
    this.horloge = horloge;
    this.hasard = hasard;
  }
  horloge;
  hasard;
  parties = /* @__PURE__ */ new Map();
  abonnes = /* @__PURE__ */ new Map();
  compteur = 0;
  profils = /* @__PURE__ */ new Map();
  /** compte → ses amis. */
  liens = /* @__PURE__ */ new Map();
  invites = /* @__PURE__ */ new Map();
  guetteurs = /* @__PURE__ */ new Set();
  enregistrer(p) {
    this.parties.set(p.id, p);
    if (p.statut !== "attente" && this.invites.delete(p.id)) this.prevenirInvitations();
    for (const prevenir of this.abonnes.get(p.id) ?? []) prevenir();
  }
  trouver(id) {
    const p = this.parties.get(id);
    if (!p) throw new Refus("partie_introuvable");
    return p;
  }
  prevenirInvitations() {
    for (const g of this.guetteurs) g();
  }
  lier(a, b) {
    if (a === b || !this.profils.has(a) || !this.profils.has(b)) return;
    for (const [x, y] of [
      [a, b],
      [b, a]
    ]) {
      let set = this.liens.get(x);
      if (!set) this.liens.set(x, set = /* @__PURE__ */ new Set());
      set.add(y);
    }
  }
  /** Comme la tâche de fond du serveur : clôt les tours dont le temps est écoulé. */
  verifierTemps() {
    for (const p of this.parties.values()) {
      const q = verifierTemps(p, this.horloge());
      if (q !== p) this.enregistrer(q);
    }
  }
  /** Pour les tests : l'état complet, non masqué. */
  partie(id) {
    return this.trouver(id);
  }
  client(compte) {
    const salle = this;
    return {
      async ouvrir(reglages, ami) {
        if (ami !== void 0 && !salle.liens.get(compte)?.has(ami)) {
          throw new Refus("pas_ami", "Ce joueur n\u2019est pas dans tes amis.");
        }
        let code;
        do
          code = nouveauCode(salle.hasard);
        while ([...salle.parties.values()].some((p2) => p2.code === code && p2.statut === "attente"));
        const moi = salle.profils.get(compte);
        const p = ouvrirPartie(
          `p${++salle.compteur}`,
          code,
          compte,
          reglages,
          salle.horloge(),
          moi?.pseudo
        );
        salle.enregistrer(p);
        if (ami !== void 0 && moi) {
          salle.invites.set(p.id, {
            partieId: p.id,
            code,
            de: compte,
            pseudo: moi.pseudo,
            carte: p.reglages.carte,
            creeLe: salle.horloge(),
            pour: ami
          });
          salle.prevenirInvitations();
        }
        return vuePour(p, compte);
      },
      async rejoindre(saisie, equipe) {
        const code = normaliserCode(saisie);
        const p = [...salle.parties.values()].find(
          (q2) => q2.code === code && q2.statut === "attente"
        );
        if (!p) throw new Refus("partie_introuvable", "Aucune partie n\u2019attend avec ce code.");
        const q = rejoindrePartie(
          p,
          compte,
          salle.hasard(),
          salle.horloge(),
          equipe,
          salle.profils.get(compte)?.pseudo
        );
        salle.enregistrer(q);
        if (q.joueurs.rouge) salle.lier(q.joueurs.rouge, compte);
        return vuePour(q, compte);
      },
      async envoyer(id, demande) {
        const q = traiter(salle.trouver(id), compte, demande, salle.horloge());
        salle.enregistrer(q);
        return vuePour(q, compte);
      },
      async lire(id) {
        return vuePour(salle.trouver(id), compte);
      },
      suivre(id, rappel) {
        const prevenir = () => rappel(vuePour(salle.trouver(id), compte));
        let set = salle.abonnes.get(id);
        if (!set) salle.abonnes.set(id, set = /* @__PURE__ */ new Set());
        set.add(prevenir);
        return () => set.delete(prevenir);
      },
      async mesParties() {
        return [...salle.parties.values()].filter(
          (p) => p.statut !== "finie" && (p.joueurs.rouge === compte || p.joueurs.bleu === compte)
        ).map((p) => vuePour(p, compte));
      },
      async profil() {
        return salle.profils.get(compte) ?? null;
      },
      async nommer(saisie) {
        const pseudo = validerPseudo(saisie);
        const avant = salle.profils.get(compte);
        let codeAmi = avant?.codeAmi;
        while (!codeAmi || [...salle.profils.values()].some((x) => x.id !== compte && x.codeAmi === codeAmi)) {
          codeAmi = nouveauCode(salle.hasard);
        }
        const profil = { id: compte, pseudo, codeAmi };
        salle.profils.set(compte, profil);
        return profil;
      },
      async amis() {
        return [...salle.liens.get(compte) ?? []].map((id) => salle.profils.get(id)).filter((x) => x !== void 0).sort((a, b) => a.pseudo.localeCompare(b.pseudo, "fr"));
      },
      async ajouterAmi(saisie) {
        if (!salle.profils.has(compte))
          throw new Refus("pseudo_invalide", "Choisis d\u2019abord ton pseudo.");
        const code = normaliserCode(saisie);
        const ami = [...salle.profils.values()].find((x) => x.codeAmi === code);
        if (!ami) throw new Refus("ami_introuvable", "Aucun joueur n\u2019a ce code ami.");
        if (ami.id === compte) throw new Refus("soi_meme", "C\u2019est ton propre code !");
        salle.lier(compte, ami.id);
        return ami;
      },
      async invitations() {
        const limite = salle.horloge() - DUREE_INVITATION;
        return [...salle.invites.values()].filter((i) => i.pour === compte && i.creeLe >= limite).map((i) => ({
          partieId: i.partieId,
          code: i.code,
          de: i.de,
          pseudo: i.pseudo,
          carte: i.carte,
          creeLe: i.creeLe
        }));
      },
      suivreInvitations(rappel) {
        salle.guetteurs.add(rappel);
        return () => salle.guetteurs.delete(rappel);
      }
    };
  }
};

// src/reseau/miroir.ts
var CourAsymetrique = class extends Error {
};
var autre = (b) => b === "rouge" ? "bleu" : "rouge";
var caches2 = /* @__PURE__ */ new Map();
function miroirDe(cour) {
  const deja = caches2.get(cour.id);
  if (deja) return deja;
  const ids = Object.keys(cour.noeuds);
  const sigma = {};
  for (const id of ids) {
    const n2 = cour.noeuds[id];
    if (!n2) continue;
    let meilleur = id;
    let dMin = Infinity;
    for (const autreId of ids) {
      const m = cour.noeuds[autreId];
      if (!m) continue;
      const d = Math.hypot(1 - n2.x - m.x, 1 - n2.y - m.y);
      if (d < dMin) {
        dMin = d;
        meilleur = autreId;
      }
    }
    sigma[id] = meilleur;
  }
  const s = (id) => {
    const r = sigma[id];
    if (r === void 0) throw new CourAsymetrique(`${cour.id} : n\u0153ud inconnu ${id}`);
    return r;
  };
  const verifier = (ok, quoi) => {
    if (!ok) throw new CourAsymetrique(`${cour.id} : pas sym\xE9trique (${quoi})`);
  };
  for (const id of ids) {
    const n2 = cour.noeuds[id];
    const m = cour.noeuds[s(id)];
    verifier(s(s(id)) === id, `r\xE9ciproque ${id}`);
    verifier(n2?.type === m?.type && n2?.equipement === m?.equipement, `nature de ${id}`);
    if (n2?.bande) verifier(m?.bande === autre(n2.bande), `cabane ${id}`);
  }
  const cleAllee2 = (a, b) => [a, b].sort().join("|");
  const allees = new Set(cour.allees.map(([a, b]) => cleAllee2(a, b)));
  for (const [a, b] of cour.allees) verifier(allees.has(cleAllee2(s(a), s(b))), `all\xE9e ${a}-${b}`);
  for (const [i, depuis] of Object.entries(cour.sensUnique)) {
    const [a, b] = cour.allees[Number(i)] ?? ["", ""];
    const vers = depuis === a ? b : a;
    const j = cour.allees.findIndex(([x, y]) => cleAllee2(x, y) === cleAllee2(s(a), s(b)));
    verifier(cour.sensUnique[j] === s(depuis) && vers !== "", `sens unique ${a}-${b}`);
  }
  const regionDe = /* @__PURE__ */ new Map();
  const cleIlots = (ilots) => [...ilots].sort().join(",");
  for (const r of cour.regions) {
    const image = cleIlots(r.ilots.map(s));
    const cible = cour.regions.find((q) => cleIlots(q.ilots) === image);
    verifier(cible !== void 0 && cible.bonsPoints === r.bonsPoints, `r\xE9gion ${r.id}`);
    regionDe.set(r.id, cible.id);
  }
  const indexRegion = (id) => cour.regions.findIndex((r) => r.id === id);
  const n = cour.ronde.length;
  const rondeDe = cour.ronde.map((ri) => {
    const r = cour.regions[ri];
    const image = r ? indexRegion(regionDe.get(r.id) ?? "") : -1;
    return cour.ronde.indexOf(image);
  });
  const decalage = n > 0 ? ((rondeDe[0] ?? 0) + n) % n : 0;
  rondeDe.forEach((j, i) => verifier(j === (i + decalage) % n, "ronde"));
  const k = cour.courant.length;
  if (k > 0) {
    const d = cour.courant.indexOf(s(cour.courant[0] ?? ""));
    cour.courant.forEach((id, i) => verifier(cour.courant[(i + d) % k] === s(id), "courant"));
  }
  const miroir = {
    noeud: s,
    region: (id) => regionDe.get(id) ?? id,
    ronde: (i) => n > 0 ? (i + decalage) % n : i,
    anneau: (liste) => {
      const image = liste.map(s);
      const debut = image.indexOf(cour.courant[0] ?? "");
      return debut <= 0 ? image : [...image.slice(debut), ...image.slice(0, debut)];
    }
  };
  caches2.set(cour.id, miroir);
  return miroir;
}
function idEleve(id) {
  return id.replace(/^(\??)(rouge|bleu)/, (_, q, b) => `${q}${autre(b)}`);
}
function eleve(e) {
  return { id: idEleve(e.id), bande: autre(e.bande), role: e.role };
}
function joueur(j) {
  return {
    couloir: j.couloir.map(eleve),
    rang: j.rang.map(eleve),
    cpe: j.cpe.map(eleve),
    absents: j.absents.map(eleve),
    infirmerie: j.infirmerie.map(idEleve),
    bonsPoints: j.bonsPoints
  };
}
function effet(e, m) {
  return { ...e, ilot: m.noeud(e.ilot), eleveId: idEleve(e.eleveId) };
}
function retournerOption(o, m) {
  switch (o.type) {
    case "poser":
      return { type: "poser", eleveId: idEleve(o.eleveId), cible: m.noeud(o.cible) };
    case "cpe":
      return { type: "cpe", ilot: m.noeud(o.ilot) };
    case "rappeler":
      return { type: "rappeler", ilot: m.noeud(o.ilot) };
    case "repecher":
      return { type: "repecher", eleveId: idEleve(o.eleveId) };
    case "glisser":
      return { type: "glisser", depart: m.noeud(o.depart), arrivee: m.noeud(o.arrivee) };
    case "surveillante":
      return { type: "surveillante", position: m.ronde(o.position) };
    case "echanger":
      return { type: "echanger", ilot: m.noeud(o.ilot) };
    default:
      return o;
  }
}
function retournerAction(a, m) {
  if (a.type === "envoyer") {
    return { type: "envoyer", eleveId: idEleve(a.eleveId), cible: m.noeud(a.cible) };
  }
  if (a.type === "choisir") return { type: "choisir", option: retournerOption(a.option, m) };
  return a;
}
function evenement(ev, m) {
  switch (ev.type) {
    case "appel":
    case "pioche":
    case "passe":
      return { ...ev, bande: autre(ev.bande) };
    case "pose":
      return {
        ...ev,
        bande: autre(ev.bande),
        eleveId: idEleve(ev.eleveId),
        cible: m.noeud(ev.cible)
      };
    case "cpe":
    case "rappel":
      return {
        ...ev,
        bande: autre(ev.bande),
        eleveId: idEleve(ev.eleveId),
        ilot: m.noeud(ev.ilot)
      };
    case "infirmerie":
    case "repechage":
      return { ...ev, bande: autre(ev.bande), eleveId: idEleve(ev.eleveId) };
    case "surveillante":
      return { ...ev, position: m.ronde(ev.position) };
    case "courant":
      return { ...ev, anneau: m.anneau(ev.anneau) };
    case "glissade":
      return {
        ...ev,
        eleveId: idEleve(ev.eleveId),
        depart: m.noeud(ev.depart),
        arrivee: m.noeud(ev.arrivee)
      };
    case "region":
      return { ...ev, bande: autre(ev.bande), region: m.region(ev.region) };
    case "fin":
      return { ...ev, gagnant: autre(ev.gagnant) };
  }
}
function retournerEtat(e, m) {
  const piles = {};
  for (const [id, pile] of Object.entries(e.piles)) piles[m.noeud(id)] = pile.map(eleve);
  const regionsPrises = {};
  for (const [id, b] of Object.entries(e.regionsPrises)) regionsPrises[m.region(id)] = autre(b);
  return {
    ...e,
    joueurs: { rouge: joueur(e.joueurs.bleu), bleu: joueur(e.joueurs.rouge) },
    piles,
    surveillante: m.ronde(e.surveillante),
    premier: autre(e.premier),
    courant: autre(e.courant),
    regionsPrises,
    effets: e.effets.map((x) => effet(x, m)),
    attente: e.attente ? {
      effet: effet(e.attente.effet, m),
      options: e.attente.options.map((o) => retournerOption(o, m))
    } : null,
    fin: e.fin ? { ...e.fin, gagnant: autre(e.fin.gagnant) } : null,
    journal: e.journal.map((ev) => evenement(ev, m))
  };
}
function retournerIssue(i) {
  return i ? { ...i, gagnant: autre(i.gagnant) } : null;
}
var retournerBande = autre;
export {
  ALPHABET_CODE,
  CourAsymetrique,
  DELAI_TOUR_DEFAUT,
  DELAI_TOUR_MAX,
  DELAI_TOUR_MIN,
  DUREE_INVITATION,
  LONGUEUR_CODE,
  PSEUDO_MAX,
  PSEUDO_MIN,
  Refus,
  SalleMemoire,
  bandeDe,
  courDe,
  elevesConnusDuRang,
  estCache,
  masquer,
  miroirDe,
  normaliserCode,
  nouveauCode,
  ouvrirPartie,
  rejoindrePartie,
  restaurer,
  retournerAction,
  retournerBande,
  retournerEtat,
  retournerIssue,
  retournerOption,
  stocker,
  traiter,
  validerPseudo,
  validerReglages,
  verifierTemps,
  vuePour
};
