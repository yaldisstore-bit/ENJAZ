import { useLayoutEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import { BusinessIntelligenceCenter } from './BusinessIntelligenceCenter.tsx';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const PLACEHOLDER='[data-live-deferred="true"]';

export function LiveBusinessIntelligencePortal(){
 const [target,setTarget]=useState<HTMLElement|null>(null),[active,setActive]=useState(false);
 useLayoutEffect(()=>{const shell=document.querySelector<HTMLElement>(SHELL),main=document.getElementById('r2-main');if(!shell||!main)return;setTarget(main);const sync=()=>setActive(shell.dataset.destination==='insights');sync();const observer=new MutationObserver(sync);observer.observe(shell,{attributes:true,attributeFilter:['data-destination']});return()=>observer.disconnect()},[]);
 useLayoutEffect(()=>{if(!target)return;const placeholder=target.querySelector<HTMLElement>(PLACEHOLDER);if(placeholder)placeholder.hidden=active;return()=>{if(placeholder)placeholder.hidden=false}},[active,target]);
 if(!active||!target)return null;
 return createPortal(<BusinessIntelligenceCenter/>,target);
}
