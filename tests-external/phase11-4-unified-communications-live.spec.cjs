const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const baseURL=process.env.R2_PHASE114_BASE_URL||'http://127.0.0.1:4194/';
const path='phase11-4-communications-browser.html';
const evidenceDir='artifacts/phase11-4-unified-communications';
fs.mkdirSync(evidenceDir,{recursive:true});

async function openHub(page,width,height){
  await page.setViewportSize({width,height});
  const errors=[];
  page.on('console',(message)=>{if(message.type()==='error')errors.push(`console:${message.text()}`);});
  page.on('pageerror',(error)=>errors.push(`pageerror:${error.message}`));
  await page.goto(`${baseURL}${path}`,{waitUntil:'networkidle'});
  await expect(page.locator('[data-phase11-4-unified-communications="live"]')).toBeVisible();
  return errors;
}

async function selectConversation(page){
  await page.getByRole('button',{name:/أحمد كريم/}).click();
  await expect(page.locator('[data-communications-timeline="canonical"]')).toBeVisible();
  await expect(page.locator('.r2-comms__message')).toHaveCount(4);
}

test('unified hub marks incoming unread state through governed cursor and renders canonical timeline',async({page})=>{
  const errors=await openHub(page,430,932);
  await expect(page.locator('.r2-comms__thread em')).toHaveText('1');
  await selectConversation(page);
  await expect(page.locator('.r2-comms__thread em')).toHaveCount(0);
  await expect(page.getByText('مرحباً، أرسلت المستندات المطلوبة وأحتاج تأكيد الاستلام.')).toBeVisible();
  await expect(page.getByText('تحتاج مطابقة مع المزوّد')).toBeVisible();
  expect(errors).toEqual([]);
});

test('confirmed failure exposes exactly one safe retry while reconciliation never does',async({page})=>{
  const errors=await openHub(page,390,844);
  await selectConversation(page);
  await expect(page.getByRole('button',{name:'إعادة آمنة'})).toHaveCount(1);
  const recon=page.locator('.r2-comms__message').filter({hasText:'هذه نسخة المستند المرسل سابقاً.'});
  await expect(recon).toContainText('تحتاج مطابقة مع المزوّد');
  await expect(recon.getByRole('button',{name:'إعادة آمنة'})).toHaveCount(0);
  await page.getByRole('button',{name:'إعادة آمنة'}).click();
  await expect(page.getByRole('button',{name:'إعادة آمنة'})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('manual relink review queue is explicit and clears after governed relink',async({page})=>{
  const errors=await openHub(page,360,740);
  await selectConversation(page);
  const review=page.locator('[data-communications-review="governed"]');
  await expect(review).toContainText('المستندات المطلوبة');
  await review.getByRole('button',{name:/ربط بـ أحمد كريم/}).click();
  await expect(review.getByText('قائمة المراجعة نظيفة')).toBeVisible();
  expect(errors).toEqual([]);
});

test('authorized search filters conversations without manufacturing message rows',async({page})=>{
  const errors=await openHub(page,430,932);
  const search=page.getByRole('textbox',{name:'بحث الاتصالات'});
  await search.fill('عبارة غير موجودة إطلاقاً');
  await expect(page.getByText('لا توجد محادثات مطابقة')).toBeVisible();
  await search.fill('unique incoming');
  await expect(page.getByRole('button',{name:/أحمد كريم/})).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('unified communications remains RTL and overflow-safe at all certification widths',async({page})=>{
  for(const [width,height] of [[1280,900],[430,932],[390,844],[360,740],[320,700]]){
    const errors=await openHub(page,width,height);
    const metrics=await page.evaluate(()=>({
      htmlDir:document.documentElement.dir,
      scrollWidth:document.documentElement.scrollWidth,
      bodyScrollWidth:document.body.scrollWidth,
      innerWidth:window.innerWidth,
    }));
    expect(metrics.htmlDir).toBe('rtl');
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth+1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth+1);
    const shell=await page.locator('[data-phase11-4-unified-communications="live"]').boundingBox();
    expect(shell).not.toBeNull();
    expect(shell.x).toBeGreaterThanOrEqual(0);
    expect(shell.x+shell.width).toBeLessThanOrEqual(width+1);
    expect(errors).toEqual([]);
    await page.screenshot({path:`${evidenceDir}/unified-communications-${width}.png`,fullPage:true});
  }
});
