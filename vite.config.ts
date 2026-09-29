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

const PORTAL_CLASS_MAP = [
  ['cp-button--secondary','q0'],['cp-button--primary','q1'],['cp-button--danger','q2'],
  ['cp-topbar__actions','q3'],['cp-topbar__brand','q4'],['cp-request__action','q5'],
  ['cp-request__head','q6'],['cp-entry__card','q7'],['cp-auth__brand','q8'],
  ['cp-auth__card','q9'],['cp-auth__form','qa'],['cp-hero__metric','qb'],
  ['cp-request__done','qc'],['cp-link-button','qd'],['cp-action-row','qe'],
  ['cp-invitations','qf'],['cp-invitation','qg'],['cp-icon-button','qh'],
  ['cp-doc-icon','qi'],['cp-loading','qj'],['cp-topbar','qk'],['cp-section','ql'],
  ['cp-record','qm'],['cp-kicker','qn'],['cp-button','qo'],['cp-entry','qp'],
  ['cp-shell','qq'],['cp-main','qr'],['cp-hero','qs'],['cp-stats','qt'],
  ['cp-file','qu'],['cp-mark','qv'],['cp-muted','qw'],['cp-list','qx'],
  ['cp-chip','qy'],['cp-status--open','qz'],['cp-status--done','r0'],['cp-status','r1'],
  ['cp-skeleton','r2'],['cp-notice--','r3'],['cp-notice','r4'],['cp-auth','r5'],
] as const;

function compactClientPortalClasses(): Plugin {
  return {
    name: 'enjaz-client-portal-class-minifier',
    apply: 'build',
    renderChunk(code) {
      if (!code.includes('cp-')) return null;
      let compacted = code;
      for (const [source, target] of PORTAL_CLASS_MAP) compacted = compacted.replaceAll(source, target);
      return compacted === code ? null : { code: compacted, map: null };
    },
  };
}

export default defineConfig({
  resolve: { alias: { 'react': 'preact/compat', 'react-dom': 'preact/compat', 'react-dom/test-utils': 'preact/test-utils', 'react/jsx-runtime': 'preact/jsx-runtime', 'react/jsx-dev-runtime': 'preact/jsx-dev-runtime' } },
  plugins: [react(), compactClientPortalClasses(), renderedModuleProbe()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    target: 'esnext',
    modulePreload: { polyfill: false },
    sourcemap: false,
    cssCodeSplit: true,
    manifest: true,
    reportCompressedSize: true,
    rolldownOptions: {
      optimization: { inlineConst: true },
      output: {
        minify: true,
        comments: { legal: true, annotation: false, jsdoc: false },
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
