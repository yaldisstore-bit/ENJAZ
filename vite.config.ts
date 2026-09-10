import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    modulePreload: { polyfill: false },
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    rolldownOptions: {
      output: {
        topLevelVar: true,
        minify: {
          compress: { target: 'esnext' },
          mangle: { toplevel: true },
          codegen: { removeWhitespace: true },
        },
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
