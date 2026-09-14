const {test,expect,chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const baseUrl=process.env.R2_PHASE105_BASE_URL||'http://127.0.0.1:4185/';
const evidence=path.resolve('artifacts/phase10-5-engagement-contracts');
fs.mkdirSync(evidence,{recursive:true});

async function open(width,height=900){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width,height},locale:'ar-IQ'});
  const page=await context.newPage(),runtimeErrors=[];
  page.on('pageerror',e=>runtimeErrors.push(`pageerror:${e.message}`));
  page.on('console',m=>{if(m.type()==='error')runtimeErrors.push(`console:${m.text()}`)});
  await page.goto(`${baseUrl}phase10-5-browser.html`,{waitUntil:'domcontentloaded'});
  const panel=page.locator('[data-phase10-5="engagement-contracts"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-contract-authority','engagement_contract_revisions');
  await expect(panel).toHaveAttribute('data-money-authority','phase7-finance');
  await expect(page.getByText('Finance + Factory + Vault · بلا مخزن موازٍ')).toBeVisible();
  return{browser,context,page,panel,runtimeErrors};
}

async function noHorizontalOverflow(page){
  return page.evaluate(()=>({inner:window.innerWidth,body:document.body.scrollWidth,html:document.documentElement.scrollWidth,panel:document.querySelector('[data-phase10-5="engagement-contracts"]')?.scrollWidth??0}));
}

test('governed contract lifecycle preserves signed artifact authority and rollback hardening',async()=>{
  const{browser,page,runtimeErrors}=await open(390,844);
  try{
    await expect(page.getByRole('heading',{name:'مركز العقود والاتفاقيات'})).toBeVisible();
    const engagementSelect=page.getByLabel('التعامل التجاري');
    const documentSelect=page.getByLabel('الوثيقة النهائية');
    await expect(engagementSelect).toBeVisible();
    await expect(engagementSelect).toHaveValue('44444444-4444-4444-8444-444444444444');
    await expect(engagementSelect).toContainText('اتفاق خدمات الشركة · contract');
    await expect(documentSelect).toBeVisible();
    await expect(documentSelect).toHaveValue('55555555-5555-4555-8555-555555555555');
    await expect(documentSelect).toContainText('عقد خدمات قانونية نهائي');
    const create=page.getByRole('button',{name:'إنشاء الإصدار الخاضع للحوكمة'});
    await expect(create).toBeEnabled();
    await create.click();
    await expect(page.locator('[data-contract-status="draft"]')).toContainText('مسودة عقد');
    await page.getByRole('button',{name:'إرسال للمراجعة'}).click();
    await expect(page.locator('[data-contract-status="under_review"]')).toContainText('قيد المراجعة');
    await page.getByRole('button',{name:'اعتماد'}).click();
    await expect(page.locator('[data-contract-status="approved"]')).toContainText('معتمد');
    await page.getByRole('button',{name:'إرسال للتوقيع'}).click();
    await expect(page.locator('[data-contract-status="signature_pending"]')).toContainText('بانتظار التوقيع');
    let authority=await page.evaluate(()=>{const s=window.__ENJAZ_PHASE105_BROWSER__;const r=s.revisions[0];return{documentId:r.documentId,documentVersionId:r.documentVersionId}});
    expect(authority.documentId).toBe('77777777-7777-4777-8777-777777777777');
    expect(authority.documentVersionId).toBe('88888888-8888-4888-8888-888888888888');
    await page.getByRole('button',{name:'إرجاع قبل التوقيع'}).click();
    await expect(page.locator('[data-contract-status="approved"]')).toContainText('معتمد');
    authority=await page.evaluate(()=>{const r=window.__ENJAZ_PHASE105_BROWSER__.revisions[0];return{documentId:r.documentId,documentVersionId:r.documentVersionId,signedAt:r.signedAt}});
    expect(authority).toEqual({documentId:null,documentVersionId:null,signedAt:null});
    await page.getByRole('button',{name:'إرسال للتوقيع'}).click();
    await page.getByRole('button',{name:'تأكيد أن النسخة موقعة'}).click();
    await expect(page.locator('[data-contract-status="signed"]')).toContainText('موقّع');
    authority=await page.evaluate(()=>{const r=window.__ENJAZ_PHASE105_BROWSER__.revisions[0];return{documentId:r.documentId,documentVersionId:r.documentVersionId,signedAt:r.signedAt,source:r.signatureProvenance.source}});
    expect(authority.documentId).toBe('77777777-7777-4777-8777-777777777777');
    expect(authority.documentVersionId).toBe('88888888-8888-4888-8888-888888888888');
    expect(authority.signedAt).toBeTruthy();
    expect(authority.source).toBe('enjaz_contract_ui');
    const date=page.getByLabel('تاريخ النفاذ');
    await date.fill('2026-09-14');
    await page.getByRole('button',{name:'تفعيل العقد'}).click();
    await expect(page.locator('[data-contract-status="effective"]')).toContainText('نافذ');
    const note=page.getByPlaceholder('مثلاً سبب الإنهاء أو ملاحظة التوقيع');
    await note.fill('إنهاء معتمد لاختبار دورة الحياة');
    await page.getByRole('button',{name:'إنهاء العقد'}).click();
    await expect(page.locator('[data-contract-status="terminated"]')).toContainText('منهى');
    await page.getByRole('button',{name:'فتح الطريق لإصدار جديد'}).click();
    await expect(page.locator('[data-contract-status="superseded"]')).toContainText('مستبدل');
    await create.click();
    await expect(page.locator('[data-contract-status="draft"]').first()).toContainText('R2');
    const state=await page.evaluate(()=>({revisions:window.__ENJAZ_PHASE105_BROWSER__.revisions.map(r=>({revision:r.revision,status:r.status,supersedesRevision:r.supersedesRevision})),transitions:window.__ENJAZ_PHASE105_BROWSER__.transitions}));
    expect(state.revisions.some(r=>r.revision===1&&r.status==='superseded')).toBeTruthy();
    expect(state.revisions.some(r=>r.revision===2&&r.status==='draft'&&r.supersedesRevision===1)).toBeTruthy();
    expect(state.transitions.some(t=>t.from==='signature_pending'&&t.to==='approved'&&t.documentId===null&&t.documentVersionId===null)).toBeTruthy();
    expect(runtimeErrors).toEqual([]);
    await page.screenshot({path:path.join(evidence,'lifecycle-390.png'),fullPage:true});
    fs.writeFileSync(path.join(evidence,'lifecycle.json'),JSON.stringify(state,null,2));
  }finally{await browser.close()}
});

test('Arabic RTL contract center is usable without horizontal escape at certified widths',async()=>{
  const widths=[1280,430,390,360,320],results=[];
  for(const width of widths){
    const{browser,page,runtimeErrors}=await open(width,width===1280?900:844);
    try{
      expect(await page.evaluate(()=>document.documentElement.dir)).toBe('rtl');
      await expect(page.getByRole('button',{name:'إنشاء الإصدار الخاضع للحوكمة'})).toBeVisible();
      const geometry=await noHorizontalOverflow(page);
      expect(geometry.body).toBeLessThanOrEqual(geometry.inner+1);
      expect(geometry.html).toBeLessThanOrEqual(geometry.inner+1);
      expect(runtimeErrors).toEqual([]);
      results.push({width,...geometry});
      await page.screenshot({path:path.join(evidence,`viewport-${width}.png`),fullPage:true});
    }finally{await browser.close()}
  }
  fs.writeFileSync(path.join(evidence,'viewport-matrix.json'),JSON.stringify(results,null,2));
});
