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
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    rolldownOptions: {
      // Keep strict source-order protection, but let Rolldown wrap only modules
      // whose predicted chunk execution can actually violate that order.
      experimental: { onDemandWrapping: true },
      output: {
        // Request Rolldown/Oxc full output minification explicitly. The hard
        // production budget remains unchanged; this only removes shipped
        // syntax/metadata that has no runtime value.
        minify: true,
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)([\\/]|$)/,
              priority: 30,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 20,
            },
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
