import type { EquipeId } from '../../data/equipes';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  Refus,
  type CodeRefus,
  type Demande,
  type ReglagesEnLigne,
  type ServeurParties,
  type VueJoueur,
} from '../../reseau/index';
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from './config';

/** Temps maximal d'une demande au serveur (ms). */
const DELAI_RESEAU = 15_000;

export interface Profil {
  id: string;
  pseudo: string;
  code_ami: string;
}

/**
 * Le vrai serveur : Supabase. Les coups passent par la fonction « arbitre » ; les vues se lisent
 * directement dans la table `vues` (la base ne laisse voir que les siennes) et arrivent en temps
 * réel. Le compte est anonyme au départ, gardé sur le téléphone, et pourra être relié à Apple ou
 * Google plus tard sans rien perdre.
 */
export class ServeurSupabase implements ServeurParties {
  readonly base: SupabaseClient;

  constructor(url = SUPABASE_URL, cle = SUPABASE_CLE_PUBLIQUE) {
    this.base = createClient(url, cle, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        // Le verrou entre onglets du navigateur peut rester bloqué sur certains téléphones (et
        // dans les navigateurs intégrés aux applis) : le jeu n'a qu'un onglet, on s'en passe.
        lock: async (_nom, _delai, faire) => faire(),
      },
      // Une demande sans réponse au bout de 15 s échoue avec un message, au lieu d'attendre
      // pour toujours.
      global: {
        fetch: (entree, init) =>
          fetch(entree, { ...init, signal: init?.signal ?? AbortSignal.timeout(DELAI_RESEAU) }),
      },
    });
  }

  /** Le compte du téléphone, créé (anonyme) à la première partie en ligne. */
  async compte(): Promise<string> {
    const { data } = await this.base.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: cree, error } = await this.base.auth.signInAnonymously();
    if (error?.code === 'anonymous_provider_disabled') {
      throw new Refus('connexion_fermee', error.message);
    }
    if (error || !cree.user) throw error ?? new Error('Connexion impossible.');
    return cree.user.id;
  }

  async profil(): Promise<Profil | null> {
    const id = await this.compte();
    const { data, error } = await this.base
      .from('profils')
      .select('id, pseudo, code_ami')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Profil | null;
  }

  async choisirPseudo(pseudo: string): Promise<Profil> {
    return (await this.appeler({ op: 'profil', pseudo })) as Profil;
  }

  private async appeler(corps: Record<string, unknown>): Promise<unknown> {
    await this.compte();
    const { data, error } = await this.base.functions.invoke('arbitre', { body: corps });
    if (error) {
      // Un refus de l'arbitre revient avec le statut 409 et son code.
      const reponse = (error as { context?: Response }).context;
      if (reponse && reponse.status === 409) {
        const r = (await reponse.json()) as { refus: CodeRefus; message?: string };
        throw new Refus(r.refus, r.message);
      }
      throw error;
    }
    return (data as { resultat: unknown }).resultat;
  }

  async ouvrir(reglages: Partial<ReglagesEnLigne>): Promise<VueJoueur> {
    return (await this.appeler({ op: 'ouvrir', reglages })) as VueJoueur;
  }

  async rejoindre(code: string, equipe?: EquipeId): Promise<VueJoueur> {
    return (await this.appeler({ op: 'rejoindre', code, equipe })) as VueJoueur;
  }

  async envoyer(partieId: string, demande: Demande): Promise<VueJoueur> {
    return (await this.appeler({ op: 'envoyer', partieId, demande })) as VueJoueur;
  }

  async lire(partieId: string): Promise<VueJoueur> {
    const id = await this.compte();
    const { data, error } = await this.base
      .from('vues')
      .select('vue')
      .eq('partie_id', partieId)
      .eq('joueur', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Refus('partie_introuvable');
    return data.vue as VueJoueur;
  }

  suivre(partieId: string, rappel: (vue: VueJoueur) => void): () => void {
    let derniere = -1;
    const recevoir = (vue: VueJoueur) => {
      // Les messages peuvent arriver en double ou dans le désordre : on garde le plus récent.
      if (vue.version <= derniere) return;
      derniere = vue.version;
      rappel(vue);
    };
    const canal = this.base
      .channel(`partie-${partieId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vues', filter: `partie_id=eq.${partieId}` },
        (msg) => {
          const ligne = msg.new as { vue?: VueJoueur } | undefined;
          if (ligne?.vue) recevoir(ligne.vue);
        },
      )
      .subscribe((etat) => {
        // Abonné (ou réabonné après une coupure) : on relit, au cas où un coup serait passé.
        if (etat === 'SUBSCRIBED') this.lire(partieId).then(recevoir, () => undefined);
      });
    return () => {
      void this.base.removeChannel(canal);
    };
  }

  async mesParties(): Promise<VueJoueur[]> {
    const id = await this.compte();
    const { data, error } = await this.base
      .from('vues')
      .select('vue')
      .eq('joueur', id)
      .neq('statut', 'finie')
      .order('maj_le', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((l) => l.vue as VueJoueur);
  }
}
