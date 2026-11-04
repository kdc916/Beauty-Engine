/** maxVFX v0.9.0 — named shareable *settings* only, never facial images or biometric vectors. */
const KEY='maxvfx.beauty.custom.looks.v1';
const FIELDS=Object.freeze(['skin','bright','warm','glow','slim','eyes','lip','blush','saturation','detail','underEye','highlight','nose','lipShape','browLift','cheek','chin','smile']);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const LOOK_SCHEMA='maxvfx.beauty.look.v2';
export function normalizeLook(raw){
  if(!raw||typeof raw!=='object'||typeof raw.values!=='object')throw Error('올바른 프리셋 형식이 아닙니다.');
  const name=String(raw.name||'내 커스텀 룩').trim().slice(0,40);
  const values={};let count=0;
  for(const k of FIELDS){if(typeof raw.values[k]==='number'&&Number.isFinite(raw.values[k])){values[k]=clamp(raw.values[k],0,100);count++;}}
  if(!count)throw Error('사용 가능한 보정 설정이 없습니다.');
  const studio=raw.studio&&typeof raw.studio==='object'?raw.studio:{};
  const studioNormalized={enabled:studio.enabled===true,direction:clamp(Number.isFinite(studio.direction)?studio.direction:0,-100,100),fill:clamp(Number.isFinite(studio.fill)?studio.fill:35,0,100),warmth:clamp(Number.isFinite(studio.warmth)?studio.warmth:50,0,100)};
  const ref=raw.reference&&typeof raw.reference==='object'?raw.reference:null;
  const regions={};for(const k of ['eyes','nose','lips','jaw','brow']){if(typeof ref?.regions?.[k]==='number'&&Number.isFinite(ref.regions[k]))regions[k]=clamp(ref.regions[k],0,1);}
  return {schema:LOOK_SCHEMA,name,values,studio:studioNormalized,liveSculpt:raw.liveSculpt===true,lighting:{auto:raw.lighting?.auto!==false,strength:clamp(Number.isFinite(raw.lighting?.strength)?raw.lighting.strength:45,0,100),poseAware:raw.lighting?.poseAware!==false,relight3D:raw.lighting?.relight3D===true},reference:{enabled:false,globalStrength:clamp(Number.isFinite(ref?.globalStrength)?ref.globalStrength:.5,0,1),regions}};
}
export function createLook({name,values,lighting,reference,studio,liveSculpt}){return normalizeLook({name,values,lighting,reference,studio,liveSculpt});}
export function createLookStore(storage){
  function list(){try{const a=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(a)?a.slice(0,24).map(x=>{try{return normalizeLook(x)}catch{return null}}).filter(Boolean):[];}catch{return []}}
  function put(look){const next=normalizeLook(look),old=list().filter(x=>x.name!==next.name);old.unshift(next);const trimmed=old.slice(0,16);storage.setItem(KEY,JSON.stringify(trimmed));return trimmed;}
  function remove(name){const next=list().filter(x=>x.name!==name);storage.setItem(KEY,JSON.stringify(next));return next;}
  return {list,put,remove};
}
