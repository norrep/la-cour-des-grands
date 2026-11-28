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
  validerPseudo,
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
  | { op: 'ouvrir'; reglages: Partial<ReglagesEnLigne>; ami?: string }
  | { op: 'rejoindre'; code: string; equipe?: string }
  | { op: 'ajouterAmi'; code: string }
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

async function pseudoDe(compte: string): Promise<string | undefined> {
  const { data } = await base.from('profils').select('pseudo').eq('id', compte).maybeSingle();
  return (data?.pseudo as string | undefined) ?? undefined;
}

/** Deux joueurs deviennent amis (dans les deux sens). Sans profil, on ne fait rien. */
async function lier(a: string, b: string): Promise<void> {
  if (a === b) return;
  const { error } = await base.from('amis').upsert(
    [
      { compte: a, ami: b },
      { compte: b, ami: a },
    ],
    { onConflict: 'compte,ami', ignoreDuplicates: true },
  );
  // 23503 : l'un des deux n'a pas encore de pseudo.
  if (error && error.code !== '23503') throw error;
}

async function ajouterAmi(compte: string, saisie: string): Promise<unknown> {
  const code = normaliserCode(saisie ?? '');
  if (!code) throw new Refus('ami_introuvable', 'Aucun joueur n’a ce code ami.');
  if (!(await pseudoDe(compte))) throw new Refus('pseudo_invalide', 'Choisis d’abord ton pseudo.');
  const { data, error } = await base
    .from('profils')
    .select('id, pseudo, code_ami')
    .eq('code_ami', code)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Refus('ami_introuvable', 'Aucun joueur n’a ce code ami.');
  if (data.id === compte) throw new Refus('soi_meme', 'C’est ton propre code !');
  await lier(compte, data.id as string);
  return data;
}

async function finirInvitation(partieId: string): Promise<void> {
  await base.from('invitations').delete().eq('partie_id', partieId);
}

async function profil(compte: string, pseudo: string): Promise<unknown> {
  const propre = validerPseudo(pseudo);
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
    case 'ajouterAmi':
      return ajouterAmi(compte, r.code);
    case 'ouvrir': {
      const nom = await pseudoDe(compte);
      if (r.ami) {
        const { data } = await base
          .from('amis')
          .select('ami')
          .eq('compte', compte)
          .eq('ami', r.ami)
          .maybeSingle();
        if (!data || !nom) throw new Refus('pas_ami', 'Ce joueur n’est pas dans tes amis.');
      }
      for (let essai = 0; essai < 5; essai++) {
        const p = ouvrirPartie(
          crypto.randomUUID(),
          nouveauCode(hasard),
          compte,
          r.reglages ?? {},
          maintenant,
          nom,
        );
        try {
          await enregistrer(p, -1);
          if (r.ami) {
            const { error } = await base.from('invitations').insert({
              partie_id: p.id,
              de: compte,
              pour: r.ami,
              code: p.code,
              carte: (p.reglages as { carte: string }).carte,
            });
            if (error) throw error;
          }
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
      const q = rejoindrePartie(p, compte, hasard(), maintenant, r.equipe, await pseudoDe(compte));
      await enregistrer(q, p.version);
      await finirInvitation(q.id);
      // Avoir joué ensemble suffit pour devenir amis.
      if (q.joueurs.rouge) await lier(q.joueurs.rouge, compte);
      return vuePour(q, compte);
    }
    case 'envoyer': {
      const p = await lirePartie(r.partieId);
      const q = traiter(p, compte, r.demande, maintenant);
      await enregistrer(q, p.version);
      if ((p as { statut?: string }).statut === 'attente') await finirInvitation(q.id);
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
