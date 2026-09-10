import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function renderedModuleProbe(): Plugin {
  return {
    name: 'enjaz-rendered-module-probe',
    apply: 'build',
    generateBundle(_, bundle) {
      const totals = new Map<string, number>();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const [id, info] of Object.entries(output.modules)) totals.set(id, (totals.get(id) ?? 0) + (info.renderedLength ?? 0));
      }
      const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
      console.log('ENJAZ_PHASE9_2_MODULE_PROBE_BEGIN');
      for (const [id, bytes] of ranked.filter(([id]) => /searchIntelligence|search-intelligence|SavedViews|transactionSavedView|UiR2LiveRoot/.test(id))) console.log(`${bytes}\t${id.replace(process.cwd(), '.')}`);
      console.log('ENJAZ_PHASE9_2_MODULE_PROBE_END');
      console.log('ENJAZ_PHASE9_3_TOP_MODULES_BEGIN');
      for (const [id, bytes] of ranked.filter(([id]) => !id.includes('/node_modules/')).slice(0, 30)) console.log(`${bytes}\t${id.replace(process.cwd(), '.')}`);
      console.log('ENJAZ_PHASE9_3_TOP_MODULES_END');
    },
  };
}

export default defineConfig({
  plugins: [react(), renderedModuleProbe()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    target: 'esnext',
    modulePreload: { polyfill: false },
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    rolldownOptions: {
      preserveEntrySignatures: false,
      optimization: { inlineConst: true },
      output: {
        minify: true,
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|scheduler)([\\/]|$)/, priority: 30 },
            { name: 'supabase-vendor', test: /node_modules[\\/]@supabase[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
});
