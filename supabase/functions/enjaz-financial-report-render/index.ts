import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.114.0';
import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import QRCode from 'npm:qrcode@1.5.4';
import bwipjs from 'npm:bwip-js@4.5.1';
import {drawArabicText,measureArabicText} from 'npm:arabic-bidi-shaper@0.1.1/pdf-lib';
import {buildServerFinancialReport,reportIdentity,type Query,type Snapshot,type Source} from './finance-core.ts';

const FONT_URL='https://raw.githubusercontent.com/notofonts/noto-fonts/ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf';
const A4:[number,number]=[595.28,841.89];
const MARGIN=46,RIGHT=A4[0]-MARGIN,CONTENT_WIDTH=A4[0]-MARGIN*2,TOP=A4[1]-54,FOOTER_TOP=64,CONTENT_BOTTOM=92;
const BODY_HEIGHT=TOP-CONTENT_BOTTOM;
const PAGE_BATCH=1000,MAX_ROWS_PER_TABLE=10_000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cors={
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization,content-type,x-client-info,apikey',
 'Access-Control-Allow-Methods':'POST,OPTIONS',
 'Access-Control-Expose-Headers':'content-disposition,x-enjaz-report-fingerprint,x-enjaz-report-pages,x-enjaz-report-identity',
 'Cache-Control':'no-store',
};
let fontPromise:Promise<Uint8Array>|null=null;
type J=Record<string,unknown>;
type Supa=ReturnType<typeof createClient>;

function json(status:number,body:J){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}})}
function object(v:unknown):J{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_INPUT');return v as J}
function text(v:unknown,max=320){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw new Error('INVALID_INPUT');return v.trim()}
function uuid(v:unknown){const s=text(v,64);if(!UUID.test(s))throw new Error('INVALID_UUID');return s}
function optionalUuid(v:unknown){if(v===null||v===undefined||v==='')return null;return uuid(v)}
function optionalDate(v:unknown){if(v===null||v===undefined||v==='')return null;const s=text(v,80);if(!Number.isFinite(Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s)?`${s}T00:00:00.000Z`:s)))throw new Error('INVALID_DATE');return s}
function publicKey(){const modern=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');if(modern)try{const p=JSON.parse(modern) as Record<string,string>;if(p.default)return p.default}catch{}const legacy=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY');if(legacy)return legacy;throw new Error('SERVER_PUBLIC_KEY_UNAVAILABLE')}
async function arabicFont(){if(!fontPromise)fontPromise=(async()=>{const res=await fetch(FONT_URL,{headers:{Accept:'font/ttf,application/octet-stream'}});if(!res.ok)throw new Error('FONT_FETCH_FAILED');const bytes=new Uint8Array(await res.arrayBuffer());if(bytes.byteLength<100_000||bytes.byteLength>1_000_000)throw new Error('FONT_INVALID');return bytes})();return fontPromise}
async function qrPng(payload:string){const data=await QRCode.toDataURL(payload,{errorCorrectionLevel:'M',margin:0,width:220});const encoded=data.slice(data.indexOf(',')+1),raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
async function barcodePng(payload:string){const buffer=await bwipjs.toBuffer({bcid:'code128',text:payload,scale:2,height:9,includetext:false,paddingwidth:0,paddingheight:0,backgroundcolor:'FFFFFF'});return new Uint8Array(buffer)}
function toNumber(v:unknown,label:string){const n=typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;if(!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100)))throw new Error(`INVALID_MONEY_${label}`);return n}
function rowObject(v:unknown){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('SOURCE_ROW_INVALID');return v as J}

async function readAll(client:Supa,table:string,columns:string,workspaceId:string):Promise<J[]>{
 const rows:J[]=[];
 for(let from=0;from<MAX_ROWS_PER_TABLE;from+=PAGE_BATCH){
  const {data,error}=await client.from(table).select(columns).eq('workspace_id',workspaceId).range(from,from+PAGE_BATCH-1);
  if(error)throw new Error(`SOURCE_READ_${table.toUpperCase()}`);
  const batch=(data??[]).map(rowObject);rows.push(...batch);
  if(batch.length<PAGE_BATCH)return rows;
 }
 throw new Error(`SOURCE_TOO_LARGE_${table.toUpperCase()}`);
}

