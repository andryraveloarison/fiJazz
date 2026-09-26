import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' → chemins relatifs, nécessaire pour la WebView Capacitor (APK).
// host: true → accessible depuis l'extérieur du conteneur Docker.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: { usePolling: true },
  },
})
