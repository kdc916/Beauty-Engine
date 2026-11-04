/** Local-only shareable appearance settings. Never serialize photos or landmarks. */
import {normalizeLook} from './look-presets.v0.9.0.mjs';
export const MAX_LINK_LENGTH=7000;
function toUrlSafe(text){const bytes=new TextEncoder().encode(text);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromUrlSafe(data){if(!/^[\w-]{1,6000}$/.test(data))throw Error('잘못된 룩 링크입니다.');const bytes=atob(data.replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes,ch=>ch.charCodeAt(0)));}
export function encodeLookLink(look,url){
  const normalized=normalizeLook(look);
  const base=new URL(url);if(!/^https?:$/.test(base.protocol))throw Error('HTTPS/HTTP 페이지에서만 룩 링크를 만들 수 있습니다.');
  const payload=toUrlSafe(JSON.stringify(normalized));base.hash='look='+payload;
  if(base.href.length>MAX_LINK_LENGTH)throw Error('룩 설정 공유 링크가 너무 큽니다.');
  return base.href;
}
export function decodeLookHash(hash){
  const raw=String(hash||'');if(!raw.startsWith('#look='))return null;
  if(raw.length>MAX_LINK_LENGTH)throw Error('룩 링크 길이가 제한을 초과했습니다.');
  const encoded=raw.slice(6);return normalizeLook(JSON.parse(fromUrlSafe(encoded)));
}
