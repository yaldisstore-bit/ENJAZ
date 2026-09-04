import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI8_BASE_URL || 'http://127.0.0.1:4178';
const outDir = process.env.UI8_ARTIFACT_DIR || 'artifacts/ui8-reality';
await fs.mkdir(outDir, { recursive: true });
const longArabic = 'طلب تعديل بيانات شركة ذات اسم طويل جدًا مع تفاصيل تشغيلية متتابعة وملاحظات إضافية للتأكد من أن النص العربي يلتف بطريقة سليمة داخل الهاتف دون كسر الواجهة أو دفع أي عنصر خارج الشاشة.';

function assert(condition, message) { if (!condition) throw new Error(message); }
async function noOverflow(page, label) {
  const value = await page.evaluate(() => ({ html: document.documentElement.scrollWidth-document.documentElement.clientWidth, body: document.body.scrollWidth-document.body.clientWidth }));
  assert(value.html <= 1 && value.body <= 1, `${label}: horizontal overflow ${JSON.stringify(value)}`);
}
async function touchTargets(page, label) {
  const bad = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
    const r = button.getBoundingClientRect(); const s = getComputedStyle(button);
    return { name: button.getAttribute('aria-label') || button.textContent?.replace(/\s+/g,' ').trim() || 'button', w:r.width, h:r.height, visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>.05 };
  }).filter((x) => x.visible && (x.w < 44 || x.h < 44)));
  assert(bad.length === 0, `${label}: undersized touch targets ${JSON.stringify(bad)}`);
}
async function insideViewport(locator, viewport, label) {
  const box = await locator.boundingBox();
  assert(box, `${label}: missing geometry`);
  assert(box.x >= -2 && box.y >= -2 && box.x + box.width <= viewport.width + 2 && box.y + box.height <= viewport.height + 2, `${label}: outside viewport ${JSON.stringify(box)}`);
}
async function ariaControl(scope, tag, label, testLabel) {
  const control = scope.locator(`${tag}[aria-label="${label}"]`);
  assert(await control.count() === 1, `${testLabel}: expected one ${tag} with aria-label ${label}`);
  return control;
}

