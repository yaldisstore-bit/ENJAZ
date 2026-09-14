const fs=require('node:fs');
const {test,expect}=require('@playwright/test');
const baseUrl=process.env.R2_PHASE103_BASE_URL||'http://127.0.0.1:4183/';
const viewports=[{width:1280,height:900,name:'desktop'},{width:390,height:844,name:'mobile'},{width:320,height:720,name:'narrow'}];
fs.mkdirSync('artifacts/phase10-3-document-factory',{recursive:true});

for(const viewport of viewports){
 test(`Phase 10.3 factory survives governed browser journey at ${viewport.width}px`,async({browser})=>{
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  const page=await context.newPage(),runtimeErrors=[];
  page.on('pageerror',e=>runtimeErrors.push(`pageerror:${e.message}`));
  page.on('console',m=>{if(m.type()==='error')runtimeErrors.push(`console:${m.text()}`)});
  await page.goto(`${baseUrl}phase10-3-browser.html`,{waitUntil:'domcontentloaded'});
  const vault=page.locator('[data-phase10-1="document-vault"]');
  await expect(vault).toBeVisible();
  await page.getByRole('button',{name:'سجل النسخ'}).click();
  const panel=page.locator('[data-phase10-3="document-factory"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-factory-authority','governed-rpc+render-proof');
  await expect(panel.getByText('مصنع الوثائق الرسمية')).toBeVisible();

  await panel.getByRole('button',{name:'إدارة القوالب'}).click();
  await expect(panel.getByText('Template Management')).toBeVisible();
  await panel.getByRole('button',{name:'تحرير النسخة العاملة'}).click();
  const nameCard=panel.locator('.rk-derived-card').filter({hasText:'اسم القالب'}).first();
  await nameCard.locator('input').fill('قالب كتاب التأسيس — Browser');
  const managerTextarea=panel.locator('.rk-official-text').filter({hasText:'Template Management'}).locator('textarea').first();
  await managerTextarea.fill('الشركة: {{company.legal_name}}\nالمعاملة: {{transaction.type}}\n[[IF company.legal_name]]بيانات الشركة مثبتة[[END]]\n[[EACH transaction.type]]| عنصر | [[ITEM]] |[[END]]');
  await panel.getByRole('button',{name:'حفظ + إنشاء نسخة ثابتة ونشرها'}).click();
  await expect(panel.getByText(/v2 · منشور/)).toBeVisible();
  await panel.getByRole('button',{name:'إغلاق إدارة القوالب'}).click();

  const compose=panel.locator('.df-compose');
  const titleInput=compose.locator('input').first();
  const issueOne=async(title)=>{
    await titleInput.fill(title);
    await compose.getByRole('button',{name:'توليد مسودة رسمية'}).click();
    const card=panel.locator('.df-draft').filter({hasText:title}).first();
    await expect(card).toBeVisible();
    await expect(card.getByText('بانتظار المراجعة')).toBeVisible();
    await card.getByRole('button',{name:'اعتماد المسودة'}).click();
    await expect(card.getByText('معتمد للإصدار')).toBeVisible();
    await card.getByRole('button',{name:'إصدار PDF واعتماد نهائي'}).click();
    await expect(card.getByText('نهائي · QR ثابت · محفوظ في Vault')).toBeVisible();
  };
  await issueOne('كتاب Browser الرسمي — أ');
  await issueOne('كتاب Browser الرسمي — ب');

  const pack=panel.locator('[data-submission-pack="transaction"]');
  await expect(pack).toBeVisible();
  await expect(pack.getByText('2 مستندات نهائية')).toBeVisible();
  await pack.getByRole('button',{name:'إنشاء حزمة التقديم من جميع المستندات النهائية'}).click();
  await expect(pack.getByText('حزمة نهائية')).toBeVisible();
  await expect(pack.getByText(/2 مرفقات/)).toBeVisible();

  const state=await page.evaluate(()=>window.__ENJAZ_PHASE103_BROWSER__);
  expect(state.logs.saveTemplate.length).toBe(1);
  expect(state.logs.createVersion.length).toBe(1);
  expect(state.logs.publishVersion.length).toBe(1);
  expect(state.logs.generate.length).toBe(2);
  expect(state.logs.review.map(x=>x.decision)).toEqual(['approve','approve']);
  expect(state.logs.finalize.length).toBe(2);
  expect(state.logs.pack.length).toBe(1);
  expect(state.drafts.filter(x=>x.status==='final').length).toBe(2);
  expect(state.drafts.every(x=>x.transactionId==='33333333-3333-4333-8333-333333333333')).toBe(true);
  expect(state.packs.length).toBe(1);
  expect(state.packs[0].status).toBe('succeeded');
  expect(state.packs[0].itemCount).toBe(2);
  expect(state.templates[0].versions.some(v=>v.versionNumber===2&&v.status==='published')).toBe(true);

  const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth+2);
  expect(runtimeErrors).toEqual([]);
  await page.screenshot({path:`artifacts/phase10-3-document-factory/${viewport.name}.png`,fullPage:true});
  await context.close();
 });
}
