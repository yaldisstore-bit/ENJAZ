import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(p:string)=>readFileSync(p,'utf8');
const nav=read('src/ui-r2/architecture/navigation-contract.ts');
const ia=JSON.parse(read('docs/UI_UX_REBIRTH_2_0_INFORMATION_ARCHITECTURE.json'));
const root=read('src/ui-r2/runtime/UiR2LiveRoot.tsx');
const lazy=read('src/ui-r2/runtime/LazyLiveProductionPortals.tsx');
const portal=read('src/ui-r2/intelligence/LiveBusinessIntelligencePortal.tsx');
const center=read('src/ui-r2/intelligence/BusinessIntelligenceCenter.tsx');

test('9.5 ui 01 — Business Intelligence owns one canonical live destination',()=>{
 assert.match(nav,/\['insights', 'مركز ذكاء الأعمال', 7, 'insights', 0, 2\]/);
 assert.equal((ia.destinations as any[]).filter(x=>x.id==='insights').length,1);
 const d=(ia.destinations as any[]).find(x=>x.id==='insights');assert.equal(d.route,'/app/insights');assert.equal(d.availability,'live');assert.equal(d.maxActionsFromHome,2);
});

test('9.5 ui 02 — intelligence launcher and feature search resolve to the canonical home',()=>{
 const group=(ia.launcherGroups as any[]).find(x=>x.id==='intelligence');assert.deepEqual(group.destinations,['insights','knowledge','copilot']);
 for(const alias of ['ذكاء','تحليلات','مؤشرات','تنبؤ'])assert.equal(ia.searchContract.aliases[alias],'insights');
 assert.match(nav,/\['intelligence', 'الذكاء والمعرفة', \['insights', 'knowledge', 'copilot'\]\]/);
});

test('9.5 ui 03 — shell keeps insights lazy instead of inflating the initial production route',()=>{
 assert.match(root,/function InsightsTarget\(\)/);assert.match(root,/destinationId==='insights'\)content=<InsightsTarget\/>/);
 assert.doesNotMatch(root,/BusinessIntelligenceCenter/);
 assert.match(lazy,/LiveBusinessIntelligencePortal/);assert.match(lazy,/destination === 'insights' \? <InsightsPortal \/>/);
});

test('9.5 ui 04 — live portal is destination-bound and replaces only the deferred target',()=>{
 assert.match(portal,/shell\.dataset\.destination==='insights'/);assert.match(portal,/createPortal\(<BusinessIntelligenceCenter\/>/);assert.match(portal,/data-live-deferred/);
});

test('9.5 ui 05 — center loads authoritative composition instead of embedding dashboard demo facts',()=>{
 assert.match(center,/loadBusinessIntelligence\(\{dataFactory,fieldOperations\},userId\)/);assert.match(center,/data-bi-authority="read-only-derived"/);assert.match(center,/data-bi-provenance="required"/);
 assert.doesNotMatch(center,/const\s+(?:demo|mock|sampleData|fakeData)\s*=/i);assert.doesNotMatch(center,/\.css['"]/);
});

test('9.5 ui 06 — forecast surface discloses confidence, method, sample size, horizon and assumptions',()=>{
 for(const marker of ['item.confidence','item.method','item.sampleCount','item.horizonDays','item.assumptions[0]'])assert.ok(center.includes(marker),`missing ${marker}`);
 assert.match(center,/data-bi-authoritative="false"/);assert.match(center,/اتجاهي/);assert.match(center,/عينات غير كافية/);
});

test('9.5 ui 07 — runtime has truthful loading/error/retry and source integrity states',()=>{
 assert.match(center,/جارٍ بناء الصورة التحليلية/);assert.match(center,/تعذر بناء الصورة التحليلية/);assert.match(center,/إعادة المحاولة/);assert.match(center,/سلامة المصدر/);assert.match(center,/نفس مساحة العمل فقط/);
});
