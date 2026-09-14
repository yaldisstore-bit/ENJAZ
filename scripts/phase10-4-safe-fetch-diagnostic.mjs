const nativeFetch=globalThis.fetch.bind(globalThis);
const target='/functions/v1/enjaz-financial-report-render';
const safe=(value)=>String(value??'UNKNOWN').replace(/[^A-Za-z0-9_:\-]/g,'_').slice(0,160);

globalThis.fetch=async(input,init)=>{
  const response=await nativeFetch(input,init);
  const url=typeof input==='string'?input:input instanceof URL?input.toString():input?.url??'';
  if(url.includes(target)&&response.status>=400){
    try{
      const clone=response.clone();
      const payload=await clone.json();
      console.warn(`PHASE10_4_RENDER_SAFE_ERROR HTTP=${response.status} CODE=${safe(payload?.error)}`);
    }catch{
      console.warn(`PHASE10_4_RENDER_SAFE_ERROR HTTP=${response.status} CODE=UNREADABLE_ERROR_BODY`);
    }
  }
  return response;
};
