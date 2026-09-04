import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI10_BASE_URL || 'http://127.0.0.1:4180';
const outDir = process.env.UI10_ARTIFACT_DIR || 'artifacts/ui10-reality';
await fs.mkdir(outDir, { recursive: true });

const domains = [
  ['transactions','pipeline'],['companies','entity-profile'],['people','people-directory'],['finance','ledger-summary'],
  ['workflow','stage-lanes'],['automation','rule-stack'],['operations','operations-pulse'],['command','executive-focus'],
  ['risk','risk-map'],['documents','category-list-detail'],['followups','attention-inbox'],['copilot','context-assistant'],
];
const longArabic = 'طلب متابعة وتدقيق معاملة شركة ذات اسم طويل جدًا وتفاصيل تشغيلية متعددة للتأكد من التفاف النص العربي بصورة سليمة دون قص أو دفع أي عنصر خارج حدود الشاشة';
const mixedToken = 'ENJAZ-CASE-2026-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789-LONG-REFERENCE';
const hugeMoney = '999999999999999999.99 د.ع';
const forbiddenText = ['UI-10','UI-9','Reality Gate','PROOF','AUDIT','Rebirth','Preview','pipeline+','تجريبية'];

function assert(condition, message) { if (!condition) throw new Error(message); }
async function rect(locator, label) { const box = await locator.boundingBox(); assert(box, `${label}: geometry unavailable`); return box; }
async function noOverflow(page, label) {
  const value = await page.evaluate(() => ({ html: document.documentElement.scrollWidth-document.documentElement.clientWidth, body: document.body.scrollWidth-document.body.clientWidth }));
  assert(value.html <= 1 && value.body <= 1, `${label}: horizontal overflow ${JSON.stringify(value)}`);
}
async function insideViewport(locator, viewport, label, allowance=2) {
  const box = await rect(locator,label);
  assert(box.x >= -allowance && box.y >= -allowance && box.x+box.width <= viewport.width+allowance && box.y+box.height <= viewport.height+allowance, `${label}: outside viewport ${JSON.stringify(box)}`);
}
async function touchTargets(page, label) {
  const bad = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,[role="button"]')).map((el) => {
    const r=el.getBoundingClientRect(); const s=getComputedStyle(el);
    return { name:el.getAttribute('aria-label')||el.textContent?.replace(/\s+/g,' ').trim()||el.tagName, w:r.width,h:r.height, visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>.05 };
  }).filter((x)=>x.visible&&(x.w<44||x.h<44)));
  assert(bad.length===0, `${label}: undersized touch targets ${JSON.stringify(bad)}`);
}
async function noDeveloperLeak(page,label) {
  const text = await page.locator('body').innerText();
  for (const term of forbiddenText) assert(!text.includes(term), `${label}: developer/legacy text leaked: ${term}`);
  const legacyDom = await page.evaluate(() => Array.from(document.querySelectorAll('*')).filter((el) => {
    const value = `${el.className || ''} ${Array.from(el.attributes || []).map((a)=>`${a.name}=${a.value}`).join(' ')}`.toLowerCase();
    return value.includes('ui-rebirth') || value.includes('rebirth-root') || value.includes('r4-root') || value.includes('r6-root') || value.includes('v7-root') || value.includes('v8-root');
  }).length);
  assert(legacyDom===0, `${label}: legacy DOM markers detected (${legacyDom})`);
}
async function shellGeometry(page,profile,label) {
  const topbar=page.locator('[data-shell-part="topbar"]'); const dock=page.locator('[data-shell-part="bottom-dock"]');
  await insideViewport(topbar,profile.viewport,`${label}:topbar`); await insideViewport(dock,profile.viewport,`${label}:dock`);
  const dockBox=await rect(dock,`${label}:dock`); const primary=await rect(page.getByRole('button',{name:'إجراء جديد',exact:true}),`${label}:primary`);
  const delta=Math.abs((primary.x+primary.width/2)-(dockBox.x+dockBox.width/2));
  assert(delta<=2.5,`${label}: center action drifted ${delta}px`);
}
async function closeDialog(dialog) { await dialog.getByLabel('إغلاق',{exact:true}).click(); await dialog.waitFor({state:'detached',timeout:1800}); }

