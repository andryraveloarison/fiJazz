// Espace admin protégé par mot de passe (vérifié côté Postgres) :
// ajouter un chant (titre + fichier audio), modifier le titre, supprimer.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLecteur } from '../context/LecteurContext'
import {
  ajouterChant, connecterAdmin, deconnecterAdmin, getMdpAdmin, modifierChant, supprimerChant,
} from '../lib/supabase'
import { IcBack, IcCheck, IcClose, IcDelete, IcEdit, IcLogout, IcUpload } from '../lib/icons'
import type { Chant } from '../types'

function versNumero(s: string): number | null {
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

export default function AdminPage() {
  const [connecte, setConnecte] = useState(!!getMdpAdmin())

  return (
    <>
      <header className="hero compact">
        <div className="hero-haut">
          <Link to="/" className="btn-icone" aria-label="Retour"><IcBack size={20} /></Link>
          <h1>Administration</h1>
          {connecte ? (
            <button
              className="btn-icone" aria-label="Se déconnecter"
              onClick={() => { deconnecterAdmin(); setConnecte(false) }}
            >
              <IcLogout size={20} />
            </button>
          ) : <span style={{ width: 40 }} />}
        </div>
      </header>
      <main className="contenu">
        {connecte ? <Gestion onExpire={() => setConnecte(false)} /> : <Connexion onOk={() => setConnecte(true)} />}
      </main>
    </>
  )
}

function Connexion({ onOk }: { onOk: () => void }) {
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function valider(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      if (await connecterAdmin(mdp)) onOk()
      else setErreur('Mot de passe incorrect.')
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="carte" onSubmit={valider}>
      <h2>Connexion admin</h2>
      <input
        type="password" className="champ" placeholder="Mot de passe" autoFocus
        value={mdp} onChange={(e) => setMdp(e.target.value)}
      />
      {erreur && <div className="erreur">{erreur}</div>}
      <button className="btn" disabled={envoi || !mdp}>{envoi ? 'Vérification…' : 'Se connecter'}</button>
    </form>
  )
}

function Gestion({ onExpire }: { onExpire: () => void }) {
  const { chants, recharger, courant, arreter } = useLecteur()
  const [erreur, setErreur] = useState<string | null>(null)

  async function action(fn: () => Promise<unknown>) {
    setErreur(null)
    try {
      await fn()
      await recharger()
    } catch (e) {
      const msg = (e as Error).message
      setErreur(msg)
      if (/mot de passe|session admin/i.test(msg)) { deconnecterAdmin(); onExpire() }
      throw e
    }
  }

  return (
    <>
      <FormAjout onAjout={(t, n, f) => action(() => ajouterChant(t, n, f))} />
      {erreur && <div className="erreur">{erreur}</div>}
      <h2 className="section">Titre ({chants.length})</h2>
      <ul className="liste">
        {chants.map((c) => (
          <LigneAdmin
            key={c.id}
            chant={c}
            onModif={(t, n) => action(() => modifierChant(c.id, t, n))}
            onSuppr={() => action(async () => {
              if (courant?.id === c.id) arreter()
              await supprimerChant(c.id)
            })}
          />
        ))}
      </ul>
    </>
  )
}

function FormAjout({ onAjout }: { onAjout: (titre: string, numero: number | null, f: File) => Promise<void> }) {
  const [titre, setTitre] = useState('')
  const [numero, setNumero] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [cle, setCle] = useState(0) // pour vider l'input file

  async function valider(e: FormEvent) {
    e.preventDefault()
    if (!fichier || !titre.trim()) return
    setEnvoi(true)
    try {
      await onAjout(titre, versNumero(numero), fichier)
      setTitre(''); setNumero(''); setFichier(null); setCle((k) => k + 1)
    } catch { /* erreur affichée par le parent */ } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="carte" onSubmit={valider}>
      <h2>Ajouter un chant</h2>
      <div className="ligne">
        <input
          className="champ num" inputMode="numeric" placeholder="N°"
          value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
        />
        <input className="champ" placeholder="Titre du chant" value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>
      <label className="fichier">
        <IcUpload size={18} />
        <span>{fichier ? fichier.name : 'Choisir un fichier audio (mp3, m4a…)'}</span>
        <input key={cle} type="file" accept="audio/*" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
      </label>
      <button className="btn" disabled={envoi || !fichier || !titre.trim()}>
        {envoi ? 'Envoi en cours…' : 'Ajouter'}
      </button>
    </form>
  )
}

function LigneAdmin({ chant, onModif, onSuppr }: {
  chant: Chant
  onModif: (titre: string, numero: number | null) => Promise<void>
  onSuppr: () => Promise<void>
}) {
  const [edition, setEdition] = useState(false)
  const [titre, setTitre] = useState(chant.titre)
  const [numero, setNumero] = useState(chant.numero?.toString() ?? '')
  const [occupe, setOccupe] = useState(false)

  async function run(fn: () => Promise<void>) {
    setOccupe(true)
    try { await fn(); setEdition(false) } catch { /* affiché par le parent */ } finally { setOccupe(false) }
  }

  if (edition) {
    return (
      <li className="admin-ligne edition">
        <input
          className="champ num" inputMode="numeric" placeholder="N°"
          value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
        />
        <input className="champ" value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
        <button className="btn-icone ok" disabled={occupe || !titre.trim()} aria-label="Enregistrer"
          onClick={() => run(() => onModif(titre, versNumero(numero)))}>
          <IcCheck size={18} />
        </button>
        <button className="btn-icone" aria-label="Annuler" onClick={() => {
          setEdition(false); setTitre(chant.titre); setNumero(chant.numero?.toString() ?? '')
        }}>
          <IcClose size={18} />
        </button>
      </li>
    )
  }

  return (
    <li className="admin-ligne">
      <span className="chant-num">{chant.numero ?? '—'}</span>
      <span className="chant-titre">{chant.titre}</span>
      <button className="btn-icone" aria-label="Modifier" onClick={() => setEdition(true)}><IcEdit size={18} /></button>
      <button className="btn-icone danger" aria-label="Supprimer" disabled={occupe}
        onClick={() => { if (confirm(`Supprimer « ${chant.titre} » ?`)) run(onSuppr) }}>
        <IcDelete size={18} />
      </button>
    </li>
  )
}
