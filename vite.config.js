import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  base: './',
  // dev: serve public/ em / (http://localhost:3000/ funciona)
  // build: usa public/index.html como entry e copia public/ via publicDir
  root: command === 'serve' ? 'public' : '.',
  publicDir: command === 'serve' ? false : 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'public/index.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: { port: 3000, host: true },
  preview: { port: 4173 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['public/js/**/*.js'],
      exclude: ['public/js/config/texturas.js', 'public/sw.js'],
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 33, functions: 33, branches: 55 },
    },
  },
}));
