import {useLayoutEffect} from 'react';
const P='[data-live-deferred]';
export function useLiveRecordsPortal(destination:string,previewSelector=P){const target=document.getElementById('r2-main'),active=document.querySelector<HTMLElement>('[data-r2-runtime-mode=live]')?.dataset.destination===destination;useLayoutEffect(()=>{const p=active&&target?.querySelector<HTMLElement>(previewSelector);if(!p)return;p.hidden=true;return()=>{p.hidden=false}},[active,previewSelector,target]);return{active,target}}
