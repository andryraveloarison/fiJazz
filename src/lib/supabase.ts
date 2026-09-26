// Client Supabase + accès aux données de Fihirana Jazz.
//
// Lecture des chants : publique. Écritures (ajout / modif / suppression) :
// via les RPC chant_* qui vérifient le mot de passe admin côté Postgres.
// Les fichiers audio sont dans le bucket Storage public `chants`.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Chant } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase: SupabaseClient | null =
  url && key && !key.startsWith('sb_publishable_xxxx') ? createClient(url, key) : null

export const dbReady = !!supabase

const BUCKET = 'chants'
const MSG_NO_DB = 'Base de données non configurée (vérifie le fichier .env).'

function asError(e: { message?: string; hint?: string; code?: string } | null, fallback: string): Error {
  if (!e) return new Error(fallback)
  if (e.code === 'PGRST205' || e.code === 'PGRST202')
    return new Error('Schéma manquant — exécute sql/schema.sql dans Supabase (SQL Editor).')
  return new Error(e.hint ? `${e.message} — ${e.hint}` : e.message || fallback)
}

function db(): SupabaseClient {
  if (!supabase) throw new Error(MSG_NO_DB)
  return supabase
}

// ── Lecture ─────────────────────────────────────────────────────────────
export async function listerChants(): Promise<Chant[]> {
  const { data, error } = await db()
    .from('chants')
    .select('*')
    .order('numero', { ascending: true, nullsFirst: false })
    .order('titre', { ascending: true })
  if (error) throw asError(error, 'Impossible de charger les chants.')
  return data as Chant[]
}

export function urlAudio(c: Chant): string {
  return db().storage.from(BUCKET).getPublicUrl(c.audio_path).data.publicUrl
}

// ── Admin (mot de passe gardé en sessionStorage le temps de la session) ──
const SS_KEY = 'fihirana.admin'

export function getMdpAdmin(): string | null {
  try { return sessionStorage.getItem(SS_KEY) } catch { return null }
}

export async function connecterAdmin(mdp: string): Promise<boolean> {
  const { data, error } = await db().rpc('chant_verifier', { p_mdp: mdp })
  if (error) throw asError(error, 'Vérification impossible.')
  if (data === true) {
    try { sessionStorage.setItem(SS_KEY, mdp) } catch { /* ignore */ }
    return true
  }
  return false
}

export function deconnecterAdmin() {
  try { sessionStorage.removeItem(SS_KEY) } catch { /* ignore */ }
}

function mdp(): string {
  const m = getMdpAdmin()
  if (!m) throw new Error('Session admin expirée — reconnecte-toi.')
  return m
}

function nomFichier(f: File): string {
  const ext = (f.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${crypto.randomUUID()}.${ext}`
}

export async function ajouterChant(titre: string, numero: number | null, fichier: File): Promise<Chant> {
  const m = mdp()
  const path = nomFichier(fichier)
  const up = await db().storage.from(BUCKET).upload(path, fichier, {
    contentType: fichier.type || 'audio/mpeg',
    upsert: false,
  })
  if (up.error) throw new Error(`Envoi du fichier échoué : ${up.error.message}`)
  const { data, error } = await db().rpc('chant_ajouter', {
    p_mdp: m, p_titre: titre, p_numero: numero, p_audio_path: path,
  })
  if (error) {
    await db().storage.from(BUCKET).remove([path]) // pas de fichier orphelin
    throw asError(error, 'Ajout impossible.')
  }
  return data as Chant
}

export async function modifierChant(id: string, titre: string, numero: number | null): Promise<Chant> {
  const { data, error } = await db().rpc('chant_modifier', {
    p_mdp: mdp(), p_id: id, p_titre: titre, p_numero: numero,
  })
  if (error) throw asError(error, 'Modification impossible.')
  return data as Chant
}

export async function supprimerChant(id: string): Promise<void> {
  const { data, error } = await db().rpc('chant_supprimer', { p_mdp: mdp(), p_id: id })
  if (error) throw asError(error, 'Suppression impossible.')
  if (data) await db().storage.from(BUCKET).remove([data as string])
}
