import { useLayoutEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import { RegulatoryKnowledgeCenter } from './RegulatoryKnowledgeCenter.tsx';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const TARGET='[data-regulatory-runtime-target="phase9.4"]';

export function LiveRegulatoryKnowledgePortal({gateway,workspace}:Readonly<{gateway:RegulatoryKnowledgeGateway;workspace:Promise<string|null>}>){
  const [target,setTarget]=useState<HTMLElement|null>(null),[active,setActive]=useState(false);
  useLayoutEffect(()=>{const shell=document.querySelector<HTMLElement>(SHELL),main=document.getElementById('r2-main');if(!shell||!main)return;setTarget(main);const sync=()=>setActive(shell.dataset.destination==='knowledge');sync();const observer=new MutationObserver(sync);observer.observe(shell,{attributes:true,attributeFilter:['data-destination']});return()=>observer.disconnect()},[]);
  useLayoutEffect(()=>{if(!target)return;const runtimeTarget=target.querySelector<HTMLElement>(TARGET);if(runtimeTarget)runtimeTarget.hidden=active;return()=>{if(runtimeTarget)runtimeTarget.hidden=false}},[active,target]);
  if(!active||!target)return null;
  return createPortal(<RegulatoryKnowledgeCenter gateway={gateway} workspace={workspace}/>,target);
}
