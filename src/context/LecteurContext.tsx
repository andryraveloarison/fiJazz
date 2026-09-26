// État partagé : liste des chants + lecteur audio unique (un seul <audio>).
// À la fin d'un chant, on enchaîne automatiquement sur le suivant.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Chant } from '../types'
import { dbReady, listerChants, urlAudio } from '../lib/supabase'

interface Lecteur {
  chants: Chant[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
  courant: Chant | null
  enLecture: boolean
  position: number
  duree: number
  jouer: (c: Chant) => void
  basculer: () => void
  suivant: () => void
  precedent: () => void
  chercher: (s: number) => void
  arreter: () => void
}

const Ctx = createContext<Lecteur | null>(null)

export function LecteurProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(new Audio())
  const [chants, setChants] = useState<Chant[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [courant, setCourant] = useState<Chant | null>(null)
  const [enLecture, setEnLecture] = useState(false)
  const [position, setPosition] = useState(0)
  const [duree, setDuree] = useState(0)

  // Références à jour pour les handlers de l'élément audio.
  const chantsRef = useRef(chants)
  const courantRef = useRef(courant)
  chantsRef.current = chants
  courantRef.current = courant

  const recharger = useCallback(async () => {
    if (!dbReady) { setChargement(false); return }
    setChargement(true)
    try {
      setChants(await listerChants())
      setErreur(null)
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => { recharger() }, [recharger])

  const jouer = useCallback((c: Chant) => {
    const a = audio.current
    if (courantRef.current?.id !== c.id) {
      a.src = urlAudio(c)
      setCourant(c)
      setPosition(0)
      setDuree(0)
    }
    a.play().catch(() => setEnLecture(false))
  }, [])

  const decaler = useCallback((pas: number) => {
    const liste = chantsRef.current
    if (!liste.length) return
    const i = liste.findIndex((c) => c.id === courantRef.current?.id)
    const j = i < 0 ? 0 : (i + pas + liste.length) % liste.length
    jouer(liste[j])
  }, [jouer])

  const suivant = useCallback(() => decaler(1), [decaler])
  const precedent = useCallback(() => {
    // Comme les lecteurs classiques : revient au début si on a dépassé 3 s.
    if (audio.current.currentTime > 3) { audio.current.currentTime = 0; return }
    decaler(-1)
  }, [decaler])

  const basculer = useCallback(() => {
    const a = audio.current
    if (!courantRef.current) { if (chantsRef.current[0]) jouer(chantsRef.current[0]); return }
    if (a.paused) a.play().catch(() => setEnLecture(false))
    else a.pause()
  }, [jouer])

  const chercher = useCallback((s: number) => { audio.current.currentTime = s }, [])

  const arreter = useCallback(() => {
    const a = audio.current
    a.pause()
    a.removeAttribute('src')
    a.load()
    setCourant(null)
    setEnLecture(false)
  }, [])

  useEffect(() => {
    const a = audio.current
    const onPlay = () => setEnLecture(true)
    const onPause = () => setEnLecture(false)
    const onTime = () => setPosition(a.currentTime)
    const onMeta = () => setDuree(a.duration)
    const onEnd = () => suivant()
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnd)
    }
  }, [suivant])

  // Contrôles écran verrouillé / notification (Media Session API).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.metadata = courant
      ? new MediaMetadata({ title: courant.titre, artist: 'Fihirana FFPM — Jazz', album: 'Fihirana Jazz' })
      : null
    ms.setActionHandler('play', basculer)
    ms.setActionHandler('pause', basculer)
    ms.setActionHandler('nexttrack', suivant)
    ms.setActionHandler('previoustrack', precedent)
  }, [courant, basculer, suivant, precedent])

  return (
    <Ctx.Provider value={{
      chants, chargement, erreur, recharger,
      courant, enLecture, position, duree,
      jouer, basculer, suivant, precedent, chercher, arreter,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLecteur(): Lecteur {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLecteur hors de LecteurProvider')
  return v
}
