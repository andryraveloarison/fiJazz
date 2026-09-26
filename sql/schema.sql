-- ─────────────────────────────────────────────────────────────────────────
-- Fihirana Jazz — schéma Supabase (idempotent : peut être ré-exécuté).
-- À exécuter dans Supabase → SQL Editor.
--
--   • chants        : liste des cantiques (lecture publique).
--   • chant_admin   : hash bcrypt du mot de passe admin (RLS sans policy →
--                     jamais lisible directement, seulement via les RPC).
--   • Écritures sur `chants` UNIQUEMENT via les RPC chant_* qui vérifient
--     le mot de passe côté serveur.
--   • Bucket Storage public `chants` pour les fichiers audio.
--
-- Mot de passe admin par défaut : okayokay
-- Pour le changer :  update chant_admin set mdp_hash = crypt('nouveau', gen_salt('bf'));
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

-- ── Tables ───────────────────────────────────────────────────────────────
create table if not exists public.chants (
  id          uuid primary key default gen_random_uuid(),
  numero      integer,                 -- numéro FFPM (optionnel)
  titre       text not null,
  audio_path  text not null,           -- chemin dans le bucket `chants`
  created_at  timestamptz not null default now()
);

create table if not exists public.chant_admin (
  id        integer primary key default 1 check (id = 1),
  mdp_hash  text not null
);

insert into public.chant_admin (id, mdp_hash)
values (1, extensions.crypt('okayokay', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.chants      enable row level security;
alter table public.chant_admin enable row level security;   -- aucune policy

drop policy if exists "chants_lecture" on public.chants;
create policy "chants_lecture" on public.chants
  for select to anon, authenticated using (true);

-- ── RPC admin (SECURITY DEFINER : contournent la RLS après vérif du mdp) ──
create or replace function public.chant_verifier(p_mdp text)
returns boolean
language sql security definer set search_path = public, extensions
as $$
  select exists (
    select 1 from chant_admin
    where mdp_hash = crypt(coalesce(p_mdp, ''), mdp_hash)
  );
$$;

create or replace function public.chant_ajouter(p_mdp text, p_titre text, p_numero integer, p_audio_path text)
returns public.chants
language plpgsql security definer set search_path = public, extensions
as $$
declare r chants;
begin
  if not chant_verifier(p_mdp) then raise exception 'Mot de passe incorrect'; end if;
  if coalesce(trim(p_titre), '') = '' then raise exception 'Titre obligatoire'; end if;
  insert into chants (titre, numero, audio_path)
  values (trim(p_titre), p_numero, p_audio_path)
  returning * into r;
  return r;
end;
$$;

create or replace function public.chant_modifier(p_mdp text, p_id uuid, p_titre text, p_numero integer)
returns public.chants
language plpgsql security definer set search_path = public, extensions
as $$
declare r chants;
begin
  if not chant_verifier(p_mdp) then raise exception 'Mot de passe incorrect'; end if;
  if coalesce(trim(p_titre), '') = '' then raise exception 'Titre obligatoire'; end if;
  update chants set titre = trim(p_titre), numero = p_numero
  where id = p_id
  returning * into r;
  return r;
end;
$$;

-- Supprime la ligne et renvoie le chemin audio (le client supprime le fichier).
create or replace function public.chant_supprimer(p_mdp text, p_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare v_path text;
begin
  if not chant_verifier(p_mdp) then raise exception 'Mot de passe incorrect'; end if;
  delete from chants where id = p_id returning audio_path into v_path;
  return v_path;
end;
$$;

revoke all on function public.chant_verifier(text)                        from public;
revoke all on function public.chant_ajouter(text, text, integer, text)     from public;
revoke all on function public.chant_modifier(text, uuid, text, integer)    from public;
revoke all on function public.chant_supprimer(text, uuid)                  from public;
grant execute on function public.chant_verifier(text)                     to anon, authenticated;
grant execute on function public.chant_ajouter(text, text, integer, text)  to anon, authenticated;
grant execute on function public.chant_modifier(text, uuid, text, integer) to anon, authenticated;
grant execute on function public.chant_supprimer(text, uuid)               to anon, authenticated;

-- ── Storage : bucket public pour les fichiers audio ──────────────────────
insert into storage.buckets (id, name, public)
values ('chants', 'chants', true)
on conflict (id) do update set public = true;

-- ⚠️ Compromis : sans Supabase Auth, l'upload/suppression de fichiers est
-- ouvert au rôle anon sur ce bucket (la table, elle, reste protégée par mdp).
drop policy if exists "chants_audio_lecture" on storage.objects;
create policy "chants_audio_lecture" on storage.objects
  for select to anon, authenticated using (bucket_id = 'chants');

drop policy if exists "chants_audio_upload" on storage.objects;
create policy "chants_audio_upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'chants');

drop policy if exists "chants_audio_suppression" on storage.objects;
create policy "chants_audio_suppression" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'chants');