// Stress user/data-bearing copy, not fixed product labels/navigation. Also reject vertical clipping/overlap,
// which horizontal-overflow checks alone cannot detect.
async function stressVisibleContent(page,rootSelector,label) {
  const changed = await page.evaluate(({rootSelector,longArabic,mixedToken,hugeMoney}) => {
    const root=document.querySelector(rootSelector); if(!root) return 0;
    const selectors = [
      '.ez-row__copy strong', '.ez-row__copy small', '.ez-metric strong',
      '[data-pattern] article h2', '[data-pattern] article h3', '[data-pattern] article p', '[data-pattern] article small',
      '[data-pattern] section h2', '[data-pattern] section h3', '[data-pattern] section p', '[data-pattern] section small'
    ];
    const candidates=Array.from(root.querySelectorAll(selectors.join(','))).filter((el) => {
      const style=getComputedStyle(el); const r=el.getBoundingClientRect();
      return !el.closest('button,nav,.ez-domain-intro,.ez-domain-runtime__marker') && r.width>0 && r.height>0 && style.display!=='none' && style.visibility!=='hidden' && (el.textContent||'').trim().length>1;
    });
    const picks=[];
    for (const item of candidates) {
      if (!picks.includes(item)) picks.push(item);
      if (picks.length>=3) break;
    }
    if(picks[0]) { picks[0].dataset.ui10Stress='arabic'; picks[0].textContent=`${picks[0].textContent} — ${longArabic}`; }
    if(picks[1]) { picks[1].dataset.ui10Stress='mixed'; picks[1].textContent=`${mixedToken} — ${picks[1].textContent}`; }
    if(picks[2]) { picks[2].dataset.ui10Stress='money'; picks[2].textContent=`${hugeMoney} — ${picks[2].textContent}`; }
    return picks.length;
  },{rootSelector,longArabic,mixedToken,hugeMoney});
  assert(changed>=1,`${label}: no realistic data-bearing stress target found`);
  await page.waitForTimeout(80);
  await noOverflow(page,`${label}:stress`);
  const badContainment = await page.evaluate(() => Array.from(document.querySelectorAll('[data-ui10-stress]')).map((el) => {
    const container=el.closest('.ez-row,.ez-metric,[data-pattern] > article,[data-pattern] > section,.ez-domain-command-grid > section,.ez-domain-doc-layout > article');
    if(!container) return null;
    const a=el.getBoundingClientRect(); const b=container.getBoundingClientRect();
    const escaped=a.left < b.left-2 || a.right > b.right+2 || a.top < b.top-2 || a.bottom > b.bottom+2;
    return escaped ? {kind:el.dataset.ui10Stress,text:(el.textContent||'').slice(0,80),target:{x:a.x,y:a.y,w:a.width,h:a.height},container:{x:b.x,y:b.y,w:b.width,h:b.height}} : null;
  }).filter(Boolean));
  assert(badContainment.length===0,`${label}: stressed text escaped its visual container ${JSON.stringify(badContainment)}`);
}
async function checkGlobalSurfaces(page,profile) {
  for (const name of ['بحث','الإشعارات','الحساب','إجراء جديد','مجالات إنجاز']) assert(await page.getByRole('button',{name,exact:true}).isVisible(), `${profile.name}: missing global action ${name}`);
  const dock=page.locator('[data-shell-part="bottom-dock"]');
  for (const name of ['الرئيسية','اليوم','العمليات','المالية']) assert(await dock.getByRole('button',{name,exact:true}).isVisible(), `${profile.name}: missing dock destination ${name}`);

  await page.getByRole('button',{name:'بحث',exact:true}).click();
  const search=page.getByRole('dialog',{name:'البحث العام',exact:true}); await search.waitFor();
  await page.getByLabel('عبارة البحث').fill(`${longArabic} ${mixedToken}`);
  await page.locator('[data-state-kind="empty"]').waitFor();
  await insideViewport(page.locator('.ez-shell-search__panel'),profile.viewport,`${profile.name}:search`); await noOverflow(page,`${profile.name}:search`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-search.png`)});
  await page.getByRole('button',{name:'إغلاق البحث',exact:true}).click(); await search.waitFor({state:'detached'});

  for (const [trigger,dialogName,file] of [['الإشعارات','الإشعارات','notifications'],['الحساب','الحساب ومساحة العمل','account'],['إجراء جديد','إجراء جديد','create'],['مجالات إنجاز','مجالات إنجاز','explorer']]) {
    await page.getByRole('button',{name:trigger,exact:true}).click();
    const dialog=page.getByRole('dialog',{name:dialogName,exact:true}); await dialog.waitFor(); await page.waitForTimeout(230);
    await insideViewport(dialog,profile.viewport,`${profile.name}:${file}`); await noOverflow(page,`${profile.name}:${file}`);
    if(profile.mobile) await touchTargets(page,`${profile.name}:${file}`);
    if(profile.deep || file==='create') await page.screenshot({path:path.join(outDir,`${profile.name}-${file}.png`)});
    if(file==='explorer') assert(await page.locator('[data-domain-explorer-link]').count()===12,`${profile.name}: domain explorer lost destinations`);
    await closeDialog(dialog);
  }
}
async function checkCore(page,profile) {
  await page.locator('[data-core-screen="home"]').waitFor();
  await noDeveloperLeak(page,`${profile.name}:home`); await noOverflow(page,`${profile.name}:home`); await shellGeometry(page,profile,`${profile.name}:home`);
  if(profile.mobile) await touchTargets(page,`${profile.name}:home`);
  if(!profile.mobile) {
    const priority=await rect(page.locator('.ez-core-priority'),`${profile.name}:priority`); const signal=await rect(page.locator('.ez-core-signal'),`${profile.name}:signal`);
    assert(priority.width>signal.width*1.35,`${profile.name}: Home focal asymmetry collapsed`);
  }
  await page.screenshot({path:path.join(outDir,`${profile.name}-home.png`),fullPage:true});
  await stressVisibleContent(page,'[data-core-screen="home"]',`${profile.name}:home`);

  const dock=page.locator('[data-shell-part="bottom-dock"]');
  await dock.getByRole('button',{name:'اليوم',exact:true}).click(); await page.locator('[data-core-screen="today"]').waitFor();
  await noOverflow(page,`${profile.name}:today`); if(profile.mobile) await touchTargets(page,`${profile.name}:today`);
  assert(await page.getByRole('button',{name:'متابعة جديدة',exact:true}).isVisible(),`${profile.name}: Today lost new-followup action`);
  await stressVisibleContent(page,'[data-core-screen="today"]',`${profile.name}:today`);

  await dock.getByRole('button',{name:'العمليات',exact:true}).click(); await page.locator('[data-core-screen="operations"]').waitFor();
  assert(await page.getByRole('button',{name:'فتح مركز القيادة',exact:true}).isVisible(),`${profile.name}: Operations lost command entry`);
  await page.getByRole('button',{name:'فتح مركز القيادة',exact:true}).click(); await page.locator('[data-core-screen="command"]').waitFor();
  const commandBg=await page.locator('.ez-core-command__hero').evaluate((el)=>getComputedStyle(el).backgroundImage);
  assert(commandBg.includes('gradient'),`${profile.name}: Command lost executive visual treatment`);
  await page.getByRole('button',{name:'العودة للعمليات',exact:true}).click();

  await dock.getByRole('button',{name:'المالية',exact:true}).click(); await page.locator('[data-core-screen="finance"]').waitFor();
  assert(await page.getByText('18,450,000 د.ع',{exact:true}).isVisible(),`${profile.name}: Finance focal value disappeared`);
  await noOverflow(page,`${profile.name}:finance`); await stressVisibleContent(page,'[data-core-screen="finance"]',`${profile.name}:finance`);

  await dock.getByRole('button',{name:'الرئيسية',exact:true}).click(); await page.locator('[data-core-screen="home"]').waitFor();
}
async function checkDomains(page,profile) {
  await page.getByRole('button',{name:'مجالات إنجاز',exact:true}).click();
  const explorer=page.getByRole('dialog',{name:'مجالات إنجاز',exact:true}); await explorer.waitFor();
  await page.locator('[data-domain-explorer-link="transactions"]').click(); await page.locator('[data-domain-runtime="transactions"]').waitFor();
  const seenPatterns=new Set();
  for(let i=0;i<domains.length;i+=1){
    const [domain,pattern]=domains[i];
    if(i>0){ const link=page.locator(`[data-domain-link="${domain}"]`); await link.scrollIntoViewIfNeeded(); await link.click(); await page.locator(`[data-domain-runtime="${domain}"]`).waitFor(); }
    seenPatterns.add(pattern);
    assert(await page.locator(`[data-pattern="${pattern}"]`).count()>=1,`${profile.name}:${domain}: composition pattern disappeared (${pattern})`);
    await noDeveloperLeak(page,`${profile.name}:${domain}`); await noOverflow(page,`${profile.name}:${domain}`);
    if(profile.mobile) await touchTargets(page,`${profile.name}:${domain}`);
    if(profile.deep) await page.screenshot({path:path.join(outDir,`${profile.name}-domain-${domain}.png`),fullPage:true});
    await stressVisibleContent(page,`[data-domain-runtime="${domain}"]`,`${profile.name}:${domain}`);
    if(domain==='command') { const bg=await page.locator('.ez-domain-command').evaluate((el)=>getComputedStyle(el).backgroundImage); assert(bg.includes('gradient'),`${profile.name}: domain command lost dark treatment`); }
    if(profile.deep) await page.screenshot({path:path.join(outDir,`${profile.name}-domain-${domain}-stress.png`),fullPage:true});
  }
  assert(seenPatterns.size===12,`${profile.name}: domain composition diversity collapsed`);
  await page.getByRole('button',{name:'العودة للأساسية',exact:true}).click(); await page.locator('[data-core-screen="home"]').waitFor();
  assert(await page.locator('[data-domain-rail="true"]').count()===0,`${profile.name}: domain rail leaked into core after return`);
}

async function verifyProfile(browser,profile){
  const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:1,hasTouch:profile.mobile,isMobile:profile.mobile});
  const page=await context.newPage(); const consoleErrors=[]; const pageErrors=[];
  page.on('console',(m)=>{if(m.type()==='error')consoleErrors.push(m.text());}); page.on('pageerror',(e)=>pageErrors.push(e.message));
  await page.goto(baseUrl,{waitUntil:'networkidle',timeout:30000});
  const app=page.locator('[data-core-app="true"]'); await app.waitFor();
  assert(await app.getAttribute('data-stage')==='ui-10',`${profile.name}: runtime not frozen at UI-10`);
  assert(await page.locator('.ez-app-shell[data-stage="ui-10"]').count()===1,`${profile.name}: shell not frozen at UI-10`);
  assert(await page.locator('.vite-error-overlay').count()===0,`${profile.name}: Vite error overlay visible`);
  await checkCore(page,profile); await checkGlobalSurfaces(page,profile); if(profile.deep) await checkDomains(page,profile);
  await noDeveloperLeak(page,`${profile.name}:final`); await noOverflow(page,`${profile.name}:final`); await shellGeometry(page,profile,`${profile.name}:final`);
  if(profile.mobile) await touchTargets(page,`${profile.name}:final`);
  assert(consoleErrors.length===0,`${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length===0,`${profile.name}: page errors ${pageErrors.join(' | ')}`);
  await context.close();
  return {profile:profile.name,deep:profile.deep};
}

const browser=await chromium.launch({headless:true});
try{
  const profiles=[
    {name:'desktop-1440',viewport:{width:1440,height:1000},mobile:false,deep:true},
    {name:'phone-430',viewport:{width:430,height:932},mobile:true,deep:false},
    {name:'phone-390',viewport:{width:390,height:844},mobile:true,deep:true},
    {name:'phone-360',viewport:{width:360,height:740},mobile:true,deep:false},
    {name:'phone-320',viewport:{width:320,height:700},mobile:true,deep:true},
  ];
  const results=[]; for(const profile of profiles) results.push(await verifyProfile(browser,profile));
  const result={passed:true,freeze:'ENJAZ UI/UX 2.0',profiles:results,domains:12,legacyLeak:false,featureDisappearance:false,stressArabic:true,stressMoney:true,verticalContainment:true,touch44:true,visualDiversity:true};
  await fs.writeFile(path.join(outDir,'result.json'),JSON.stringify(result,null,2));
  console.log(`UI-10 Full Destruction Gate PASS: ${JSON.stringify(result)}`);
}finally{await browser.close();}
