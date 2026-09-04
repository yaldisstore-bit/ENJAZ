import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dist = path.join(process.cwd(), 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist budget audit: dist/index.html is missing');
  process.exit(1);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dist);
const stats = files.map((file) => ({ file, relative: path.relative(dist, file), size: fs.statSync(file).size }));
const total = stats.reduce((sum, item) => sum + item.size, 0);
const js = stats.filter((item) => item.relative.endsWith('.js'));
const css = stats.filter((item) => item.relative.endsWith('.css'));
const jsRaw = js.reduce((sum, item) => sum + item.size, 0);
const cssRaw = css.reduce((sum, item) => sum + item.size, 0);
const compressible = [...js, ...css];
const gzipTotal = compressible.reduce((sum, item) => sum + zlib.gzipSync(fs.readFileSync(item.file), { level: 9 }).length, 0);
const largest = [...stats].sort((a, b) => b.size - a.size)[0];
const failures = [];

if (files.length > 40) failures.push(`too many production files: ${files.length} > 40`);
if (total > 1_500_000) failures.push(`raw dist too large: ${total} > 1500000 bytes`);
if (jsRaw > 650_000) failures.push(`JavaScript budget exceeded: ${jsRaw} > 650000 bytes`);
if (cssRaw > 180_000) failures.push(`CSS budget exceeded: ${cssRaw} > 180000 bytes`);
if (gzipTotal > 300_000) failures.push(`combined gzipped JS+CSS exceeded: ${gzipTotal} > 300000 bytes`);
if (largest?.size > 500_000) failures.push(`single asset too large: ${largest.relative} = ${largest.size} bytes`);
if (stats.some((item) => item.relative.endsWith('.map'))) failures.push('production source maps must not ship publicly');

if (failures.length) {
  console.error(`ENJAZ production budget failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ENJAZ production budget passed: ${files.length} files, raw=${total}, js=${jsRaw}, css=${cssRaw}, gzip(js+css)=${gzipTotal}.`);
