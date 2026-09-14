import {DataAccessError} from '../../data/contracts/DataAccessError.ts';
import {DOCUMENT_VAULT_ALLOWED_MIME,DOCUMENT_VAULT_MAX_BYTES} from './documentVaultContract.ts';

export const DOCUMENT_BINARY_SAFETY_SCHEMA='enjaz.document-binary-safety.v1' as const;
export type SupportedDocumentMime=typeof DOCUMENT_VAULT_ALLOWED_MIME[number];
export interface DocumentBinarySafetyResult{readonly schema:typeof DOCUMENT_BINARY_SAFETY_SCHEMA;readonly mimeType:SupportedDocumentMime;readonly byteSize:number;readonly sha256:string;readonly extension:string}

const EXTENSIONS:Readonly<Record<SupportedDocumentMime,readonly string[]>>=Object.freeze({
  'application/pdf':['pdf'],
  'image/jpeg':['jpg','jpeg'],
  'image/png':['png'],
  'image/webp':['webp'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['xlsx']
});
const bad=(message:string):never=>{throw new DataAccessError(message,'DATA_VALIDATION_FAILED')};
const starts=(bytes:Uint8Array,signature:readonly number[])=>signature.every((value,index)=>bytes[index]===value);
const lowerByte=(value:number)=>value>=65&&value<=90?value+32:value;
function containsAscii(bytes:Uint8Array,needle:string){const target=[...needle].map(char=>char.charCodeAt(0));outer:for(let i=0;i<=bytes.length-target.length;i++){for(let j=0;j<target.length;j++)if(lowerByte(bytes[i+j]??-1)!==lowerByte(target[j]??-2))continue outer;return true}return false}
function extension(name:string){const normalized=name.trim().toLowerCase(),dot=normalized.lastIndexOf('.');return dot>0&&dot<normalized.length-1?normalized.slice(dot+1):''}
function assertExtension(name:string,mimeType:SupportedDocumentMime){const ext=extension(name);if(!EXTENSIONS[mimeType].includes(ext))bad('Document extension does not match MIME type');return ext}
function assertNoExecutableMask(bytes:Uint8Array){if(starts(bytes,[0x4d,0x5a])||starts(bytes,[0x7f,0x45,0x4c,0x46])||starts(bytes,[0xcf,0xfa,0xed,0xfe])||starts(bytes,[0xca,0xfe,0xba,0xbe]))bad('Executable binary is forbidden')}
function assertPdf(bytes:Uint8Array){if(!starts(bytes,[0x25,0x50,0x44,0x46,0x2d]))bad('Corrupt or spoofed PDF signature');const tail=bytes.subarray(Math.max(0,bytes.length-65_536));if(!containsAscii(tail,'%%EOF'))bad('PDF end marker is missing');for(const marker of ['/javascript','/launch','/openaction','/embeddedfile'])if(containsAscii(bytes,marker))bad('Active PDF content is forbidden')}
function assertJpeg(bytes:Uint8Array){if(!starts(bytes,[0xff,0xd8,0xff])||bytes.length<4||bytes[bytes.length-2]!==0xff||bytes[bytes.length-1]!==0xd9)bad('Corrupt or spoofed JPEG signature')}
function assertPng(bytes:Uint8Array){if(!starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])||!containsAscii(bytes.subarray(Math.max(0,bytes.length-64)),'IEND'))bad('Corrupt or spoofed PNG signature')}
function assertWebp(bytes:Uint8Array){if(bytes.length<12||!containsAscii(bytes.subarray(0,4),'RIFF')||!containsAscii(bytes.subarray(8,12),'WEBP'))bad('Corrupt or spoofed WebP signature')}
function assertOoxml(bytes:Uint8Array){if(!starts(bytes,[0x50,0x4b,0x03,0x04]))bad('Corrupt or spoofed OOXML container')}
function assertSignature(bytes:Uint8Array,mimeType:SupportedDocumentMime){assertNoExecutableMask(bytes);if(containsAscii(bytes.subarray(0,4096),'<!doctype html')||containsAscii(bytes.subarray(0,4096),'<html')||containsAscii(bytes.subarray(0,4096),'<script')||containsAscii(bytes.subarray(0,4096),'<svg'))bad('Scriptable document masquerade is forbidden');switch(mimeType){case'application/pdf':return assertPdf(bytes);case'image/jpeg':return assertJpeg(bytes);case'image/png':return assertPng(bytes);case'image/webp':return assertWebp(bytes);default:return assertOoxml(bytes)}}
function hex(buffer:ArrayBuffer){return [...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,'0')).join('')}

export async function inspectDocumentBinary(file:File):Promise<DocumentBinarySafetyResult>{
  if(!file.name.trim()||file.name.length>240||/[\\/\u0000-\u001f]/.test(file.name))bad('Unsafe document file name');
  if(!Number.isSafeInteger(file.size)||file.size<1||file.size>DOCUMENT_VAULT_MAX_BYTES)bad('Invalid document binary size');
  const mimeType=file.type.toLowerCase() as SupportedDocumentMime;
  if(!DOCUMENT_VAULT_ALLOWED_MIME.includes(mimeType))bad('Unsupported document MIME type');
  const ext=assertExtension(file.name,mimeType),buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);
  if(bytes.byteLength!==file.size)bad('Document byte-size drift detected');
  assertSignature(bytes,mimeType);
  const sha256=hex(await crypto.subtle.digest('SHA-256',buffer));
  return Object.freeze({schema:DOCUMENT_BINARY_SAFETY_SCHEMA,mimeType,byteSize:file.size,sha256,extension:ext});
}
