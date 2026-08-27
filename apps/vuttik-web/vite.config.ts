import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['leaflet'],
    },
    // NOTE: `process.env.GEMINI_API_KEY` used to be inlined here. Anything Vite
    // defines is baked into the JavaScript every visitor downloads, so that
    // would have published the key. Gemini is called from the server only, via
    // POST /api/ai/scan-image.
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      },
    },
    build: {
      chunkSizeWarningLimit: 1000
    }
  };
});
