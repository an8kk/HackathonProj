import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const fsdAliases = {
  app: '/src/app',
  pages: '/src/pages',
  widgets: '/src/widgets',
  features: '/src/features',
  entities: '/src/entities',
  shared: '/src/shared'
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: fsdAliases
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts'
  }
});
