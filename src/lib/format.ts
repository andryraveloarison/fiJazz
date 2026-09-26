export function duree(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function libelle(numero: number | null, titre: string): string {
  return numero != null ? `${numero}. ${titre}` : titre
}
