import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

export const TOKEN_FILE_ORDER = Object.freeze([
  'primitives.css',
  'semantic.css',
  'typography.css',
  'geometry.css',
  'elevation.css',
  'motion.css',
  'components.css',
]);

export async function loadTokenModel(root) {
  const tokenRoot = resolve(root, 'src/styles/tokens');
  const definitions = new Map();
  const duplicates = [];
  const files = [];

  for (const name of TOKEN_FILE_ORDER) {
    const file = resolve(tokenRoot, name);
    const content = await readFile(file, 'utf8');
    files.push({ name, file, content });
    for (const match of content.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      const token = match[1];
      const value = match[2].trim();
      if (definitions.has(token)) duplicates.push(token);
      definitions.set(token, { value, file: relative(root, file).replaceAll('\\', '/') });
    }
  }

  function resolveToken(name, seen = new Set()) {
    if (seen.has(name)) return null;
    seen.add(name);
    const definition = definitions.get(name);
    if (!definition) return null;
    const alias = definition.value.match(/^var\((--[a-z0-9-]+)\)$/i);
    return alias ? resolveToken(alias[1], seen) : definition.value;
  }

  return { tokenRoot, files, definitions, duplicates, resolveToken };
}