async function loadSource(client:Supa,workspaceId:string):Promise<Source>{
 const [companies,transactions,payments,paymentReversals,ledger,cashboxes]=await Promise.all([
  readAll(client,'companies','id,workspace_id,legal_name,display_name',workspaceId),
  readAll(client,'transactions','id,workspace_id,company_id,type,current_fee,deleted_at,legacy_id',workspaceId),
  readAll(client,'payments','id,workspace_id,transaction_id,company_id,amount,paid_at,status,receipt_ref,cashbox_id',workspaceId),
  readAll(client,'payment_reversals','id,workspace_id,payment_id',workspaceId),
  readAll(client,'financial_ledger_entries','id,workspace_id,transaction_id,company_id,entry_type,direction,amount,category,occurred_at,status',workspaceId),
  readAll(client,'cashbox_accounts','id,workspace_id,name,opening_balance,active',workspaceId),
 ]);
 return{
  companies:companies.map(r=>({id:String(r.id),workspace_id:String(r.workspace_id),legal_name:String(r.legal_name??''),display_name:r.display_name==null?null:String(r.display_name)})),
  transactions:transactions.map(r=>({id:String(r.id),workspace_id:String(r.workspace_id),company_id:String(r.company_id),type:String(r.type??''),current_fee:toNumber(r.current_fee,'transaction'),deleted_at:r.deleted_at==null?null:String(r.deleted_at),legacy_id:r.legacy_id==null?null:String(r.legacy_id)})),
  payments:payments.map(r=>({id:String(r.id),workspace_id:String(r.workspace_id),transaction_id:String(r.transaction_id),company_id:String(r.company_id),amount:toNumber(r.amount,'payment'),paid_at:String(r.paid_at),status:String(r.status??''),receipt_ref:String(r.receipt_ref??''),cashbox_id:r.cashbox_id==null?null:String(r.cashbox_id)})),
  paymentReversals:paymentReversals.map(r=>({id:String(r.id),workspace_id:String(r.workspace_id),payment_id:String(r.payment_id)})),
  ledger:ledger.map(r=>({id:String(r.id),workspace_id:String(r.workspace_id),transaction_id:r.transaction_id==null?null:String(r.transaction_id),company_id:r.company_id==null?null:String(r.company_id),entry_type:String(r.entry_type??''),direction:String(r.direction??''),amount:toNumber(r.amount,'ledger'),category:r.category==null?null:String(r.category),occurred_at:String(r.occurred_at),status:String(r.status??'')})),
  cashboxes:cashboxes.map(r=>({id:String(r.id),workspace_id:String(r.workspace_id),name:String(r.name??''),opening_balance:toNumber(r.opening_balance,'cashbox'),active:r.active===true})),
 };
}

function money(cents:bigint){const neg=cents<0n,abs=neg?-cents:cents,whole=(abs/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','),fraction=abs%100n;return`${neg?'-':''}${whole}${fraction?`.${fraction.toString().padStart(2,'0').replace(/0$/,'')}`:''} د.ع`}
function wrap(value:string,font:PDFFont,size:number,maxWidth:number){const source=value.replace(/\s+/g,' ').trim();if(!source)return[''];const words=source.split(' '),lines:string[]=[];let line='';for(const word of words){const candidate=line?`${line} ${word}`:word;if(measureArabicText(candidate,font,size)<=maxWidth){line=candidate;continue}if(line)lines.push(line);if(measureArabicText(word,font,size)<=maxWidth){line=word;continue}let chunk='';for(const ch of [...word]){const next=chunk+ch;if(chunk&&measureArabicText(next,font,size)>maxWidth){lines.push(chunk);chunk=ch}else chunk=next}line=chunk}if(line)lines.push(line);return lines.length?lines:['']}
function drawRtl(page:PDFPage,value:string,font:PDFFont,size:number,y:number,x=RIGHT,color=rgb(.1,.12,.17)){drawArabicText(page,value,{font,size,x,y,color})}

