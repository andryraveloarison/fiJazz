import { dbReady } from '../lib/supabase'

// Les variables VITE_* sont injectées AU BUILD : après les avoir ajoutées
// (Vercel / secrets GitHub), il faut relancer un build pour qu'elles comptent.
export default function ConfigBanner() {
  if (dbReady) return null
  return (
    <div className="banniere">
      Base de données non configurée : <code>VITE_SUPABASE_URL</code> et{' '}
      <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> absentes au moment du build
      (<code>.env</code> en local, variables Vercel ou secrets GitHub — puis relancer le build).
    </div>
  )
}
