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
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'framer-motion': path.resolve(__dirname, 'src/lib/framer-motion-mock.tsx'),
        'motion/react': path.resolve(__dirname, 'src/lib/framer-motion-mock.tsx')
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet';
              if (id.includes('lucide-react')) return 'icons';
              return 'vendor'; // all other node_modules
            }
          }
        }
      }
    }
  };
});