async function renderPdf(report:Snapshot,workspaceId:string){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(await arabicFont(),{subset:true});const identity=reportIdentity(workspaceId,report),qr=await pdf.embedPng(await qrPng(identity)),barcode=await pdf.embedPng(await barcodePng(report.fingerprint));
 pdf.setTitle(report.title);pdf.setAuthor('ENJAZ');pdf.setCreator('ENJAZ Reports & PDF 10.4');pdf.setProducer('ENJAZ Governed Financial Report Renderer');pdf.setSubject(report.fingerprint);const stableDate=new Date(report.to??report.from??'2026-01-01T00:00:00.000Z');const metaDate=Number.isFinite(stableDate.getTime())?stableDate:new Date('2026-01-01T00:00:00.000Z');pdf.setCreationDate(metaDate);pdf.setModificationDate(metaDate);
 let page=pdf.addPage(A4),y=TOP;
 const newPage=()=>{page=pdf.addPage(A4);y=TOP};
 const ensure=(height:number)=>{if(height>BODY_HEIGHT)throw new Error('PDF_BLOCK_TOO_TALL');if(y-height<CONTENT_BOTTOM)newPage()};
 const paragraph=(value:string,size=11.5,lineHeight=19,gap=5)=>{const lines=wrap(value,font,size,CONTENT_WIDTH);const height=lines.length*lineHeight+gap;ensure(height);for(const line of lines){drawRtl(page,line,font,size,y);y-=lineHeight}y-=gap};
 const heading=(value:string,size=16)=>{ensure(34);drawRtl(page,value,font,size,y,RIGHT,rgb(.07,.09,.15));y-=25;page.drawLine({start:{x:MARGIN,y:y+7},end:{x:RIGHT,y:y+7},thickness:.7,color:rgb(.82,.67,.14)});y-=9};
 const table=(title:string,headers:string[],rows:string[][],widths:number[])=>{heading(title,14);const total=widths.reduce((a,b)=>a+b,0);if(Math.abs(total-CONTENT_WIDTH)>.1)throw new Error('PDF_TABLE_WIDTH_INVALID');const drawRow=(cells:string[],header=false)=>{const wrapped=cells.map((cell,i)=>wrap(cell,font,header?10.2:9.6,widths[i]-10)),rowHeight=Math.max(26,...wrapped.map(lines=>lines.length*15+9));if(rowHeight>220)throw new Error('PDF_ROW_TOO_TALL');if(y-rowHeight<CONTENT_BOTTOM){newPage();drawRow(headers,true)}let x=MARGIN;for(let i=0;i<widths.length;i++){page.drawRectangle({x,y:y-rowHeight,width:widths[i],height:rowHeight,borderColor:rgb(.75,.77,.81),borderWidth:.45,color:header?rgb(.95,.94,.9):undefined});let cy=y-15;for(const line of wrapped[i]){drawRtl(page,line,font,header?10.2:9.6,cy,x+widths[i]-5,header?rgb(.12,.13,.16):rgb(.16,.17,.2));cy-=15}x+=widths[i]}y-=rowHeight};drawRow(headers,true);if(rows.length){for(const row of rows)drawRow(row)}else drawRow(['لا توجد بيانات ضمن هذا النطاق',...Array(Math.max(0,headers.length-1)).fill('')]);y-=13};

 drawRtl(page,'إنجاز — تقرير مالي رسمي',font,10.5,y,RIGHT,rgb(.42,.44,.5));y-=20;drawRtl(page,report.title,font,21,y,RIGHT,rgb(.05,.07,.13));y-=34;paragraph(`${report.from?.slice(0,10)??'بداية السجل'} ← ${report.to?.slice(0,10)??'نهاية السجل'}`,10.5,17,9);
 heading('الإجماليات',14);
 for(const [label,value] of [['الأتعاب الحالية',report.totals.currentFeesCents],['المحصّل بالفترة',report.totals.collectedCents],['الرصيد المفتوح',report.totals.outstandingAtSnapshotCents],['صافي الحركة',report.totals.netCashMovementCents]] as const){ensure(25);drawRtl(page,`${label}: ${money(value)}`,font,11.5,y);y-=23}y-=4;
 table('حركة الفترة',['التاريخ','المصدر','المرجع','الحالة','القيمة'],report.movements.map(m=>[m.occurredAt.slice(0,10),m.source==='payment'?'دفعة':'قيد',m.title,m.status==='reversed'?'معكوس':'مرحّل',money(m.effectiveCents)]),[76,58,164,72,133.28]);
 table('الأرصدة الحالية',['المعاملة','الشركة','الأتعاب','المفتوح'],report.receivables.map(r=>[r.transactionLabel,r.companyLabel,money(r.currentFeeCents),money(r.outstandingCents)]),[123,154,113,113.28]);
 heading('المصدر والتدقيق',14);paragraph(`بصمة التقرير: ${report.fingerprint}`,10.2,17,4);for(const disclosure of report.disclosures)paragraph(disclosure,10.3,17,6);
 ensure(104);page.drawRectangle({x:MARGIN,y:y-78,width:CONTENT_WIDTH,height:78,borderColor:rgb(.68,.7,.75),borderWidth:.7});drawRtl(page,'منطقة التوقيع والختم',font,11,y-22);page.drawLine({start:{x:RIGHT-210,y:y-55},end:{x:RIGHT-28,y:y-55},thickness:.5,color:rgb(.55,.57,.61)});drawRtl(page,'التوقيع',font,9.5,y-68,RIGHT-28,rgb(.4,.42,.46));y-=94;

 const pages=pdf.getPages();for(let i=0;i<pages.length;i++){const p=pages[i];p.drawLine({start:{x:MARGIN,y:FOOTER_TOP},end:{x:RIGHT,y:FOOTER_TOP},thickness:.45,color:rgb(.72,.74,.78)});p.drawImage(qr,{x:MARGIN,y:18,width:38,height:38});p.drawImage(barcode,{x:MARGIN+48,y:26,width:118,height:25});drawRtl(p,`صفحة ${i+1} من ${pages.length}`,font,9.2,39);drawRtl(p,'مستند مالي مولّد ومحكوم عبر إنجاز',font,8.7,24);p.drawText(report.fingerprint,{font,size:5.5,x:MARGIN+174,y:29,color:rgb(.43,.45,.5)})}
 const saved=await pdf.save({useObjectStreams:false,addDefaultPage:false,objectsPerTick:50});if(saved.byteLength<1500||String.fromCharCode(...saved.slice(0,5))!=='%PDF-')throw new Error('PDF_INVALID');return{bytes:new Uint8Array(saved),identity,pages:pages.length};
}

