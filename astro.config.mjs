// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  redirects: {
    '/raspberry-pi': '/inventario',
  },

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    // Explicito: nunca publicar source maps (exponen el codigo fuente original).
    build: { sourcemap: false }
  },

  adapter: vercel()
});