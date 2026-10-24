export type Categorie = 'ffpm' | 'fanampiny' | 'antema'

export const CATEGORIES: { id: Categorie; nom: string }[] = [
  { id: 'ffpm', nom: 'FFPM' },
  { id: 'fanampiny', nom: 'Fihirana fanampiny' },
  { id: 'antema', nom: 'Antema' },
]

export function nomCategorie(c: Categorie): string {
  return CATEGORIES.find((x) => x.id === c)?.nom ?? c
}

export interface Chant {
  id: string
  numero: number | null
  titre: string
  categorie: Categorie
  audio_path: string
  created_at: string
}
