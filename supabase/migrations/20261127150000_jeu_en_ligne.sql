-- Jeu en ligne (docs/multijoueur.md, DR.1–DR.6).
-- Principe : les téléphones ne lisent que leur propre VUE de chaque partie. L'état complet
-- (table parties) n'est lisible et modifiable que par la fonction serveur « arbitre ».

-- Profils : un pseudo et un code ami par compte (anonyme ou relié à Apple/Google plus tard).
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 2 and 20),
  code_ami text not null unique,
  cree_le timestamptz not null default now()
);
alter table public.profils enable row level security;
create policy "profils lisibles par les joueurs connectés" on public.profils
  for select to authenticated using (true);
-- Création et changement de pseudo passent par la fonction serveur (contrôle du pseudo).

-- Parties : la PartieServeur complète, jamais lue par un téléphone.
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  statut text not null check (statut in ('attente', 'en_cours', 'finie')),
  rouge uuid references auth.users (id) on delete set null,
  bleu uuid references auth.users (id) on delete set null,
  version integer not null,
  echeance timestamptz,
  donnees jsonb not null,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
-- Un code n'appartient qu'à une seule partie en attente à la fois.
create unique index parties_code_en_attente on public.parties (code) where statut = 'attente';
create index parties_echeance on public.parties (echeance) where statut = 'en_cours';
create index parties_rouge on public.parties (rouge);
create index parties_bleu on public.parties (bleu);
alter table public.parties enable row level security;
-- Aucune règle : seuls le serveur (clé secrète) et les fonctions ci-dessous y touchent.

-- Vues : une ligne par joueur et par partie, poussée en temps réel à son téléphone.
create table public.vues (
  partie_id uuid not null references public.parties (id) on delete cascade,
  joueur uuid not null references auth.users (id) on delete cascade,
  version integer not null,
  statut text not null,
  vue jsonb not null,
  maj_le timestamptz not null default now(),
  primary key (partie_id, joueur)
);
create index vues_joueur on public.vues (joueur, statut);
alter table public.vues enable row level security;
create policy "chacun lit ses vues" on public.vues
  for select to authenticated using (joueur = (select auth.uid()));

-- Le temps réel pousse les changements des vues (en respectant la règle ci-dessus).
alter publication supabase_realtime add table public.vues;

-- Enregistre une partie et les vues de ses joueurs d'un seul coup, si personne ne l'a changée
-- entre-temps (verrou optimiste sur la version). Rend false si la version a bougé.
create function public.enregistrer_partie(
  p_partie jsonb,
  p_version_lue integer,
  p_vues jsonb
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := (p_partie ->> 'id')::uuid;
  v_vue jsonb;
begin
  if p_version_lue < 0 then
    insert into public.parties (id, code, statut, rouge, bleu, version, echeance, donnees)
    values (
      v_id,
      p_partie ->> 'code',
      p_partie ->> 'statut',
      (p_partie -> 'joueurs' ->> 'rouge')::uuid,
      (p_partie -> 'joueurs' ->> 'bleu')::uuid,
      (p_partie ->> 'version')::integer,
      to_timestamp(((p_partie ->> 'echeance')::bigint) / 1000.0),
      p_partie
    );
  else
    update public.parties set
      statut = p_partie ->> 'statut',
      rouge = (p_partie -> 'joueurs' ->> 'rouge')::uuid,
      bleu = (p_partie -> 'joueurs' ->> 'bleu')::uuid,
      version = (p_partie ->> 'version')::integer,
      echeance = to_timestamp(((p_partie ->> 'echeance')::bigint) / 1000.0),
      donnees = p_partie,
      maj_le = now()
    where id = v_id and version = p_version_lue;
    if not found then
      return false;
    end if;
  end if;

  for v_vue in select * from jsonb_array_elements(p_vues) loop
    insert into public.vues (partie_id, joueur, version, statut, vue, maj_le)
    values (
      v_id,
      (v_vue ->> 'joueur')::uuid,
      (v_vue -> 'vue' ->> 'version')::integer,
      v_vue -> 'vue' ->> 'statut',
      v_vue -> 'vue',
      now()
    )
    on conflict (partie_id, joueur) do update set
      version = excluded.version,
      statut = excluded.statut,
      vue = excluded.vue,
      maj_le = excluded.maj_le;
  end loop;
  return true;
end;
$$;
revoke all on function public.enregistrer_partie(jsonb, integer, jsonb) from public, anon, authenticated;
grant execute on function public.enregistrer_partie(jsonb, integer, jsonb) to service_role;
