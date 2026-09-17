const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl=process.env.R2_PHASE115_BASE_URL||'http://127.0.0.1:4195/phase11-5-calendar-browser.html';
const artifactDir=process.env.R2_PHASE115_ARTIFACT_DIR||'artifacts/phase11-5-unified-calendar';
fs.mkdirSync(artifactDir,{recursive:true});
const profiles=[['desktop-1280',1280,900],['phone-430',430,932],['phone-390',390,844],['phone-360',360,740],['phone-320',320,700]];

async function overflow(page){return page.evaluate(()=>({html:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth}));}

for(const [name,width,height] of profiles){
  test(`${name}: unified calendar is truthful, responsive and export-only`,async({browser})=>{
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:30000});
    const calendar=page.locator('[data-phase11-5d-unified-calendar="live"]');
    await expect(calendar).toBeVisible({timeout:15000});
    await expect(page.getByRole('heading',{name:'التقويم والمواعيد'})).toBeVisible();
    await expect(page.locator('[data-calendar-summary="canonical"]')).toContainText('4 عنصرًا');
    await expect(page.locator('[data-calendar-export-boundary="outbound_projection_only"]')).toContainText('ICS');
    await expect(page.locator('[data-calendar-items="canonical"] article')).toHaveCount(4);

    const view=page.getByLabel('العرض');
    for(const [value,label] of [['day','يوم'],['week','أسبوع'],['month','شهر'],['agenda','أجندة']]){
      await view.selectOption(value);
      await expect(calendar).toHaveAttribute('data-calendar-view',value);
      await expect(view).toHaveValue(value);
      await expect(view.locator(`option[value="${value}"]`)).toHaveText(label);
    }

    const source=page.getByLabel('المصدر');
    await source.selectOption('appointment');
    await expect(page.locator('[data-calendar-items="canonical"] article')).toHaveCount(2);
    await expect(page.locator('[data-calendar-source="appointment"]')).toHaveCount(2);

    const company=page.getByLabel('الشركة');
    const companyOptions=await company.locator('option').count();
    expect(companyOptions).toBeGreaterThanOrEqual(3);
    await company.selectOption({index:1});
    await expect(page.locator('[data-calendar-items="canonical"] article')).toHaveCount(1);

    await company.selectOption('');
    const staff=page.getByLabel('الموظف');
    await staff.selectOption({index:1});
    await expect(source).toHaveValue('appointment');
    await expect(page.locator('[data-calendar-items="canonical"] article')).toHaveCount(1);

    await staff.selectOption('');
    await source.selectOption('all');
    const transaction=page.getByLabel('المعاملة');
    await transaction.selectOption({index:1});
    await expect(page.locator('[data-calendar-items="canonical"] article')).toHaveCount(2);
    await transaction.selectOption('');

    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'تصدير ICS'}).click();
    const download=await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^enjaz-calendar-\d{4}-\d{2}-\d{2}\.ics$/);

    await context.setOffline(true);
    await expect(page.locator('[data-calendar-offline="true"]')).toBeVisible();
    await expect(page.locator('[data-calendar-offline="true"]')).toContainText('دون اتصال');
    await context.setOffline(false);

    const measured=await overflow(page);
    expect(measured.html).toBeLessThanOrEqual(1);
    expect(measured.body).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.screenshot({path:path.join(artifactDir,`${name}-calendar.png`),fullPage:true});
    await context.close();
  });
}
