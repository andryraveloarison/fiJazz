-- ─────────────────────────────────────────────────────────────────────────
-- Migration : ajout des catégories (ffpm | fanampiny | antema).
-- À exécuter UNE fois dans Supabase → SQL Editor sur une base existante.
-- Aucune ligne n'est supprimée : les chants déjà présents passent en 'ffpm'.
-- (Ré-exécutable sans risque.)
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Nouvelle colonne : les lignes existantes reçoivent le default 'ffpm'.
alter table public.chants add column if not exists categorie text not null default 'ffpm';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chants_categorie_check') then
    alter table public.chants add constraint chants_categorie_check
      check (categorie in ('ffpm', 'fanampiny', 'antema'));
  end if;
end $$;

-- 2. Fonctions admin : on retire les anciennes versions (sans catégorie).
--    Ce sont des fonctions (du code), pas des données.
drop function if exists public.chant_ajouter(text, text, integer, text);
drop function if exists public.chant_modifier(text, uuid, text, integer);

create or replace function public.chant_ajouter(p_mdp text, p_titre text, p_numero integer, p_categorie text, p_audio_path text)
returns public.chants
language plpgsql security definer set search_path = public, extensions
as $$
declare r chants;
begin
  if not chant_verifier(p_mdp) then raise exception 'Mot de passe incorrect'; end if;
  if coalesce(trim(p_titre), '') = '' then raise exception 'Titre obligatoire'; end if;
  insert into chants (titre, numero, categorie, audio_path)
  values (trim(p_titre), p_numero, coalesce(p_categorie, 'ffpm'), p_audio_path)
  returning * into r;
  return r;
end;
$$;

create or replace function public.chant_modifier(p_mdp text, p_id uuid, p_titre text, p_numero integer, p_categorie text)
returns public.chants
language plpgsql security definer set search_path = public, extensions
as $$
declare r chants;
begin
  if not chant_verifier(p_mdp) then raise exception 'Mot de passe incorrect'; end if;
  if coalesce(trim(p_titre), '') = '' then raise exception 'Titre obligatoire'; end if;
  update chants set titre = trim(p_titre), numero = p_numero, categorie = coalesce(p_categorie, categorie)
  where id = p_id
  returning * into r;
  return r;
end;
$$;

revoke all on function public.chant_ajouter(text, text, integer, text, text) from public;
revoke all on function public.chant_modifier(text, uuid, text, integer, text) from public;
grant execute on function public.chant_ajouter(text, text, integer, text, text)  to anon, authenticated;
grant execute on function public.chant_modifier(text, uuid, text, integer, text) to anon, authenticated;

-- Vérification : tous les chants existants doivent apparaître en 'ffpm'.
select categorie, count(*) from public.chants group by categorie;
