import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const uiV2Root = path.join(root, 'src', 'ui-v2');
const mainPath = path.join(root, 'src', 'main.tsx');
const failures = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function fail(message) {
  failures.push(message);
}

if (!fs.existsSync(uiV2Root)) {
  fail('src/ui-v2/ does not exist.');
} else {
  const sourceFiles = walk(uiV2Root).filter((file) => /\.(?:ts|tsx|js|jsx|css)$/.test(file));
  if (sourceFiles.length === 0) fail('src/ui-v2/ contains no source files.');

  const forbiddenText = [
    'ui-rebirth',
    'src/styles/',
    '../styles/',
    '../../styles/',
    'Identity 2',
    'Identity 3',
    'AppShellFrame',
  ];

  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const token of forbiddenText) {
      if (text.includes(token)) {
        fail(`${relative(file)} contains forbidden legacy dependency marker: ${token}`);
      }
    }
  }
}

if (!fs.existsSync(mainPath)) {
  fail('src/main.tsx is missing.');
} else {
  const main = fs.readFileSync(mainPath, 'utf8');
  if (!main.includes("./ui-v2/runtime/UiV2Root.tsx")) {
    fail('src/main.tsx does not mount UiV2Root.');
  }
  if (!main.includes("./ui-v2/styles/foundation.css")) {
    fail('src/main.tsx does not load UI V2 foundation styles.');
  }
  if (main.includes('ui-rebirth')) {
    fail('src/main.tsx still depends on ui-rebirth.');
  }
}

if (failures.length) {
  console.error('UI-1 boundary audit FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('UI-1 boundary audit PASS');
console.log('- UI V2 boundary exists.');
console.log('- UI V2 contains no forbidden legacy visual markers.');
console.log('- Application entry point mounts UI V2 and not ui-rebirth.');
