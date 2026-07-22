import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Multi-page setup: every viewer screen is its own plain HTML entry so the
// markup stays close to the wireframes. React is only pulled in by the
// family-tree entry, which mounts the D3 tree island.
const __dirname = dirname(fileURLToPath(import.meta.url));
const page = (name) => resolve(__dirname, `${name}.html`);
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // The backend only whitelists http://localhost:3000 for CORS, and the
    // auth cookies are HTTP-only — proxying keeps everything same-origin so
    // the browser sends them without any CORS/SameSite negotiation at all.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        gateway: page('index'),
        home: page('home'),
        familyTree: page('family-tree'),
        gallery: page('gallery'),
        stories: page('stories'),
        story: page('story'),
        anniversary: page('anniversary'),
      },
    },
  },
});
