const { test, expect } = require('@playwright/test');

const baseUrl=process.env.R2_PHASE96_BASE_URL||'http://127.0.0.1:4182/';
const viewports=[
 {name:'desktop-1280',width:1280,height:900},
 {name:'mobile-430',width:430,height:932},
 {name:'mobile-390',width:390,height:844},
 {name:'mobile-360',width:360,height:740},
 {name:'mobile-320',width:320,height:720},
];

for(const viewport of viewports){
 test(`Phase 9.6 process intelligence is truthful, navigable and stable at ${viewport.width}px`,async({browser})=>{
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  const page=await context.newPage(),runtimeErrors=[];
  page.on('pageerror',error=>runtimeErrors.push(`pageerror:${error.message}`));
  page.on('console',message=>{if(message.type()==='error')runtimeErrors.push(`console:${message.text()}`)});

  await page.goto(`${baseUrl}phase9-6-browser.html`,{waitUntil:'networkidle'});
  await expect(page.locator('[data-phase9-6-business-default="true"]')).toBeVisible();
  await expect(page.getByRole('heading',{name:'مركز ذكاء الأعمال'})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('view')).toBeNull();

  await page.getByRole('button',{name:'ذكاء العمليات'}).click();
  await expect(page).toHaveURL(/view=process/);
  const center=page.locator('[data-phase9-6-runtime="process-intelligence"]');
  await expect(center).toBeVisible();
  await expect(center).toHaveAttribute('data-process-authority','read-only-derived');
  await expect(center).toHaveAttribute('data-process-provenance','required');
  await expect(center.getByRole('heading',{name:'ذكاء العمليات'})).toBeVisible();
  await expect(center).toContainText('إيصالات المزامنة دليل سلامة فقط وليست جزءًا من مسار العملية.');

  const cases=center.locator('[data-process-case]');
  expect(await cases.count()).toBe(6);
  await expect(center.locator('[data-process-ordering="partial"]')).toHaveCount(1);
  await expect(center.locator('[data-process-ordering="partial"]')).toContainText('ترتيب جزئي');
  await expect(center.locator('[data-process-rework="true"]')).toContainText('إعادة العمل');
  await expect(center.locator('[data-process-rework="true"]')).toContainText('1');
  await expect(center.locator('[data-process-bottlenecks="true"]')).toContainText('الاختناق');

  const next=center.locator('[data-process-next-prediction="true"]');
  await expect(next).toHaveAttribute('data-process-prediction-method','empirical_next_activity_frequency');
  await expect(next).toHaveAttribute('data-process-prediction-confidence','directional');
  await expect(next).toContainText('4 عينة');
  await expect(next).toContainText('دليل المصدر 8');
  await expect(next).toContainText('75%');

  const delay=center.locator('[data-process-delay-prediction="true"]');
  await expect(delay).toHaveAttribute('data-process-prediction-method','empirical_wait_threshold_frequency');
  await expect(delay).toHaveAttribute('data-process-prediction-confidence','directional');
  await expect(delay).toHaveAttribute('data-process-delay-threshold-ms','86400000');
  await expect(delay).toContainText('4 عينة');
  await expect(delay).toContainText('0%');
  await expect(delay).toContainText('لا تدخل الأحداث متساوية الزمن في عينة التأخر');

  await center.locator('[data-process-threshold-hours="4"]').click();
  await expect(delay).toHaveAttribute('data-process-delay-threshold-ms','14400000');
  await expect(delay).toContainText('2 تأخر');
  await expect(delay).toContainText('50%');
  await center.locator('[data-process-threshold-hours="72"]').click();
  await expect(delay).toHaveAttribute('data-process-delay-threshold-ms','259200000');
  await expect(delay).toContainText('0%');

  await page.goBack();
  await expect(page.locator('[data-phase9-6-business-default="true"]')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('view')).toBeNull();
  await page.goForward();
  await expect(center).toBeVisible();
  expect(new URL(page.url()).searchParams.get('view')).toBe('process');
  await page.reload({waitUntil:'networkidle'});
  await expect(center).toBeVisible();
  expect(new URL(page.url()).searchParams.get('view')).toBe('process');

  const state=await page.evaluate(()=>window.__ENJAZ_PHASE96_BROWSER__);
  expect(state.workspaceId).toBe('11111111-1111-4111-8111-111111111111');
  expect(state.caseCount).toBe(6);
  expect(state.partialCount).toBe(1);
  expect(state.reworkCount).toBe(1);
  expect(state.predictionCases).toBe(4);

  const overflow=await page.evaluate(()=>({
   document:document.documentElement.scrollWidth-window.innerWidth,
   body:document.body.scrollWidth-window.innerWidth,
   main:document.getElementById('r2-main').scrollWidth-document.getElementById('r2-main').clientWidth,
  }));
  expect(overflow.document,`document horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
  expect(overflow.body,`body horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
  expect(overflow.main,`main horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

  const rows=center.locator('.r2-launcher-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(12);
  for(let i=0;i<await rows.count();i+=1){const box=await rows.nth(i).boundingBox();if(!box)continue;expect(box.width,`collapsed process row #${i} at ${viewport.width}px`).toBeGreaterThan(120);expect(box.height,`undersized process row #${i} at ${viewport.width}px`).toBeGreaterThanOrEqual(36)}

  expect(runtimeErrors,`runtime errors at ${viewport.width}px`).toEqual([]);
  await page.screenshot({path:`artifacts/phase9-6-process-mining/${viewport.name}.png`,fullPage:true});
  await context.close();
 });
}
