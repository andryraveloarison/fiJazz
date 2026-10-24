// Liste des chants : onglets par catégorie, recherche par titre ou numéro,
// tap pour lancer.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLecteur } from '../context/LecteurContext'
import { IcLock, IcMusic, IcPause, IcPlay, IcSearch } from '../lib/icons'
import { CATEGORIES, nomCategorie, type Categorie } from '../types'

const LS_CAT = 'fihirana.categorie'

function categorieInitiale(): Categorie {
  try {
    const v = localStorage.getItem(LS_CAT)
    if (CATEGORIES.some((c) => c.id === v)) return v as Categorie
  } catch { /* ignore */ }
  return 'ffpm'
}

export default function ListePage() {
  const { chants, chargement, erreur, courant, enLecture, jouer, basculer } = useLecteur()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Categorie>(categorieInitiale)

  function choisir(c: Categorie) {
    setCat(c)
    try { localStorage.setItem(LS_CAT, c) } catch { /* ignore */ }
  }

  const duRecueil = useMemo(() => chants.filter((c) => c.categorie === cat), [chants, cat])

  const filtres = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return duRecueil
    return duRecueil.filter((c) => c.titre.toLowerCase().includes(s) || String(c.numero ?? '') === s)
  }, [duRecueil, q])

  return (
    <>
      <header className="hero">
        <div className="hero-haut">
          <div>
            <div className="hero-sur">{nomCategorie(cat)}</div>
            <h1>Fihirana Jazz</h1>
          </div>
          <Link to="/admin" className="btn-icone" aria-label="Administration"><IcLock size={20} /></Link>
        </div>
        <div className="recherche">
          <IcSearch size={18} />
          <input placeholder="Hitady hira (titre ou numéro)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="onglets" role="tablist">
          {CATEGORIES.map((c) => (
            <button
              key={c.id} role="tab" aria-selected={cat === c.id}
              className={`onglet ${cat === c.id ? 'actif' : ''}`}
              onClick={() => choisir(c.id)}
            >
              {c.nom}
            </button>
          ))}
        </div>
      </header>

      <main className="contenu">
        {erreur && <div className="erreur">{erreur}</div>}
        {chargement && !chants.length && <div className="vide">Chargement…</div>}
        {!chargement && !duRecueil.length && !erreur && (
          <div className="vide">Aucun chant dans « {nomCategorie(cat)} » pour l'instant.</div>
        )}
        {!!duRecueil.length && !filtres.length && <div className="vide">Aucun résultat.</div>}

        <ul className="liste">
          {filtres.map((c) => {
            const actif = courant?.id === c.id
            return (
              <li key={c.id}>
                <button
                  className={`chant ${actif ? 'actif' : ''}`}
                  onClick={() => (actif ? basculer() : jouer(c))}
                >
                  <span className="chant-num">{c.numero ?? <IcMusic size={18} />}</span>
                  <span className="chant-titre">{c.titre}</span>
                  <span className="chant-play">
                    {actif && enLecture ? <IcPause size={18} /> : <IcPlay size={18} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}
