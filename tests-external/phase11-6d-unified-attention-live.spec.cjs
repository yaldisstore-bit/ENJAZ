const {test,expect,chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const base=process.env.R2_PHASE116D_BASE_URL||'http://127.0.0.1:4186/';
const evidence=path.resolve('artifacts/phase11-6d-unified-attention');
fs.mkdirSync(evidence,{recursive:true});

async function open(width,{offline=false,fail=false}={}){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width,height:width>800?900:844},locale:'ar-IQ'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(`${base}phase10-5-browser.html${fail?'?attention=fail':''}`,{waitUntil:'domcontentloaded'});
  if(offline){await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));}
  const panel=page.locator('[data-phase11-6d="unified-attention"][data-projection-only="true"]');
  await expect(panel).toBeVisible();
  return{browser,context,page,panel,errors};
}

for(const width of [1280,430,390,360,320])test(`11.6-D unified RTL attention stays usable at ${width}px`,async()=>{
  const{browser,page,panel,errors}=await open(width);
  try{
    await expect(page.locator('html')).toHaveAttribute('dir','rtl');
    await expect(panel.getByText('استكمال بيانات',{exact:true})).toBeVisible();
    await expect(panel.getByText('قرار عميل',{exact:true})).toBeVisible();
    await expect(panel.getByText('تجديد عقد',{exact:true})).toBeVisible();
    await expect(panel.getByText('توجد حالة أحدث',{exact:true})).toBeVisible();
    await expect(panel.getByText('اتصال موثق',{exact:true})).toBeVisible();
    await expect(panel.getByRole('link',{name:'فتح المصدر'})).toHaveCount(2);
    const geometry=await page.evaluate(()=>({inner:innerWidth,body:document.body.scrollWidth,html:document.documentElement.scrollWidth}));
    expect(geometry.body).toBeLessThanOrEqual(geometry.inner+1);
    expect(geometry.html).toBeLessThanOrEqual(geometry.inner+1);
    expect(errors).toEqual([]);
    await page.screenshot({path:path.join(evidence,`viewport-${width}.png`),fullPage:true});
  }finally{await browser.close()}
});

test('11.6-D exposes offline truth without inventing fresh authority',async()=>{
  const{browser,page,panel,errors}=await open(390,{offline:true});
  try{
    await expect(panel.getByText('غير متصل',{exact:true})).toBeVisible();
    await expect(panel).toHaveAttribute('data-projection-only','true');
    expect(errors).toEqual([]);
  }finally{await browser.close()}
});

test('11.6-D projection read failure does not block canonical contract owner surface',async()=>{
  const{browser,page,panel,errors}=await open(390,{fail:true});
  try{
    await expect(panel.getByRole('status')).toContainText('تعذر تحديث المتابعة');
    await expect(page.getByRole('heading',{name:'مركز العقود والاتفاقيات'})).toBeVisible();
    await expect(page.getByRole('button',{name:'إنشاء الإصدار الخاضع للحوكمة'})).toBeEnabled();
    expect(errors).toEqual([]);
  }finally{await browser.close()}
});
