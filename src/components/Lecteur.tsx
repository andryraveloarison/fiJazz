// Mini-lecteur fixé en bas de l'écran.
import { useLecteur } from '../context/LecteurContext'
import { duree as fmt, libelle } from '../lib/format'
import { IcNext, IcPause, IcPlay, IcPrev } from '../lib/icons'

export default function Lecteur() {
  const { courant, enLecture, position, duree, basculer, suivant, precedent, chercher } = useLecteur()
  if (!courant) return null

  return (
    <div className="lecteur">
      <div className="lecteur-titre">{libelle(courant.numero, courant.titre)}</div>
      <div className="lecteur-barre">
        <span>{fmt(position)}</span>
        <input
          type="range" min={0} max={duree || 0} step={0.5} value={Math.min(position, duree || 0)}
          onChange={(e) => chercher(Number(e.target.value))}
          style={{ ['--p' as string]: `${duree ? (position / duree) * 100 : 0}%` }}
        />
        <span>{fmt(duree)}</span>
      </div>
      <div className="lecteur-ctrl">
        <button className="btn-rond" onClick={precedent} aria-label="Précédent"><IcPrev size={22} /></button>
        <button className="btn-rond grand" onClick={basculer} aria-label={enLecture ? 'Pause' : 'Lecture'}>
          {enLecture ? <IcPause size={28} /> : <IcPlay size={28} />}
        </button>
        <button className="btn-rond" onClick={suivant} aria-label="Suivant"><IcNext size={22} /></button>
      </div>
    </div>
  )
}
