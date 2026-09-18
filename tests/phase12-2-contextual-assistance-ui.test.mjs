import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const portal=fs.readFileSync('src/ui-r2/copilot/LiveCopilotPortal.tsx','utf8');
const lazy=fs.readFileSync('src/ui-r2/runtime/LazyLiveProductionPortals.tsx','utf8');
const root=fs.readFileSync('src/ui-r2/runtime/UiR2ProductionRoot.tsx','utf8');
const live=fs.readFileSync('src/ui-r2/runtime/UiR2LiveRoot.tsx','utf8');

test('12.2 UI activates Copilot only through a lazy live portal',()=>{
 assert.match(lazy,/lazy\(\(\) => import\('\.\.\/copilot\/LiveCopilotPortal\.tsx'\)/);
 assert.match(lazy,/value === 'copilot'/);
 assert.match(lazy,/destination === 'copilot' \? <CopilotPortal workspace=\{documentWorkspace\} invoke=\{copilotInvoke\} \/>/);
 assert.doesNotMatch(root,/LiveCopilotPortal|\.\.\/copilot\//);
 assert.match(live,/data-live-deferred="true"/);
});

test('12.2 live portal exposes all read-only contextual operations and citations',()=>{
 for(const operation of ['explain','search','summarize','draft','compare'])assert.ok(portal.includes("'"+operation+"'"),operation);
 for(const marker of ['data-copilot-stage="12.2"','data-copilot-authority="read-only-context"','قراءة فقط · لا ينفذ أي إجراء','enjaz.copilot.context.v1','crypto.randomUUID()','c.destination.startsWith(\'/app/\')','result?.citations.map'])assert.ok(portal.includes(marker),marker);
 assert.match(root,/client\.edge\('enjaz-copilot-context'/);
});

test('12.2 browser surface has no agentic write or provider authority',()=>{
 const all=portal+'\n'+root;
 for(const forbidden of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','generateText','streamText','service_role','SUPABASE_SECRET','localStorage.','.from(\'transactions\')','.from(\'companies\')','insert(','update(','delete('])assert.equal(all.includes(forbidden),false,forbidden);
 assert.doesNotMatch(portal,/fetch\(/);
});

test('12.2 UI reuses frozen styles instead of adding phase CSS',()=>{
 assert.equal(fs.existsSync('src/ui-r2/copilot/copilot.css'),false);
 assert.match(root,/\.\.\/operational-intelligence\/operational-intelligence\.css/);
});
