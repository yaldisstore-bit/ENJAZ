import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const cwd = process.cwd();
const requestedDist = process.env.ENJAZ_DIST_DIR?.trim() || 'dist';
const dist = path.resolve(cwd, requestedDist);
const relativeDist = path.relative(cwd, dist);
if (!relativeDist || relativeDist.startsWith('..') || path.isAbsolute(relativeDist)) {
  if (dist !== path.resolve(cwd, 'dist')) {
    console.error(`dist budget audit: ENJAZ_DIST_DIR must stay inside the repository (${requestedDist})`);
    process.exit(1);
  }
}
const manifestPath = path.join(dist, '.vite', 'manifest.json');
if (!fs.existsSync(path.join(dist, 'index.html')) || !fs.existsSync(manifestPath)) {
  console.error(`dist budget audit: index.html or Vite manifest is missing in ${requestedDist}`);
  process.exit(1);
}
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => { const full = path.join(dir, entry.name); return entry.isDirectory() ? walk(full) : [full]; }); }
const files = walk(dist), stats = files.map((file) => ({ file, relative: path.relative(dist, file).split(path.sep).join('/'), size: fs.statSync(file).size }));
const total = stats.reduce((sum, item) => sum + item.size, 0), js = stats.filter((item) => item.relative.endsWith('.js')), css = stats.filter((item) => item.relative.endsWith('.css'));
const jsRaw = js.reduce((sum, item) => sum + item.size, 0), cssRaw = css.reduce((sum, item) => sum + item.size, 0), gzipTotal = [...js, ...css].reduce((sum, item) => sum + zlib.gzipSync(fs.readFileSync(item.file), { level: 9 }).length, 0);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')), entryKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry === true), initialFiles = new Set();
function visit(key) { if (!key || initialFiles.has(key)) return; const item = manifest[key]; if (!item) return; initialFiles.add(key); for (const imported of item.imports ?? []) visit(imported); }
visit(entryKey);
const initialAssetFiles = new Set([...initialFiles].map((key) => manifest[key]?.file).filter((value) => typeof value === 'string'));
const initialJsRaw = js.filter((item) => initialAssetFiles.has(item.relative)).reduce((sum, item) => sum + item.size, 0), lazyJs = js.filter((item) => !initialAssetFiles.has(item.relative));
const largest = [...stats].sort((a, b) => b.size - a.size)[0], largestLazy = [...lazyJs].sort((a, b) => b.size - a.size)[0], failures = [];
const INITIAL_JS_BUDGET = 670_000, TOTAL_JS_GUARD = 760_000, LAZY_CHUNK_GUARD = 140_000;
if (!entryKey) failures.push('Vite manifest has no application entry');
if (files.length > 40) failures.push(`too many production files: ${files.length} > 40`);
if (total > 1_500_000) failures.push(`raw dist too large: ${total} > 1500000 bytes`);
if (initialJsRaw > INITIAL_JS_BUDGET) failures.push(`initial JavaScript budget exceeded: ${initialJsRaw} > ${INITIAL_JS_BUDGET} bytes`);
if (jsRaw > TOTAL_JS_GUARD) failures.push(`total JavaScript guard exceeded: ${jsRaw} > ${TOTAL_JS_GUARD} bytes`);
if (largestLazy?.size > LAZY_CHUNK_GUARD) failures.push(`lazy chunk too large: ${largestLazy.relative} = ${largestLazy.size} > ${LAZY_CHUNK_GUARD} bytes`);
if (cssRaw > 180_000) failures.push(`CSS budget exceeded: ${cssRaw} > 180000 bytes`);
if (gzipTotal > 300_000) failures.push(`combined gzipped JS+CSS exceeded: ${gzipTotal} > 300000 bytes`);
if (largest?.size > 500_000) failures.push(`single asset too large: ${largest.relative} = ${largest.size} bytes`);
if (stats.some((item) => item.relative.endsWith('.map'))) failures.push('production source maps must not ship publicly');
if (failures.length) { console.error(`ENJAZ production budget failed for ${requestedDist} (${failures.length})`); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log(`ENJAZ production budget passed for ${requestedDist}: files=${files.length}, raw=${total}, initial-js=${initialJsRaw}/${INITIAL_JS_BUDGET}, total-js=${jsRaw}/${TOTAL_JS_GUARD}, lazy-js=${jsRaw-initialJsRaw}, largest-lazy=${largestLazy?.size ?? 0}/${LAZY_CHUNK_GUARD}, css=${cssRaw}, gzip(js+css)=${gzipTotal}.`);