function parseQuery(v:unknown):Query{const row=object(v),kind=text(row.kind,24);if(!['period','company','transaction','cashbox'].includes(kind))throw new Error('INVALID_REPORT_KIND');return{kind:kind as Query['kind'],from:optionalDate(row.from),to:optionalDate(row.to),companyId:optionalUuid(row.companyId),transactionId:optionalUuid(row.transactionId),cashboxId:optionalUuid(row.cashboxId)}}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 try{
  const auth=req.headers.get('Authorization')??'',token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';if(!token)return json(401,{ok:false,error:'AUTH_REQUIRED'});
  const supabaseUrl=Deno.env.get('SUPABASE_URL');if(!supabaseUrl)throw new Error('SERVER_URL_UNAVAILABLE');
  const client=createClient(supabaseUrl,publicKey(),{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const user=await client.auth.getUser(token);if(user.error||!user.data.user)return json(401,{ok:false,error:'AUTH_INVALID'});
  const body=object(await req.json()),workspaceId=uuid(body.workspaceId),query=parseQuery(body.query),expected=text(body.expectedFingerprint,80);if(!/^ENJAZ-FR-[0-9a-f]{16}$/.test(expected))return json(400,{ok:false,error:'INVALID_FINGERPRINT'});
  const membership=await client.from('workspace_memberships').select('workspace_id,user_id').eq('workspace_id',workspaceId).eq('user_id',user.data.user.id).maybeSingle();if(membership.error||!membership.data)return json(403,{ok:false,error:'WORKSPACE_FORBIDDEN'});
  const source=await loadSource(client,workspaceId),report=buildServerFinancialReport(source,query);
  if(report.fingerprint!==expected)return json(409,{ok:false,error:'REPORT_FINGERPRINT_STALE',expectedFingerprint:expected,currentFingerprint:report.fingerprint});
  const rendered=await renderPdf(report,workspaceId),filename=`enjaz-finance-${report.fingerprint}.pdf`;
  return new Response(rendered.bytes,{status:200,headers:{...cors,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${filename}"`,'X-ENJAZ-Report-Fingerprint':report.fingerprint,'X-ENJAZ-Report-Pages':String(rendered.pages),'X-ENJAZ-Report-Identity':rendered.identity}});
 }catch(error){const code=error instanceof Error?error.message:'REPORT_RENDER_FAILED';console.error('enjaz-financial-report-render',code);const status=code.startsWith('INVALID_')?400:code.startsWith('SOURCE_TOO_LARGE')?413:500;return json(status,{ok:false,error:code})}
});
