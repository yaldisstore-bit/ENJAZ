import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function thirdPartyNotices(): Plugin {
  return {
    name: 'enjaz-third-party-notices',
    apply: 'build',
    generateBundle() {
      const root = resolve(process.cwd(), 'node_modules');
      const packageDirs: string[] = [];
      for (const entry of readdirSync(root)) {
        if (entry.startsWith('.')) continue;
        if (entry.startsWith('@')) {
          for (const child of readdirSync(join(root, entry))) packageDirs.push(join(root, entry, child));
        } else packageDirs.push(join(root, entry));
      }
      const blocks: string[] = [];
      for (const dir of packageDirs.sort()) {
        const manifestPath = join(dir, 'package.json');
        if (!existsSync(manifestPath)) continue;
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string; version?: string; license?: string | { type?: string } };
        const files = readdirSync(dir).filter((name) => /^(?:licen[cs]e|copying|notice)(?:\..*)?$/i.test(name)).sort();
        const license = typeof manifest.license === 'string' ? manifest.license : manifest.license?.type ?? 'unspecified';
        const text = files.map((name) => readFileSync(join(dir, name), 'utf8').trim()).filter(Boolean).join('\n\n');
        blocks.push(`===== ${manifest.name ?? dir.split('/').at(-1)}@${manifest.version ?? 'unknown'} · ${license} =====\n${text || `License metadata: ${license}`}`);
      }
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD_PARTY_NOTICES.txt',
        source: `ENJAZ third-party notices\nGenerated from installed dependency license files.\n\n${blocks.join('\n\n')}`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), thirdPartyNotices()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    target: 'esnext',
    modulePreload: { polyfill: false },
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    rolldownOptions: {
      optimization: { inlineConst: true },
      output: {
        minify: true,
        legalComments: 'none',
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
