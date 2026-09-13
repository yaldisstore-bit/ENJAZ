const fs=require('node:fs');
const {test,expect}=require('@playwright/test');
const baseUrl=process.env.R2_PHASE102_BASE_URL||'http://127.0.0.1:4182/';
const viewports=[{width:1280,height:900,name:'desktop'},{width:390,height:844,name:'mobile'},{width:320,height:720,name:'narrow'}];
fs.mkdirSync('artifacts/phase10-2-document-intelligence',{recursive:true});

for(const viewport of viewports){
 test(`Phase 10.2 governed OCR survives real workflow at ${viewport.width}px`,async({browser})=>{
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  const page=await context.newPage(),runtimeErrors=[];
  page.on('pageerror',e=>runtimeErrors.push(`pageerror:${e.message}`));
  page.on('console',m=>{if(m.type()==='error')runtimeErrors.push(`console:${m.text()}`)});
  await page.goto(`${baseUrl}phase10-2-browser.html`,{waitUntil:'domcontentloaded'});
  const vault=page.locator('[data-phase10-1="document-vault"]');
  await expect(vault).toBeVisible();
  await page.getByRole('button',{name:'سجل النسخ'}).click();
  const panel=page.locator('[data-phase10-2="document-intelligence"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-source-authority','source-file');
  await expect(panel).toHaveAttribute('data-intelligence-authority','derived-even-when-verified');
  await expect(panel.getByText('لا يوجد استخراج بعد')).toBeVisible();

  await panel.getByRole('button',{name:'استخراج من النسخة الحالية'}).click();
  const review=panel.locator('.di-review');
  await expect(review).toHaveAttribute('data-analysis-state','review_required');
  await expect(review).toHaveAttribute('data-analysis-stale','false');
  await expect(review.getByText('صفحة 1 · ثقة 92%')).toBeVisible();
  const companyField=panel.locator('.di-field').filter({hasText:'company_name'}).locator('input');
  await companyField.fill('شركة إنجاز');
  await panel.locator('textarea').fill('تمت مطابقة الاسم مع الصفحة الأولى من الأصل.');
  await panel.getByRole('button',{name:'اعتماد المراجعة'}).click();
  await expect(review).toHaveAttribute('data-analysis-state','reviewed');
  await panel.getByRole('button',{name:'تحقق نهائي من النتيجة'}).click();
  await expect(review).toHaveAttribute('data-analysis-state','verified');
  await expect(panel.getByText(/تبقى معلومة مشتقة من الأصل/)).toBeVisible();

  const afterVerify=await page.evaluate(()=>window.__ENJAZ_PHASE102_BROWSER__);
  expect(afterVerify.logs.extract.at(-1).versionNumber).toBe(1);
  expect(afterVerify.logs.review.at(-1).decision).toBe('accept');
  expect(afterVerify.logs.review.at(-1).correctedFields.company_name.value).toBe('شركة إنجاز');
  expect(afterVerify.logs.verify.length).toBe(1);
  expect(afterVerify.analyses[0].state).toBe('verified');
  expect(afterVerify.analyses[0].stale).toBe(false);

  const versionInput=page.locator('input[type="file"][hidden]');
  await versionInput.setInputFiles({name:'contract-v2.pdf',mimeType:'application/pdf',buffer:Buffer.from('phase10-2-v2')});
  await expect(review).toHaveAttribute('data-analysis-stale','true');
  await expect(panel.getByText(/توجد نسخة أصلية أحدث/)).toBeVisible();
  await expect(panel.getByRole('button',{name:'تحقق نهائي من النتيجة'})).toHaveCount(0);
  const afterVersion=await page.evaluate(()=>window.__ENJAZ_PHASE102_BROWSER__);
  expect(afterVersion.versions.length).toBe(2);
  expect(afterVersion.analyses[0].stale).toBe(true);

  await panel.getByRole('button',{name:'استخراج من النسخة الحالية'}).click();
  await expect(review).toHaveAttribute('data-analysis-state','review_required');
  await expect(review).toHaveAttribute('data-analysis-stale','false');
  const afterReextract=await page.evaluate(()=>window.__ENJAZ_PHASE102_BROWSER__);
  expect(afterReextract.logs.extract.at(-1).versionNumber).toBe(2);
  expect(afterReextract.analyses[0].sourceVersionNumber).toBe(2);
  expect(afterReextract.analyses[1].stale).toBe(true);

  const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth+2);
  expect(runtimeErrors).toEqual([]);
  await page.screenshot({path:`artifacts/phase10-2-document-intelligence/${viewport.name}.png`,fullPage:true});
  await context.close();
 });
}
