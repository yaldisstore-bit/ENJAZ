import {useLayoutEffect,useState} from 'react';

export function useLiveRecordsPortal(destination:string,shellSelector:string,previewSelector:string){
  const[target,setTarget]=useState<HTMLElement|null>(null),[active,setActive]=useState(false);
  useLayoutEffect(()=>{const shell=document.querySelector<HTMLElement>(shellSelector),main=document.getElementById('r2-main');if(!shell||!main)return;setTarget(main);const sync=()=>setActive(shell.dataset.destination===destination);sync();const observer=new MutationObserver(sync);observer.observe(shell,{attributes:true,attributeFilter:['data-destination']});return()=>observer.disconnect()},[destination,shellSelector]);
  useLayoutEffect(()=>{if(!target)return;const preview=target.querySelector<HTMLElement>(previewSelector);if(preview)preview.hidden=active;return()=>{if(preview)preview.hidden=false}},[active,previewSelector,target]);
  return{active,target};
}
