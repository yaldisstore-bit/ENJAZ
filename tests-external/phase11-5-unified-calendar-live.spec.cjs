const { test, expect } = require('@playwright/test');
const fs=require('node:fs');
const baseURL=process.env.R2_PHASE115_BASE_URL||'http://127.0.0.1:4195/';
const path='phase11-5-calendar-browser.html';
const evidenceDir='artifacts/phase11-5-unified-calendar';
fs.mkdirSync(evidenceDir,{recursive:true});

async function openCalendar(page,width,height){
  await page.setViewportSize({width,height});
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`)});page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));
  await page.goto(`${baseURL}${path}`,{waitUntil:'networkidle'});
  await expect(page.locator('[data-phase11-5-unified-calendar="live"]')).toBeVisible();
  return errors;
}

test('unified calendar renders all three canonical authorities with conflict and overdue evidence',async({page})=>{
  const errors=await openCalendar(page,430,932);
  await expect(page.locator('[data-calendar-source="appointment"]')).toHaveCount(1);
  await expect(page.locator('[data-calendar-source="workflow_deadline"]')).toHaveCount(1);
  await expect(page.locator('[data-calendar-source="renewal_occurrence"]')).toHaveCount(1);
  await expect(page.locator('[data-calendar-conflict="conflict"]')).toContainText('تعارض موظف');
  await expect(page.getByText('إيداع المستندات')).toBeVisible();
  expect(errors).toEqual([]);
});

test('authority filter reloads through governed read model without manufacturing rows',async({page})=>{
  const errors=await openCalendar(page,390,844);
  await page.getByRole('combobox',{name:'تصفية مصدر التقويم'}).selectOption('renewal_occurrence');
  await expect(page.locator('[data-calendar-source="renewal_occurrence"]')).toHaveCount(1);
  await expect(page.locator('[data-calendar-source="appointment"]')).toHaveCount(0);
  await expect(page.locator('[data-calendar-source="workflow_deadline"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('ICS export stays explicitly outbound-only and produces a calendar file',async({page})=>{
  const errors=await openCalendar(page,360,740);
  await expect(page.locator('[data-calendar-export-boundary="outbound_projection_only"]')).toContainText('أحادي الاتجاه');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'تصدير ICS'}).click();
  const file=await download;
  expect(file.suggestedFilename()).toBe('enjaz-calendar.ics');
  expect(errors).toEqual([]);
});

test('unified calendar remains RTL and overflow-safe at certification widths',async({page})=>{
  for(const [width,height] of [[1280,900],[430,932],[390,844],[360,740],[320,700]]){
    const errors=await openCalendar(page,width,height);
    const metrics=await page.evaluate(()=>({dir:document.documentElement.dir,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,inner:innerWidth}));
    expect(metrics.dir).toBe('rtl');expect(metrics.html).toBeLessThanOrEqual(metrics.inner+1);expect(metrics.body).toBeLessThanOrEqual(metrics.inner+1);expect(errors).toEqual([]);
    await page.screenshot({path:`${evidenceDir}/unified-calendar-${width}.png`,fullPage:true});
  }
});
