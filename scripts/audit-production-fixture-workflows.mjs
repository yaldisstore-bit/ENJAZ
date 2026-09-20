import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_REF = 'juzxriirhkuzviwnhkbd';
export const PRIVILEGED_SECRET = 'secrets.ENJAZ_SUPABASE_SECRET_KEY';
export const QUARANTINED_JOB_IF = 'if: \$\{\{ false \}\}';

// Scan all workflows, including newly added ones. A branch-specific path or
// workflow_dispatch is not a safety boundary: a job on a production admin key
// must be disabled until rewritten for a verified isolated target.
export function auditProductionFixtureWorkflow(filename, yaml) {
  const findings = [];
  if (!yaml.includes(PRODUCTION_REF) || !yaml.includes(PRIVILEGED_SECRET)) return findings;
  const match = /^jobs:\s*$/m.exec(yaml);
  if (!match) return [filename + ': privileged production workflow has no jobs block'];
  const section = yaml.slice(match.index + match[0].length);
  const headers = [...section.matchAll(/^  ([a-zA-Z0-9_-]+):\s*$/gm)];
  if (!headers.length) return [filename + ': privileged production workflow has no recognizable job'];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const after = headers[i + 1];
    const job = section.slice(header.index + header[0].length, after ? after.index : undefined);
    // Require a literal job-level false, not a step-level skip or a branch
    // condition that can be bypassed by workflow_dispatch.
    const jobHeader = job.split(/^    steps:\s*$/m, 1)[0];
    const flags = [...jobHeader.matchAll(/^    if:\s*(.*)$/gm)];
    if (flags.length !== 1 || flags[0][1] !== '${{ false }}')
      findings.push(filename + ': production-admin job ' + header[1] + ' requires exactly one literal disabled job-level if');
  }
  return findings;
}

export function auditProductionFixtureWorkflows(files) {
  return files.flatMap(({ name, content }) => auditProductionFixtureWorkflow(name, content));
}

export function scanRepositoryProductionFixtures(folder = '.github/workflows') {
  const files = readdirSync(folder).filter(name => /\.ya?ml$/.test(name)).map(name => ({
    name, content: readFileSync(join(folder, name), 'utf8'),
  }));
  const flagged = files.filter(file => file.content.includes(PRODUCTION_REF) &&
    file.content.includes(PRIVILEGED_SECRET));
  return { checked: files.length, quarantined: flagged.length,
    findings: auditProductionFixtureWorkflows(files) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = scanRepositoryProductionFixtures();
  if (result.findings.length) {
    for (const issue of result.findings) console.error(issue);
    process.exitCode = 1;
  } else {
    console.log('PASS: checked ' + result.checked + ' workflow files; ' +
      result.quarantined + ' production-admin workflows have disabled jobs. ' +
      'This is a static repository safety check, not a hosted security certificate.');
  }
}
