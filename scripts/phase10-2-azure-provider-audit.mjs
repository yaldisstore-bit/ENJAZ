import fs from 'node:fs';
const edge=fs.readFileSync('supabase/functions/enjaz-document-intelligence/index.ts','utf8');
const state=JSON.parse(fs.readFileSync('docs/PHASE10_2_STATE.json','utf8'));
const failures=[];const check=(n,c)=>{if(!c)failures.push(n)},has=(x)=>edge.includes(x);
check('adapter_state',state.directAzureProviderAdapterReady===true&&state.preferredProvider==='AZURE_DOCUMENT_INTELLIGENCE_PREBUILT_LAYOUT_V4'&&state.providerApiVersion==='2024-11-30'&&state.serverExtractionProviderConnected===false);
for(const marker of [
  "Deno.env.get('ENJAZ_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')",
  "Deno.env.get('ENJAZ_AZURE_DOCUMENT_INTELLIGENCE_KEY')",
  "azure-document-intelligence/prebuilt-layout-v4",
  '/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30&features=keyValuePairs',
  "'Ocp-Apim-Subscription-Key':p.key",
  "admin.storage.from(c.bucket).download(c.path)",
  "'Content-Type':c.mimeType",
  "body:downloaded.data",
  "downloaded.data.size!==c.byteSize",
  "created.headers.get('operation-location')",
  'OCR_AZURE_OPERATION_ORIGIN_INVALID',
  'operationUrl.origin!==endpointUrl.origin',
  'normalizeHttpsEndpoint',
  'azureProviderResult',
  'pageForOffset',
  'a.keyValuePairs',
  'SOURCE_FILE_REMAINS_AUTHORITATIVE',
  "p.kind==='azure'?runAzure(admin,c,p):runGeneric(admin,c,p)"
])check(`azure:${marker}`,has(marker));
check('azure_key_server_only',!/(body|r|request)\.(azureKey|providerKey|apiKey)/.test(edge));
check('azure_key_not_literal',!/ENJAZ_AZURE_DOCUMENT_INTELLIGENCE_KEY\s*[:=]\s*["'][^"']+/.test(edge));
check('azure_operation_key_origin_locked',has("operationUrl.protocol!=='https:'||operationUrl.origin!==endpointUrl.origin")&&has("timedFetch(operation,{headers:{'Ocp-Apim-Subscription-Key':p.key}"));
check('azure_endpoint_credentials_forbidden',has('if(u.protocol!==\'https:\'||u.username||u.password)'));
check('azure_does_not_force_arabic_locale',!/[?&]locale=ar(?:-|&|`|')/i.test(edge));
check('azure_source_not_exposed_by_signed_url',!has('createSignedUrl(c.path')&&!has('urlSource:signed.data.signedUrl'));
check('azure_source_download_is_private_and_size_bound',has("admin.storage.from(c.bucket).download(c.path)")&&has('downloaded.data.size!==c.byteSize'));
check('provider_result_bounded',has('MAX_PROVIDER_TEXT=8_000_000')&&has('MAX_PROVIDER_JSON=12_000_000'));
check('generic_fallback_preserved',has("Deno.env.get('ENJAZ_OCR_PROVIDER_URL')")&&has("Deno.env.get('ENJAZ_OCR_PROVIDER_KEY')")&&has("'X-Enjaz-OCR-Contract':'enjaz.ocr-provider.v1'"));
check('provider_absence_explicit',has("throw new Error('OCR_PROVIDER_NOT_CONFIGURED')")&&has("return out(503,{ok:false,error:'OCR_PROVIDER_NOT_CONFIGURED'})"));
if(failures.length){console.error(`ENJAZ PHASE 10.2 AZURE PROVIDER AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);process.exit(1)}
console.log('ENJAZ PHASE 10.2 AZURE PROVIDER AUDIT PASS — direct Azure DI adapter is server-only, private-binary-source, size-bound, operation-origin locked, Arabic auto-detect compatible, and provider certification remains pending.');
