import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The name of your GitHub repository
const GITHUB_REPOSITORY_NAME = 'search';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProductionBuild = command === 'build';
  let basePath = '/'; // Default for Netlify and local development (npm run dev)

  // Load env variables from .env files.
  // The third parameter '' makes it load all variables, not just VITE_ prefixed ones.
  // This allows us to use API_KEY instead of VITE_API_KEY.
  const env = loadEnv(mode, '.', '');

  if (isProductionBuild) {
    // Netlify sets process.env.NETLIFY = 'true' in its build environment.
    // If this variable is not set, we assume it's a build for GitHub Pages or another environment
    // that requires the repository name in the base path.
    if (process.env.NETLIFY !== 'true') {
      basePath = `/${GITHUB_REPOSITORY_NAME}/`;
    }
  }
  
  return {
    plugins: [react()],
    base: basePath,
    build: {
      outDir: 'dist',
      // Externalize dependencies that are loaded via the importmap in index.html
      // This tells Vite not to bundle them, fixing the build error.
      rollupOptions: {
        external: ['jspdf', 'html2canvas', 'gapi-script', 'xlsx'],
      },
    },
    // Define `process.env` variables to be available in the client-side code.
    // Vite performs a direct text replacement of this expression with the value.
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
    },
    // Vite automatically loads .env files.
    // Environment variables prefixed with VITE_ are exposed to client-side code.
    // e.g., import.meta.env.VITE_API_KEY
  }
})