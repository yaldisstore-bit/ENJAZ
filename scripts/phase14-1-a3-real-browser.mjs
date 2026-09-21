import { spawn, spawnSync } from 'node:child_process';

function run(command,args,env=process.env){
  const result=spawnSync(command,args,{stdio:'inherit',env});
  if(result.status!==0)throw new Error('A3_COMMAND_FAILED_'+command.replace(/\W+/g,'_'));
}
async function waitFor(url,attempts=60){
  let last;
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url);
      if(r.ok)return;
      last='HTTP_'+r.status;
    }catch(error){last=error?.code??error?.message??'NETWORK';}
    await new Promise(r=>setTimeout(r,500));
  }
  throw new Error('A3_PREVIEW_NOT_READY_'+String(last).slice(0,40));
}

export async function checkPhase14A3RealBrowser({owner,client,url,publishableKey,verify}){
  if(!owner?.email||!owner?.password||!client?.email||!client?.password)
    throw new Error('A3_REAL_AUTH_USERS_MISSING');
  if(typeof url!=='string'||!url.startsWith('https://')||
     typeof publishableKey!=='string'||!publishableKey.startsWith('sb_publishable_'))
    throw new Error('A3_REAL_AUTH_CONFIG_INVALID');

  const buildEnv={...process.env,VITE_APP_ENV:'test',VITE_APP_LOG_LEVEL:'error',
    VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:publishableKey};
  run('npm',['run','build','--','--base=/'],buildEnv);
  run('npm',['install','--no-save','--package-lock=false','@playwright/test@1.55.0','playwright@1.55.0']);
  run('npx',['playwright','install','--with-deps','chromium']);

  const preview=spawn('npx',['vite','preview','--host','127.0.0.1','--port','4193'],{
    env:buildEnv,stdio:['ignore','pipe','pipe'],
  });
  let previewLog='';
  const collect=chunk=>{previewLog=(previewLog+chunk.toString()).slice(-8000);};
  preview.stdout.on('data',collect);preview.stderr.on('data',collect);
  try{
    await waitFor('http://127.0.0.1:4193/portal');
    const testEnv={...process.env,ENJAZ_A3_BASE_URL:'http://127.0.0.1:4193/',
      ENJAZ_A3_OWNER_EMAIL:owner.email,ENJAZ_A3_OWNER_PASSWORD:owner.password,
      ENJAZ_A3_CLIENT_EMAIL:client.email,ENJAZ_A3_CLIENT_PASSWORD:client.password};
    run('npx',['playwright','test','tests-external/phase14-1-a3-real-auth.spec.cjs',
      '--reporter=line','--workers=1'],testEnv);
    verify(true,'A3_REAL_AUTH_STAFF_CLIENT_FIVE_WIDTH_CHROMIUM');
    verify(true,'A3_REAL_CLIENT_OFFLINE_REFRESH_RECOVERY');
  }catch(error){
    if(previewLog)console.error('A3_PREVIEW_DIAGNOSTIC',previewLog.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g,'[email]'));
    throw error;
  }finally{
    preview.kill('SIGTERM');
    await new Promise(r=>setTimeout(r,400));
    if(!preview.killed)preview.kill('SIGKILL');
  }
}
