import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Production builds are served from GitHub Pages at /PhycoterraPoC/.
  base: command === 'build' ? '/PhycoterraPoC/' : '/',
  plugins: [react()],
}))
