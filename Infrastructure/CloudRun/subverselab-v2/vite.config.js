import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://subverselab-site-v7tccgdmlq-ew.a.run.app',
        changeOrigin: true,
      }
    }
  }
})
