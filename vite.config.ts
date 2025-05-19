import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Get version from package.json
const packageJson = JSON.parse(
  readFileSync('./package.json', 'utf-8')
)

// Get git commit hash
const getGitCommitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
};

// Prioritize build-time env vars passed as build args to Docker 
// This ensures the Docker build args take precedence
const APP_VERSION = process.env.VITE_APP_VERSION || packageJson.version;
const BUILD_ID = process.env.VITE_BUILD_ID || getGitCommitHash();

console.log(`Building with version: v${APP_VERSION}-${BUILD_ID}`);

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
    // Bake these values directly into the build
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID),
    'import.meta.env.VITE_TAPI_SERVER': JSON.stringify(process.env.VITE_TAPI_SERVER || 'localhost:8090'),
  }
})
