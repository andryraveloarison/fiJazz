// Liste des chants : recherche par titre ou numéro, tap pour lancer.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLecteur } from '../context/LecteurContext'
import { IcLock, IcMusic, IcPause, IcPlay, IcSearch } from '../lib/icons'

export default function ListePage() {
  const { chants, chargement, erreur, courant, enLecture, jouer, basculer } = useLecteur()
  const [q, setQ] = useState('')

  const filtres = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return chants
    return chants.filter((c) => c.titre.toLowerCase().includes(s) || String(c.numero ?? '') === s)
  }, [chants, q])

  return (
    <>
      <header className="hero">
        <div className="hero-haut">
          <div>
            <div className="hero-sur">Fihirana FFPM</div>
            <h1>Fihirana Jazz</h1>
          </div>
          <Link to="/admin" className="btn-icone" aria-label="Administration"><IcLock size={20} /></Link>
        </div>
        <div className="recherche">
          <IcSearch size={18} />
          <input placeholder="Hitady hira (titre ou numéro)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      <main className="contenu">
        {erreur && <div className="erreur">{erreur}</div>}
        {chargement && !chants.length && <div className="vide">Chargement…</div>}
        {!chargement && !chants.length && !erreur && (
          <div className="vide">Aucun chant pour l'instant. Ajoute-en depuis l'espace admin.</div>
        )}
        {!!chants.length && !filtres.length && <div className="vide">Aucun résultat.</div>}

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
