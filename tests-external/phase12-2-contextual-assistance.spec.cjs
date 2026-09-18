const {test,expect}=require('@playwright/test');
const base=process.env.R2_PHASE122_BASE_URL||'http://127.0.0.1:4197/';
const sizes=[1280,430,390,360,320];

for(const width of sizes)test('Phase 12.2 live Copilot is grounded, usable and stable at '+width+'px',async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:width>500?900:820},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('pageerror:'+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});
 await page.goto(base+'phase12-2-browser.html',{waitUntil:'networkidle'});
 const copilot=page.locator('[data-copilot-stage="12.2"]');
 await expect(copilot).toBeVisible();
 await expect(copilot).toHaveAttribute('data-copilot-authority','read-only-context');
 await expect(page.locator('[data-live-deferred="true"]')).toBeHidden();
 await expect(copilot.getByRole('heading',{name:'مساعد إنجاز'})).toBeVisible();
 await expect(copilot).toContainText('قراءة فقط · لا ينفذ أي إجراء');
 for(const label of ['اشرح','ابحث','لخّص','مسودة','قارن'])await expect(copilot.getByRole('button',{name:label})).toBeVisible();
 const input=copilot.getByLabel('رسالة إلى مساعد إنجاز');
 await input.fill('شركة ألف');
 await copilot.getByRole('button',{name:'إرسال'}).click();
 await expect(copilot).toContainText('إجابة سياقية موثقة للاختبار فقط.');
 await expect(copilot).toContainText('S1 · شركة ألف — بغداد');
 await copilot.getByRole('button',{name:'قارن'}).click();
 const second=copilot.getByLabel('السياق الثاني للمقارنة');
 await expect(second).toBeVisible();await second.fill('معاملة باء');
 await copilot.getByRole('button',{name:'إرسال'}).click();
 await expect(copilot).toContainText('A1 · شركة ألف — بغداد');
 await expect(copilot).toContainText('B1 · معاملة باء — قيد المتابعة');
 for(const [label,op] of [['ابحث','search'],['لخّص','summarize'],['مسودة','draft'],['اشرح','explain']]){
  await copilot.getByRole('button',{name:label}).click();await copilot.getByRole('button',{name:'إرسال'}).click();
  await expect.poll(async()=>page.evaluate(()=>window.__ENJAZ_PHASE122_BROWSER__?.calls.at(-1)?.operation)).toBe(op);
 }
 const calls=await page.evaluate(()=>window.__ENJAZ_PHASE122_BROWSER__?.calls??[]);
 expect(new Set(calls.map(x=>x.operation))).toEqual(new Set(['search','summarize','compare','draft','explain']));
 const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth-window.innerWidth,body:document.body.scrollWidth-window.innerWidth,main:document.getElementById('r2-main').scrollWidth-document.getElementById('r2-main').clientWidth}));
 expect(overflow.document).toBeLessThanOrEqual(1);expect(overflow.body).toBeLessThanOrEqual(1);expect(overflow.main).toBeLessThanOrEqual(1);
 expect(errors).toEqual([]);
 await context.close();
});
