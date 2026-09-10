const {test,expect}=require('@playwright/test');

const baseUrl=process.env.R2_PHASE92_BASE_URL||'http://127.0.0.1:4178/';
const TRANSACTION_ID='92000000-0000-4000-8000-000000000004';
const COMPANY_ID='92000000-0000-4000-8000-000000000002';
const pageUrl=(query='?dest=transactions')=>new URL(`phase9-2-browser.html${query}`,baseUrl).toString();

async function noHorizontalOverflow(page){const g=await page.evaluate(()=>({client:document.documentElement.clientWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));expect(g.doc).toBeLessThanOrEqual(g.client+1);expect(g.body).toBeLessThanOrEqual(g.client+1)}
async function openSearch(page){await page.locator('.r2-icon-button[aria-label="ابحث عن أي شيء"]').click();await expect(page.locator('[data-phase9-2-global-search="authoritative"]')).toBeVisible()}

for(const width of [1280,430,390,360,320]){
 test(`Phase 9.2 Saved Views + Global Search stay interactive and overflow-safe at ${width}px`,async({page})=>{
  const fatal=[];page.on('pageerror',e=>fatal.push(e.message));page.on('console',m=>{if(m.type()==='error')fatal.push(m.text())});
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.goto(pageUrl(),{waitUntil:'networkidle'});
  await expect(page.locator('[data-phase9-2-runtime="search-saved-views"]')).toBeVisible();
  const dock=page.locator('[data-phase9-2-saved-views="transactions"]');await expect(dock).toBeVisible();
  await expect(dock).toContainText('مناظري');
  await noHorizontalOverflow(page);

  const name=`منظر ${width}`;await dock.getByLabel('اسم المنظر').fill(name);await dock.getByRole('button',{name:'حفظ',exact:true}).click();
  const chip=dock.locator('.r2-saved-view-chip');await expect(chip).toHaveCount(1);await expect(chip).toContainText(name);
  let state=await page.evaluate(()=>window.__ENJAZ_PHASE92_BROWSER__);expect(state.saves).toBe(1);expect(state.lists).toBeGreaterThanOrEqual(2);

  page.once('dialog',async d=>{expect(d.type()).toBe('prompt');await d.accept(`معدل ${width}`)});await chip.getByRole('button',{name:'إعادة تسمية'}).click();await expect(dock.locator('.r2-saved-view-chip')).toContainText(`معدل ${width}`);
  state=await page.evaluate(()=>window.__ENJAZ_PHASE92_BROWSER__);expect(state.renames).toBe(1);

  page.once('dialog',async d=>{expect(d.type()).toBe('confirm');await d.accept()});await dock.getByRole('button',{name:'حذف'}).click();await expect(dock.locator('.r2-saved-view-chip')).toHaveCount(0);await expect(dock).toContainText('لا توجد مناظر.');
  state=await page.evaluate(()=>window.__ENJAZ_PHASE92_BROWSER__);expect(state.deletes).toBe(1);

  await openSearch(page);const input=page.locator('[data-phase9-2-global-search="authoritative"] input');await input.fill('P92 Browser');
  await expect(page.locator('[data-global-search-domain]')).toHaveCount(5);
  for(const domain of ['transactions','companies','people','procedures','documents'])await expect(page.locator(`[data-global-search-domain="${domain}"]`)).toBeVisible();
  await expect(page.locator('[data-global-search-destination^="http"]')).toHaveCount(0);
  state=await page.evaluate(()=>window.__ENJAZ_PHASE92_BROWSER__);expect(state.searches).toBeGreaterThanOrEqual(1);
  await noHorizontalOverflow(page);

  await page.locator(`[data-global-search-destination="/app/transactions/${TRANSACTION_ID}"]`).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('dest')).toBe('transactions.detail');
  expect(new URL(page.url()).searchParams.get('tx')).toBe(TRANSACTION_ID);
  expect(fatal).toEqual([]);
 });
}

test('Phase 9.2 canonical company deep-link preserves entity identity and Zero-Lost shortcuts coexist',async({page})=>{
 const fatal=[];page.on('pageerror',e=>fatal.push(e.message));page.on('console',m=>{if(m.type()==='error')fatal.push(m.text())});
 await page.setViewportSize({width:1280,height:900});await page.goto(pageUrl(),{waitUntil:'networkidle'});await openSearch(page);
 const input=page.locator('[data-phase9-2-global-search="authoritative"] input');await input.fill('P92 Browser');
 await expect(page.locator(`[data-global-search-destination="/app/companies?entity=${COMPANY_ID}"]`)).toBeVisible();
 await page.locator(`[data-global-search-destination="/app/companies?entity=${COMPANY_ID}"]`).click();
 await expect.poll(()=>new URL(page.url()).searchParams.get('dest')).toBe('companies');expect(new URL(page.url()).searchParams.get('entity')).toBe(COMPANY_ID);
 await page.goto(pageUrl(),{waitUntil:'networkidle'});await openSearch(page);await page.locator('[data-phase9-2-global-search="authoritative"] input').fill('المعاملات');
 await expect(page.locator('[data-find-source="navigation"]')).toHaveCount(1);await expect(page.locator('[data-find-source="navigation"]')).toContainText('المعاملات');
 await noHorizontalOverflow(page);expect(fatal).toEqual([]);
});
