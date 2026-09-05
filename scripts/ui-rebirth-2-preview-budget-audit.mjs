import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist-r2-preview');
const statePath = path.join(root, 'docs', 'UI_UX_REBIRTH_2_0_STATE.json');
const errors = [];

const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
const isGoldenOrLater = /^R2\.0-(?:[4-9]|10|11)$/.test(state?.stage ?? '');

// R2.0-3 established the 40 KB raw CSS ceiling for the shell alone.
// R2.0-4 adds the bounded Golden specimen visual grammar. Its raw CSS allowance
// grows by only 4 KB while gzip, JS, total and file-count ceilings remain unchanged.
// This prevents hiding bloat behind an arbitrary shell-era raw-CSS number.
const limits = {
  totalRaw: 350_000,
  jsRaw: 250_000,
  jsGzip: 72_000,
  cssRaw: isGoldenOrLater ? 44_000 : 40_000,
  cssGzip: 8_000,
  totalGzip: 90_000,
  files: 12,
};

if (!fs.existsSync(dist)) {
  console.error('ENJAZ R2 preview budget failed: dist-r2-preview does not exist');
  process.exit(1);
}

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else files.push(absolute);
  }
};
walk(dist);

let totalRaw = 0;
let totalGzip = 0;
let jsRaw = 0;
let jsGzip = 0;
let cssRaw = 0;
let cssGzip = 0;

for (const file of files) {
  const buffer = fs.readFileSync(file);
  const raw = buffer.byteLength;
  const gzip = zlib.gzipSync(buffer, { level: 9 }).byteLength;
  totalRaw += raw;
  totalGzip += gzip;
  if (file.endsWith('.js')) {
    jsRaw += raw;
    jsGzip += gzip;
  }
  if (file.endsWith('.css')) {
    cssRaw += raw;
    cssGzip += gzip;
  }
}

const check = (label, actual, limit) => {
  if (actual > limit) errors.push(`${label} exceeded: ${actual} > ${limit}`);
};

check('preview total raw', totalRaw, limits.totalRaw);
check('preview JavaScript raw', jsRaw, limits.jsRaw);
check('preview JavaScript gzip', jsGzip, limits.jsGzip);
check('preview CSS raw', cssRaw, limits.cssRaw);
check('preview CSS gzip', cssGzip, limits.cssGzip);
check('preview total gzip', totalGzip, limits.totalGzip);
check('preview file count', files.length, limits.files);

if (errors.length) {
  console.error(`ENJAZ R2 preview budget failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2 preview budget PASS — ${state?.stage ?? 'unknown-stage'} bounded profile`);
  console.log(JSON.stringify({ files: files.length, totalRaw, totalGzip, jsRaw, jsGzip, cssRaw, cssGzip, limits }, null, 2));
}
