import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  build:{
    outDir:'dist-phase8-6-preview',
    emptyOutDir:true,
    rollupOptions:{input:'phase8-6-preview.html'},
  },
});
