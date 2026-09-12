import { useLayoutEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import type { DocumentVaultGateway } from '../../features/documents/documentVaultCommands.ts';
import { ConnectedDocumentVault } from './ConnectedDocumentVault.tsx';
const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const PREVIEW='[data-records-stage="R2.0-6"][data-records-domain="documents"]';
export function LiveDocumentVaultPortal({gateway,workspace}:{gateway:DocumentVaultGateway;workspace:Promise<string|null>}){const[target,setTarget]=useState<HTMLElement|null>(null),[active,setActive]=useState(false);useLayoutEffect(()=>{const shell=document.querySelector<HTMLElement>(SHELL),main=document.getElementById('r2-main');if(!shell||!main)return;setTarget(main);const sync=()=>setActive(shell.dataset.destination==='documents');sync();const observer=new MutationObserver(sync);observer.observe(shell,{attributes:true,attributeFilter:['data-destination']});return()=>observer.disconnect()},[]);useLayoutEffect(()=>{if(!target)return;const preview=target.querySelector<HTMLElement>(PREVIEW);if(preview)preview.hidden=active;return()=>{if(preview)preview.hidden=false}},[active,target]);if(!active||!target)return null;return createPortal(<ConnectedDocumentVault gateway={gateway} workspace={workspace}/>,target)}