async function verifyProduct(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors=[]; const pageErrors=[];
  page.on('console', (m) => { if (m.type()==='error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(baseUrl,{waitUntil:'networkidle',timeout:30000});
  await page.locator('[data-core-app="true"][data-stage="ui-8"]').waitFor();

  await page.getByRole('button',{name:'بحث',exact:true}).click();
  const search = page.getByRole('dialog',{name:'البحث العام',exact:true});
  await search.waitFor();
  await (await ariaControl(search,'input','عبارة البحث',`${profile.name}:search-field`)).fill('شيء غير موجود إطلاقًا');
  await page.locator('[data-state-kind="empty"]').waitFor();
  assert(await page.getByText('لا توجد نتائج مطابقة',{exact:true}).isVisible(), `${profile.name}: empty search state missing`);
  await noOverflow(page,`${profile.name}:empty-search`);
  if (profile.mobile) await touchTargets(page,`${profile.name}:empty-search`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-empty-search.png`)});
  await page.getByRole('button',{name:'إغلاق البحث',exact:true}).click();
  await search.waitFor({state:'detached'});

  await page.getByRole('button',{name:'إجراء جديد',exact:true}).click();
  const createSheet = page.getByRole('dialog',{name:'إجراء جديد',exact:true});
  await createSheet.waitFor();
  await page.locator('[data-create-form="transaction"]').waitFor();
  await createSheet.getByRole('button',{name:'مراجعة البيانات',exact:true}).click();
  assert(await createSheet.locator('[role="alert"]').count() >= 2, `${profile.name}: validation errors were not surfaced`);
  const transactionForm = createSheet.locator('[data-create-form="transaction"]');
  const transactionTitle = await ariaControl(transactionForm,'input','عنوان المعاملة',`${profile.name}:transaction-title`);
  const transactionParty = await ariaControl(transactionForm,'input','الشركة أو الجهة',`${profile.name}:transaction-party`);
  const transactionPriority = await ariaControl(transactionForm,'select','الأولوية',`${profile.name}:transaction-priority`);
  const transactionNotes = await ariaControl(transactionForm,'textarea','ملاحظات',`${profile.name}:transaction-notes`);
  assert(await transactionTitle.getAttribute('aria-invalid') === 'true', `${profile.name}: required title must expose aria-invalid after validation`);
  assert(await transactionPriority.getAttribute('aria-invalid') === 'true', `${profile.name}: required priority must expose aria-invalid after validation`);
  await transactionTitle.fill(longArabic);
  await transactionParty.fill('شركة الرافدين للتجارة العامة والاستشارات والخدمات المحدودة المسؤولية');
  await transactionPriority.selectOption('urgent');
  await transactionNotes.fill(longArabic.repeat(3));
  await noOverflow(page,`${profile.name}:transaction-form`);
  if (profile.mobile) await touchTargets(page,`${profile.name}:transaction-form`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-transaction-form.png`)});

  await createSheet.getByRole('button',{name:'مسح النموذج',exact:true}).click();
  const dangerDialog = page.locator('[data-dialog-tone="danger"]');
  await dangerDialog.waitFor();
  await page.waitForTimeout(350);
  await insideViewport(dangerDialog, profile.viewport, `${profile.name}:danger-dialog`);
  assert(await dangerDialog.getByRole('button',{name:'مسح المسودة',exact:true}).isVisible(), `${profile.name}: destructive confirm missing`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-danger-dialog.png`)});
  await dangerDialog.getByRole('button',{name:'إلغاء',exact:true}).click();
  await dangerDialog.waitFor({state:'detached'});

  await createSheet.getByRole('button',{name:'مراجعة البيانات',exact:true}).click();
  await createSheet.locator('[data-create-review="true"] [data-state-kind="success"]').waitFor();
  assert(await createSheet.getByText('لم يتم حفظ أي سجل بعد.',{exact:false}).count() >= 1, `${profile.name}: persistence disclaimer missing`);
  await noOverflow(page,`${profile.name}:transaction-review`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-transaction-review.png`)});
  await createSheet.getByRole('button',{name:'إغلاق',exact:true}).last().click();
  await createSheet.waitFor({state:'detached'});

  await page.getByRole('button',{name:'إجراء جديد',exact:true}).click();
  const paymentSheet = page.getByRole('dialog',{name:'إجراء جديد',exact:true});
  await paymentSheet.waitFor();
  await paymentSheet.locator('[data-create-type="payment"]').click();
  const paymentForm = paymentSheet.locator('[data-create-form="payment"]');
  await paymentForm.waitFor();
  await (await ariaControl(paymentForm,'input','المبلغ',`${profile.name}:payment-amount`)).fill('999999999999999.99');
  await (await ariaControl(paymentForm,'input','البيان',`${profile.name}:payment-detail`)).fill(longArabic);
  await (await ariaControl(paymentForm,'select','نوع الحركة',`${profile.name}:payment-kind`)).selectOption('receipt');
  await noOverflow(page,`${profile.name}:large-payment`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-large-payment.png`)});

  if (profile.mobile) {
    const constrained = { width: profile.viewport.width, height: Math.min(profile.viewport.height, 520) };
    await page.setViewportSize(constrained);
    await page.waitForTimeout(120);
    await insideViewport(paymentSheet, constrained, `${profile.name}:constrained-create-sheet`);
    await noOverflow(page,`${profile.name}:constrained-create-sheet`);
    await page.screenshot({path:path.join(outDir,`${profile.name}-constrained-sheet.png`)});
    await page.setViewportSize(profile.viewport);
  }

  await paymentSheet.getByRole('button',{name:'مراجعة البيانات',exact:true}).click();
  await paymentSheet.locator('[data-create-review="true"] [data-state-kind="success"]').waitFor();
  await noOverflow(page,`${profile.name}:large-payment-review`);
  await paymentSheet.getByRole('button',{name:'إغلاق',exact:true}).last().click();
  await paymentSheet.waitFor({state:'detached'});

  assert(consoleErrors.length===0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length===0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);
  await context.close();
}

async function verifyLab(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',(e)=>errors.push(e.message));
  await page.goto(`${baseUrl}/?ui8-lab=1`,{waitUntil:'networkidle',timeout:30000});
  await page.locator('[data-ui8-lab="true"]').waitFor();
  assert(await page.locator('[data-state-kind]').count() === 8, `${profile.name}: lab does not render all 8 states`);
  await noOverflow(page,`${profile.name}:lab`);
  if (profile.mobile) await touchTargets(page,`${profile.name}:lab`);
  await page.getByRole('button',{name:'اختبار إجراء تدميري',exact:true}).click();
  const dialog = page.locator('[data-dialog-tone="danger"]');
  await dialog.waitFor();
  await page.waitForTimeout(350);
  await insideViewport(dialog,profile.viewport,`${profile.name}:lab-danger`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-states-lab.png`),fullPage:true});
  await dialog.getByRole('button',{name:'إلغاء',exact:true}).click();
  assert(errors.length===0,`${profile.name}: lab page errors ${errors.join(' | ')}`);
  await context.close();
}

const browser = await chromium.launch({headless:true});
try {
  const profiles=[
    {name:'desktop-1280',viewport:{width:1280,height:900},mobile:false},
    {name:'phone-390',viewport:{width:390,height:844},mobile:true},
    {name:'phone-320',viewport:{width:320,height:700},mobile:true},
  ];
  for (const profile of profiles) {
    await verifyProduct(browser,profile);
    await verifyLab(browser,profile);
  }
  const result={passed:true,profiles:profiles.map((p)=>p.name),states:8,validatedForms:true,destructiveConfirm:true,stress:true};
  await fs.writeFile(path.join(outDir,'result.json'),JSON.stringify(result,null,2));
  console.log(`UI-8 Reality Gate PASS: ${JSON.stringify(result)}`);
} finally {
  await browser.close();
}
