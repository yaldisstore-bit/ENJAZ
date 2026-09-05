import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist-r2-preview');
const statePath = path.join(root, 'docs', 'UI_UX_REBIRTH_2_0_STATE.json');
const errors = [];
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
const stage = state?.stage ?? '';
const isGolden = stage === 'R2.0-4';
const isCore = stage === 'R2.0-5';
const isRecords = stage === 'R2.0-6';
const isOperationalOrLater = /^R2\.0-(?:[7-9]|10|11)$/.test(stage);
const isRecordsOrLater = isRecords || isOperationalOrLater;

// Budgets grow only when a hard-gated stage adds approved presentation/model composition.
// R2.0-4: Golden specimen.
// R2.0-5: bounded Core Work model composition.
// R2.0-6: bounded entity-first Records composition.
// R2.0-7+: seven task-specific operational workspaces; the increase is explicit and remains capped.
const limits = {
  totalRaw: isOperationalOrLater ? 390_000 : 350_000,
  jsRaw: isOperationalOrLater ? 300_000 : isRecords ? 285_000 : isCore ? 270_000 : 250_000,
  jsGzip: isOperationalOrLater ? 86_000 : isRecords ? 83_000 : isCore ? 80_000 : 72_000,
  cssRaw: isOperationalOrLater ? 82_000 : isRecords ? 70_000 : isCore ? 54_000 : isGolden ? 44_000 : 40_000,
  cssGzip: isOperationalOrLater ? 12_000 : isRecords ? 10_000 : 8_000,
  totalGzip: isOperationalOrLater ? 100_000 : isRecords ? 95_000 : 90_000,
  files: 12,
};

if (!fs.existsSync(dist)) {
  console.error('ENJAZ R2 preview budget failed: dist-r2-preview does not exist');
  process.exit(1);
}
const files = [];
const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const absolute = path.join(dir, entry.name); if (entry.isDirectory()) walk(absolute); else files.push(absolute); } };
walk(dist);
let totalRaw = 0, totalGzip = 0, jsRaw = 0, jsGzip = 0, cssRaw = 0, cssGzip = 0;
for (const file of files) {
  const buffer = fs.readFileSync(file); const raw = buffer.byteLength; const gzip = zlib.gzipSync(buffer, { level: 9 }).byteLength;
  totalRaw += raw; totalGzip += gzip;
  if (file.endsWith('.js')) { jsRaw += raw; jsGzip += gzip; }
  if (file.endsWith('.css')) { cssRaw += raw; cssGzip += gzip; }
}
const check = (label, actual, limit) => { if (actual > limit) errors.push(`${label} exceeded: ${actual} > ${limit}`); };
check('preview total raw', totalRaw, limits.totalRaw);
check('preview JavaScript raw', jsRaw, limits.jsRaw);
check('preview JavaScript gzip', jsGzip, limits.jsGzip);
check('preview CSS raw', cssRaw, limits.cssRaw);
check('preview CSS gzip', cssGzip, limits.cssGzip);
check('preview total gzip', totalGzip, limits.totalGzip);
check('preview file count', files.length, limits.files);
if (errors.length) { console.error(`ENJAZ R2 preview budget failed (${errors.length})`); errors.forEach((e) => console.error(`- ${e}`)); process.exitCode = 1; }
else { console.log(`ENJAZ R2 preview budget PASS — ${stage || 'unknown-stage'} bounded profile`); console.log(JSON.stringify({ files: files.length, totalRaw, totalGzip, jsRaw, jsGzip, cssRaw, cssGzip, limits }, null, 2)); }
