-- Amis et invitations du jeu en ligne (DR.12).
-- On devient amis en jouant ensemble, ou avec le code ami ; l'amitié va dans les deux sens
-- (deux lignes). Seule la fonction serveur « arbitre » écrit dans ces tables.

create table public.amis (
  compte uuid not null references public.profils (id) on delete cascade,
  ami uuid not null references public.profils (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (compte, ami),
  check (compte <> ami)
);
create index amis_ami on public.amis (ami);
alter table public.amis enable row level security;
create policy "chacun lit sa liste d'amis" on public.amis
  for select to authenticated using (compte = (select auth.uid()));

-- Une partie ouverte pour un ami précis : il la voit dans son menu tant qu'elle l'attend.
create table public.invitations (
  partie_id uuid primary key references public.parties (id) on delete cascade,
  de uuid not null references public.profils (id) on delete cascade,
  pour uuid not null references public.profils (id) on delete cascade,
  code text not null,
  carte text not null,
  cree_le timestamptz not null default now()
);
create index invitations_pour on public.invitations (pour, cree_le);
create index invitations_de on public.invitations (de);
alter table public.invitations enable row level security;
create policy "chacun lit les invitations qui le concernent" on public.invitations
  for select to authenticated using ((select auth.uid()) in (pour, de));

alter publication supabase_realtime add table public.invitations;
