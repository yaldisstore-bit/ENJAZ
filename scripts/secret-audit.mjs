import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const roots = ['src', 'tests', 'database', 'docs', 'scripts']
const rootFiles = ['.env.example', 'README.md', 'package.json', 'index.html']
const allowedPublishableFixtures = new Map([
  ['tests/config.test.ts', new Set(['sb_' + 'publishable_' + 'abcdefghijklmnopqrstuvwxyz'])],
])

const errors = []
const files = []

function walk(path) {
  for (const entry of readdirSync(path)) {
    if (entry === 'node_modules' || entry === '.git' || entry.endsWith('.zip')) continue
    const full = join(path, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full)
    else files.push(full)
  }
}

for (const dir of roots) {
  const full = join(ROOT, dir)
  if (existsSync(full)) walk(full)
}
for (const file of rootFiles) {
  const full = join(ROOT, file)
  if (existsSync(full)) files.push(full)
}

if (existsSync(join(ROOT, '.env.local'))) errors.push('.env.local must never be packaged')

const publishablePattern = /sb_publishable_[A-Za-z0-9_-]{16,}/g
const jwtPattern = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g

for (const full of files) {
  const rel = relative(ROOT, full).replaceAll('\\', '/')
  let text
  try {
    text = readFileSync(full, 'utf8')
  } catch {
    continue
  }

  for (const match of text.matchAll(publishablePattern)) {
    const value = match[0]
    const allowed = allowedPublishableFixtures.get(rel)?.has(value) ?? false
    if (!allowed) errors.push(`${rel}: publishable-key-shaped literal is forbidden`)
  }

  if (jwtPattern.test(text)) errors.push(`${rel}: JWT-shaped literal is forbidden`)
  jwtPattern.lastIndex = 0
}

if (errors.length > 0) {
  console.error('ENJAZ SECRET AUDIT FAIL')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('ENJAZ SECRET AUDIT PASS — no packaged client keys, JWT-shaped secrets, or .env.local detected; only the explicit test fixture is allowlisted.')
