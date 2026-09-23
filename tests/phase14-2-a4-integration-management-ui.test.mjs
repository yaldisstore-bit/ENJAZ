import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nav=fs.readFileSync('src/ui-r2/architecture/navigation-contract.ts','utf8');
const root=fs.readFileSync('src/ui-r2/runtime/UiR2Root.tsx','utf8');
const screen=fs.readFileSync('src/ui-r2/integrations/IntegrationManagementExperience.tsx','utf8');

test('A4 exposes a canonical integrations destination in R2 navigation',()=>{
  assert.match(nav,/\| 'integrations';/);
  assert.match(nav,/\['integrations', 'التكاملات وواجهات API'/);
  assert.match(nav,/\['finance', 'command', 'risk', 'integrations'\]/);
});

test('A4 routes integrations to a real screen instead of a placeholder',()=>{
  assert.match(root,/IntegrationManagementExperience/);
  assert.match(root,/id === 'integrations'/);
  assert.match(screen,/data-screen="integrations"/);
  assert.match(screen,/التكاملات وواجهات API/);
});

test('A4 management shell preserves security claims',()=>{
  for(const marker of ['Server only','Workspace bound','Fail closed','لا Service Role في الواجهة','A3 PASS'])
    assert.ok(screen.includes(marker),marker);
});
