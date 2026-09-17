const DATE=/^\d{4}-\d{2}-\d{2}$/;
const LOCAL=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function partsAt(instant:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(instant);
  const get=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(p=>p.type===type)?.value);
  return{year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute'),second:get('second')};
}

export function businessDateForInstant(value:string,timeZone:string):string{
  const dt=new Date(value);if(!Number.isFinite(dt.getTime()))throw new Error('Invalid calendar instant');
  const p=partsAt(dt,timeZone);
  return `${String(p.year).padStart(4,'0')}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
}

export function workspaceLocalDateTimeToInstant(value:string,timeZone:string):string{
  const match=LOCAL.exec(value);if(!match)throw new Error('Invalid local calendar time');
  const [,ys,ms,ds,hs,mins]=match;
  const wanted={year:Number(ys),month:Number(ms),day:Number(ds),hour:Number(hs),minute:Number(mins)};
  let guess=Date.UTC(wanted.year,wanted.month-1,wanted.day,wanted.hour,wanted.minute,0);
  for(let i=0;i<4;i+=1){
    const p=partsAt(new Date(guess),timeZone);
    const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
    const target=Date.UTC(wanted.year,wanted.month-1,wanted.day,wanted.hour,wanted.minute,0);
    guess+=target-represented;
  }
  const check=partsAt(new Date(guess),timeZone);
  if(check.year!==wanted.year||check.month!==wanted.month||check.day!==wanted.day||check.hour!==wanted.hour||check.minute!==wanted.minute)throw new Error('Local calendar time does not exist in workspace timezone');
  return new Date(guess).toISOString();
}

export function localInputForInstant(value:string,timeZone:string):string{
  const dt=new Date(value);if(!Number.isFinite(dt.getTime()))throw new Error('Invalid calendar instant');
  const p=partsAt(dt,timeZone);
  return `${String(p.year).padStart(4,'0')}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}T${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;
}

export function enumerateBusinessDates(start:string,endExclusive:string):readonly string[]{
  if(!DATE.test(start)||!DATE.test(endExclusive)||start>=endExclusive)throw new Error('Invalid business date range');
  const out:string[]=[];let cursor=start;
  while(cursor<endExclusive&&out.length<371){
    out.push(cursor);
    const [y,m,d]=cursor.split('-').map(Number),next=new Date(Date.UTC(y!,m!-1,d!+1));
    cursor=`${String(next.getUTCFullYear()).padStart(4,'0')}-${String(next.getUTCMonth()+1).padStart(2,'0')}-${String(next.getUTCDate()).padStart(2,'0')}`;
  }
  return Object.freeze(out);
}
