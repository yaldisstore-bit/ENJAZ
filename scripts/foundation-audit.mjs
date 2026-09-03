import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const projectRoot = resolve(process.cwd());
const sourceRoot = resolve(projectRoot, 'src');
const allowedExtensions = new Set(['.ts', '.tsx', '.css', '.html']);
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else files.push(child);
  }
  return files;
}

const sourceFiles = await walk(sourceRoot);
sourceFiles.push(resolve(projectRoot, 'index.html'));

const forbidden = [
  { name: 'legacy generation marker', regex: /\b(?:R4|R6|R7|V7|V8|MOAQIB)\b/i },
  { name: '!important', regex: /!important/i },
  { name: 'critical CDN runtime', regex: /https?:\/\/(?:cdn\.|cdnjs\.|unpkg\.|jsdelivr\.)/i },
  { name: 'unbounded z-index', regex: /z-index\s*:\s*(?:[1-9]\d{3,})/i },
  { name: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/ },
  { name: 'eval()', regex: /\beval\s*\(/ },
  { name: 'new Function()', regex: /\bnew\s+Function\s*\(/ },
  { name: 'TypeScript suppression', regex: /@ts-(?:ignore|nocheck)/ },
  { name: 'explicit any', regex: /(?::\s*any\b|\bas\s+any\b)/ },
];

function normalize(path) {
  return path.split(sep).join('/');
}

function layerOf(relativePath) {
  const [first] = normalize(relativePath).split('/');
  return first;
}

function resolveImport(importerRelative, specifier) {
  if (!specifier.startsWith('.')) return null;
  const importerAbsolute = resolve(sourceRoot, importerRelative);
  const importedAbsolute = resolve(importerAbsolute, '..', specifier);
  const importedRelative = normalize(relative(sourceRoot, importedAbsolute));
  return importedRelative.startsWith('../') ? null : importedRelative;
}

function checkLayerBoundary(importerRelative, importedRelative) {
  const importerLayer = layerOf(importerRelative);
  const importedLayer = layerOf(importedRelative);
  const disallowed = {
    core: new Set(['app', 'data', 'features', 'shared']),
    data: new Set(['app', 'features', 'shared']),
    shared: new Set(['app', 'data', 'features']),
    features: new Set(['app']),
  };

  if (disallowed[importerLayer]?.has(importedLayer)) {
    violations.push(`${importerRelative}: ${importerLayer} cannot import ${importedLayer} (${importedRelative})`);
  }

  if (importerLayer === 'features' && importedLayer === 'features') {
    const importerFeature = normalize(importerRelative).split('/')[1];
    const importedFeature = normalize(importedRelative).split('/')[1];
    if (importerFeature && importedFeature && importerFeature !== importedFeature) {
      violations.push(`${importerRelative}: cross-feature import ${importerFeature} -> ${importedFeature}`);
    }
  }
}

for (const file of sourceFiles) {
  if (!allowedExtensions.has(extname(file))) continue;
  const content = await readFile(file, 'utf8');
  const rel = file.startsWith(sourceRoot) ? normalize(relative(sourceRoot, file)) : normalize(relative(projectRoot, file));

  for (const rule of forbidden) {
    if (rule.regex.test(content)) violations.push(`${rel}: ${rule.name}`);
  }

  if (extname(file) === '.html' && /\son(?:click|change|submit|input|keydown|keyup)\s*=\s*["']/i.test(content)) {
    violations.push(`${rel}: inline HTML event handler`);
  }

  if (file.startsWith(sourceRoot) && rel !== 'core/logging/logger.ts' && /\bconsole\.(?:debug|info|warn|error|log)\s*\(/.test(content)) {
    violations.push(`${rel}: direct console usage outside logger`);
  }

  if (file.startsWith(sourceRoot) && /\b(?:localStorage|sessionStorage|indexedDB)\b|\bfetch\s*\(/.test(content)) {
    violations.push(`${rel}: direct persistence/network primitive outside a dedicated adapter`);
  }

  if (file.startsWith(sourceRoot)) {
    const lineCount = content.split(/\r?\n/).length;
    const generatedSnapshot = rel === 'core/supabase/database.types.ts' && content.startsWith('// AUTO-GENERATED');
    if (lineCount > 400 && !generatedSnapshot) violations.push(`${rel}: source file exceeds 400 lines (${lineCount})`);

    const importRegex = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const imported = resolveImport(rel, match[1]);
      if (imported) checkLayerBoundary(rel, imported);
    }
  }
}

const packageJson = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
for (const section of ['dependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
    if (/^[~^*]|latest|next|beta|alpha|rc/i.test(String(version))) {
      violations.push(`package.json: ${name} is not exactly pinned (${version})`);
    }
  }
}

if (violations.length) {
  console.error('ENJAZ FOUNDATION AUDIT FAIL');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log(`ENJAZ FOUNDATION AUDIT PASS — ${sourceFiles.length} source files, architecture boundaries enforced, dangerous shortcuts absent.`);
