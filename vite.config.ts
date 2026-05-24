import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
          workbox: {
            maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB limit
          },
          manifest: {
            name: 'Vibe Gadgets',
            short_name: 'VibeGadgets',
            description: 'Premium mobile accessories and gadgets store in BD',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            display: 'standalone',
            icons: [
              {
                src: 'https://ui-avatars.com/api/?name=Vibe&background=000&color=fff&size=192',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: 'https://ui-avatars.com/api/?name=Vibe&background=000&color=fff&size=512',
                sizes: '512x512',
                type: 'image/png',
              }
            ]
          }
        })
      ],
      build: {
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
          output: {
            manualChunks: undefined,
          },
        },
      },
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
