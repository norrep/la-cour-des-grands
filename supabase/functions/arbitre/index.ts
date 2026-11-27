// Fonction serveur « arbitre » (Supabase Edge Function, Deno).
// Toute la logique de jeu vient de src/reseau (regroupée dans arbitre.js par
// `npm run serveur:construire`) : ce fichier ne fait que lire et écrire la base.
import { createClient } from '@supabase/supabase-js';
import {
  nouveauCode,
  normaliserCode,
  ouvrirPartie,
  Refus,
  rejoindrePartie,
  traiter,
  vuePour,
} from './arbitre.js';

// Les types exacts sont dans src/reseau/protocole.ts ; le paquet JavaScript n'en porte pas.
type PartieServeur = {
  id: string;
  version: number;
  joueurs: { rouge?: string; bleu?: string };
  [cle: string]: unknown;
};
type Demande = Record<string, unknown>;
type ReglagesEnLigne = Record<string, unknown>;

const URL_PROJET = Deno.env.get('SUPABASE_URL') ?? '';
const CLE_SERVEUR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const base = createClient(URL_PROJET, CLE_SERVEUR, { auth: { persistSession: false } });

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

type Requete =
  | { op: 'profil'; pseudo: string }
  | { op: 'ouvrir'; reglages: Partial<ReglagesEnLigne> }
  | { op: 'rejoindre'; code: string; equipe?: string }
  | { op: 'envoyer'; partieId: string; demande: Demande };

function hasard(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] as number;
}

function repondre(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: ENTETES });
}

async function lirePartie(id: string): Promise<PartieServeur> {
  const { data, error } = await base.from('parties').select('donnees').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Refus('partie_introuvable');
  return data.donnees as PartieServeur;
}

/** Écrit la partie et la vue de chacun de ses joueurs, d'un bloc. */
async function enregistrer(p: PartieServeur, versionLue: number): Promise<void> {
  const vues = (['rouge', 'bleu'] as const)
    .map((b) => p.joueurs[b])
    .filter((j): j is string => Boolean(j))
    .map((joueur) => ({ joueur, vue: vuePour(p, joueur) }));
  const { data, error } = await base.rpc('enregistrer_partie', {
    p_partie: p,
    p_version_lue: versionLue,
    p_vues: vues,
  });
  if (error) {
    // Code déjà pris par une autre partie en attente : on retentera avec un autre.
    if (error.code === '23505') throw new Refus('partie_pleine', 'code_pris');
    throw error;
  }
  if (data !== true) throw new Refus('version_perimee', 'La partie a changé entre-temps.');
}

async function profil(compte: string, pseudo: string): Promise<unknown> {
  const propre = String(pseudo ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (propre.length < 2 || propre.length > 20)
    throw new Refus('reglages_invalides', 'Pseudo de 2 à 20 lettres.');
  const { data: existant } = await base.from('profils').select('*').eq('id', compte).maybeSingle();
  if (existant) {
    const { data, error } = await base
      .from('profils')
      .update({ pseudo: propre })
      .eq('id', compte)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  for (let essai = 0; essai < 5; essai++) {
    const { data, error } = await base
      .from('profils')
      .insert({ id: compte, pseudo: propre, code_ami: nouveauCode(hasard) })
      .select()
      .single();
    if (!error) return data;
    if (error.code !== '23505') throw error;
  }
  throw new Error('Impossible de tirer un code ami libre.');
}

async function traiterRequete(compte: string, r: Requete): Promise<unknown> {
  const maintenant = Date.now();
  switch (r.op) {
    case 'profil':
      return profil(compte, r.pseudo);
    case 'ouvrir': {
      for (let essai = 0; essai < 5; essai++) {
        const p = ouvrirPartie(
          crypto.randomUUID(),
          nouveauCode(hasard),
          compte,
          r.reglages ?? {},
          maintenant,
        );
        try {
          await enregistrer(p, -1);
          return vuePour(p, compte);
        } catch (e) {
          if (!(e instanceof Refus && e.message === 'code_pris')) throw e;
        }
      }
      throw new Error('Impossible de tirer un code libre.');
    }
    case 'rejoindre': {
      const code = normaliserCode(r.code ?? '');
      if (!code) throw new Refus('partie_introuvable', 'Ce code n’existe pas.');
      const { data, error } = await base
        .from('parties')
        .select('donnees')
        .eq('code', code)
        .eq('statut', 'attente')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Refus('partie_introuvable', 'Aucune partie n’attend avec ce code.');
      const p = data.donnees as PartieServeur;
      const q = rejoindrePartie(p, compte, hasard(), maintenant, r.equipe);
      await enregistrer(q, p.version);
      return vuePour(q, compte);
    }
    case 'envoyer': {
      const p = await lirePartie(r.partieId);
      const q = traiter(p, compte, r.demande, maintenant);
      await enregistrer(q, p.version);
      return vuePour(q, compte);
    }
    default:
      throw new Refus('reglages_invalides', 'Opération inconnue.');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ENTETES });
  if (req.method !== 'POST') return repondre({ erreur: 'methode' }, 405);
  const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: errAuth } = await base.auth.getUser(jeton);
  if (errAuth || !auth.user) return repondre({ erreur: 'non_connecte' }, 401);
  try {
    const corps = (await req.json()) as Requete;
    return repondre({ resultat: await traiterRequete(auth.user.id, corps) });
  } catch (e) {
    if (e instanceof Refus) return repondre({ refus: e.code, message: e.message }, 409);
    console.error(e);
    return repondre({ erreur: 'serveur' }, 500);
  }
});
