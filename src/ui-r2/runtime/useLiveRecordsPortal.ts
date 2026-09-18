import {useLayoutEffect} from 'react';
const LIVE_SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';export const LIVE_PLACEHOLDER='[data-live-deferred="true"]';
export function useLiveRecordsPortal(destination:string,previewSelector=LIVE_PLACEHOLDER){
 const target=document.getElementById('r2-main'),active=document.querySelector<HTMLElement>(LIVE_SHELL)?.dataset.destination===destination;
 useLayoutEffect(()=>{if(!active||!target)return;const preview=target.querySelector<HTMLElement>(previewSelector);if(preview)preview.hidden=true;return()=>{if(preview)preview.hidden=false}},[active,previewSelector,target]);return{active,target}
}
