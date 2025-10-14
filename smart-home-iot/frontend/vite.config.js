import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Reemplaza <repo> por el nombre EXACTO del repo de GitHub
  base: '/Smart-Home-IoT/',
})
