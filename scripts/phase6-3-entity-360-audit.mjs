import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));
const errors = [];
const requireMarker = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`); };

const paths = {
  state: 'docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json',
  kickoff: 'docs/PHASE6_3_COMPANY_LAWYER_360_KICKOFF.md',
  prior: 'docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json',
  service: 'src/features/entity360/entity360Service.ts',
  test: 'tests/entity360Service.test.ts',
};
for (const [label, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing Phase 6.3 ${label}: ${file}`);
if (errors.length) { console.error('ENJAZ PHASE 6.3 ENTITY 360 AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state), prior = json(paths.prior), kickoff = read(paths.kickoff), service = read(paths.service), testSource = read(paths.test);
if (state.phase !== '6.3' || state.name !== 'Company / Lawyer 360°' || state.status !== 'ACTIVE') errors.push('Phase 6.3 must begin as ACTIVE with canonical identity');
if (state.baseCommit !== '57d7a3614e2d04add7fd47ae683509f69e1ca662') errors.push('Phase 6.3 must remain anchored to the certified Phase 6.2 transition main');
if (prior.status !== 'CLOSED' || prior.exitGatePassed !== true || prior.unresolvedDefectCount !== 0 || prior.phase6_3Allowed !== true || prior.nextPhase !== '6.3' || prior.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.2 canonical state does not authorize Phase 6.3');
if (state.exitGatePassed !== false || state.phase6_4Allowed !== false || state.phase7Allowed !== false || state.nextPhase != null) errors.push('ACTIVE Phase 6.3 must fail closed and keep Phase 6.4/7 locked');
if (state.productionJavaScriptBudget !== 670000) errors.push('Phase 6.3 must preserve the 670000-byte production JavaScript budget');

for (const marker of ['Status: **ACTIVE / NOT CLOSED**','Unified contextual 360° view','source-of-truth','Phase 6.4','Phase 7','670000']) requireMarker(kickoff, marker, 'kickoff');
for (const marker of ['loadCompanyDetailSource','loadContactProfileSource','loadEntity360Source','buildCompany360Source','buildContact360Source','truncatedScopes','openBlockers','safeMoney']) requireMarker(service, marker, '360 service');
for (const marker of ['company 360','contact 360','fails safe']) requireMarker(testSource, marker, '360 tests');
for (const forbidden of ['@supabase/supabase-js','createEnjazSupabaseClient','localStorage','sessionStorage','fetch(']) if (service.includes(forbidden)) errors.push(`Phase 6.3 service creates forbidden parallel data channel: ${forbidden}`);
if (/\.create\s*\(|\.update\s*\(|\.delete\s*\(/.test(service)) errors.push('Phase 6.3 360 composition service must remain read-only');

if (errors.length) {
  console.error(`ENJAZ PHASE 6.3 ENTITY 360 AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 6.3 ENTITY 360 AUDIT PASS — ACTIVE; authoritative Phase 6.1/6.2 composition only; Phase 6.4 and Phase 7 locked; 670000-byte budget preserved.');
}
