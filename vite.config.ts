import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Get version from package.json
const packageJson = JSON.parse(
  readFileSync('./package.json', 'utf-8')
)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    'import.meta.env.VITE_TAPI_SERVER': JSON.stringify(process.env.VITE_TAPI_SERVER || 'localhost:8090'),
  }
})
