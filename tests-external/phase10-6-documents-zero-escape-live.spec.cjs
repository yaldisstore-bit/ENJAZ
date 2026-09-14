const {test,expect}=require('@playwright/test');

const baseUrl=process.env.R2_PHASE106_BASE_URL||'http://127.0.0.1:4186/';
const viewports=[
  {name:'desktop-1280',width:1280,height:900},
  {name:'mobile-430',width:430,height:932},
  {name:'mobile-390',width:390,height:844},
  {name:'mobile-360',width:360,height:740},
  {name:'mobile-320',width:320,height:720},
];
const safePdf=text=>Buffer.from(`%PDF-1.4\n${text}\n%%EOF\n`);

for(const viewport of viewports){
  test(`Phase 10.6 Zero-Escape survives malicious/offline/retry reality at ${viewport.width}px`,async({browser})=>{
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
    const page=await context.newPage(),runtimeErrors=[];
    page.on('pageerror',error=>runtimeErrors.push(`pageerror:${error.message}`));
    page.on('console',message=>{if(message.type()==='error')runtimeErrors.push(`console:${message.text()}`)});
    await page.goto(`${baseUrl}phase10-6-browser.html`,{waitUntil:'domcontentloaded'});
    const vault=page.locator('[data-phase10-6="zero-escape"]');
    await expect(vault).toBeVisible();
    await expect(vault).toHaveAttribute('data-phase10-1','document-vault');
    await expect(vault).toHaveAttribute('data-vault-authority','documents+document_versions');
    await expect(vault).toHaveAttribute('data-binary-boundary','signed-broker-only');
    await expect(vault).toHaveAttribute('data-binary-hardening','server-inspection+checksum');
    await expect(vault).toContainText('عقد محفوظ قبل بوابة الصفر');
    await expect(vault).toContainText('فحص + SHA‑256 · بدون overwrite');

    const upload=vault.locator('form[aria-label="رفع وثيقة"]');
    const networkCount=()=>page.evaluate(()=>window.__ENJAZ_PHASE106_BROWSER__.edgeCalls.length);

    // Malicious active PDF must die in browser preflight before prepare/storage authority is contacted.
    const beforeMalicious=await networkCount();
    await upload.locator('input[name="file"]').setInputFiles({name:'active.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n1 0 obj\n<< /OpenAction 2 0 R /JavaScript (alert) >>\nendobj\n%%EOF\n')});
    await upload.locator('input[name="title"]').fill('ملف نشط مرفوض قبل الشبكة');
    await upload.getByRole('button',{name:'رفع واعتماد النسخة'}).click();
    await expect(vault.getByRole('alert')).toContainText('فشل الرفع أو التحقق؛ لم تُعتمد نسخة غير متحققة');
    expect(await networkCount()).toBe(beforeMalicious);
    await expect(vault).not.toContainText('ملف نشط مرفوض قبل الشبكة',{useInnerText:true});

    // Offline upload must consume no network attempt and duplicate online signals must collapse into one exact-ticket resume.
    await context.setOffline(true);
    const beforeOffline=await networkCount();
    await upload.locator('input[name="file"]').setInputFiles({name:'offline.pdf',mimeType:'application/pdf',buffer:safePdf('offline resume')});
    await upload.locator('input[name="title"]').fill('وثيقة معلقة بلا فقدان');
    await upload.getByRole('button',{name:'رفع واعتماد النسخة'}).click();
    await expect(vault.getByRole('alert')).toContainText('تم تعليق الرفع بأمان وسيُستأنف بنفس العملية');
    expect(await networkCount()).toBe(beforeOffline);
    await context.setOffline(false);
    await page.evaluate(()=>window.dispatchEvent(new Event('online')));
    await expect(vault).toContainText('وثيقة معلقة بلا فقدان');
    await expect(vault.getByRole('alert')).toHaveCount(0);
    const offlineFlow=await page.evaluate(()=>{
      const state=window.__ENJAZ_PHASE106_BROWSER__,uploadCall=state.uploadCalls.find(call=>call.title==='وثيقة معلقة بلا فقدان'),op=uploadCall?.operationId??null;
      return{op,edge:state.edgeCalls.filter(call=>call.operationId===op).map(call=>call.action),puts:state.storagePuts.filter(call=>call.operationId===op).length,documents:state.documents.filter(item=>item.title==='وثيقة معلقة بلا فقدان').length};
    });
    expect(offlineFlow.op).toMatch(/^[0-9a-f-]{36}$/i);
    expect(offlineFlow.edge).toEqual(['prepare','acknowledge']);
    expect(offlineFlow.puts).toBe(1);
    expect(offlineFlow.documents).toBe(1);

    // A transient prepare failure must fail reconciliation closed, then retry the exact operation identity once.
    await upload.locator('input[name="file"]').setInputFiles({name:'retry.pdf',mimeType:'application/pdf',buffer:safePdf('stable operation retry')});
    await upload.locator('input[name="title"]').fill('وثيقة إعادة المحاولة الثابتة');
    await upload.getByRole('button',{name:'رفع واعتماد النسخة'}).click();
    await expect(vault).toContainText('وثيقة إعادة المحاولة الثابتة');
    const retryFlow=await page.evaluate(()=>{
      const state=window.__ENJAZ_PHASE106_BROWSER__,uploads=state.uploadCalls.filter(call=>call.title==='وثيقة إعادة المحاولة الثابتة'),ops=uploads.map(call=>call.operationId),op=ops[0]??null,edge=state.edgeCalls.filter(call=>call.operationId===op).map(call=>call.action),prepares=state.edgeCalls.filter(call=>call.action==='prepare'&&call.fileName==='retry.pdf').map(call=>call.operationId),acks=state.edgeCalls.filter(call=>call.action==='acknowledge'&&call.operationId===op).length,puts=state.storagePuts.filter(call=>call.operationId===op).length,documents=state.documents.filter(item=>item.title==='وثيقة إعادة المحاولة الثابتة').length,operationDocumentCount=state.operationDocumentCount;
      return{ops,edge,prepares,acks,puts,documents,operationDocumentCount};
    });
    expect(retryFlow.ops.length).toBe(2);
    expect(new Set(retryFlow.ops).size).toBe(1);
    expect(retryFlow.prepares.length).toBe(2);
    expect(new Set(retryFlow.prepares).size).toBe(1);
    expect(retryFlow.prepares[0]).toBe(retryFlow.ops[0]);
    expect(retryFlow.edge).toEqual(['prepare','acknowledge','prepare','acknowledge']);
    expect(retryFlow.acks).toBe(2);
    expect(retryFlow.puts).toBe(1);
    expect(retryFlow.documents).toBe(1);
    expect(retryFlow.operationDocumentCount).toBe(2);

    // Responsive truth: no horizontal escape and touch controls stay usable through 320 px.
    const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth-window.innerWidth,body:document.body.scrollWidth-window.innerWidth}));
    expect(overflow.document,`document horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflow.body,`body horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    const controls=vault.locator('button:visible,input:visible,select:visible'),count=await controls.count();
    expect(count).toBeGreaterThan(7);
    for(let index=0;index<count;index++){const box=await controls.nth(index).boundingBox();if(box)expect(box.height,`undersized Zero-Escape control #${index} at ${viewport.width}px`).toBeGreaterThanOrEqual(40)}
    expect(runtimeErrors,`Phase 10.6 runtime errors at ${viewport.width}px`).toEqual([]);
    await page.screenshot({path:`artifacts/phase10-6-browser/${viewport.name}.png`,fullPage:true});
    await context.close();
  });
}
