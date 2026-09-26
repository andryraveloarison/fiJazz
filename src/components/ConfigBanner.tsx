import { dbReady } from '../lib/supabase'

export default function ConfigBanner() {
  if (dbReady) return null
  return (
    <div className="banniere">
      Base de données non configurée : renseigne <code>VITE_SUPABASE_URL</code> et{' '}
      <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dans <code>.env</code>.
    </div>
  )
}
