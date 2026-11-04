/**
 * maxVFX v0.9.0: conservative inverse-UV 2D facial sculpt.
 * No photos/landmarks are persisted. Live mode never deforms cheek/chin.
 * Prepares anchors once per mesh update; per-vertex work is clipped to face bounds.
 */
export const SCULPT_KEYS=Object.freeze(['nose','lipShape','browLift','cheek','chin','smile']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=x=>{const n=clamp(x,0,1);return n*n*(3-2*n);};
const good=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const IDENTITY=(x,y)=>[x,y];
function polygonInside(x,y,outline){let hit=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){
  const a=outline[i],b=outline[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;
}return hit;}
function boundaryFade(x,y,outline,aspect,feather){
  if(!polygonInside(x,y,outline))return 0;
  let best=Infinity,px=x*aspect;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[j],b=outline[i],ax=a.x*aspect,bx=b.x*aspect,dx=bx-ax,dy=b.y-a.y;
    const t=clamp(((px-ax)*dx+(y-a.y)*dy)/Math.max(1e-8,dx*dx+dy*dy),0,1);
    const ex=px-ax-t*dx,ey=y-a.y-t*dy;
    best=Math.min(best,ex*ex+ey*ey);
  }
  return smooth(Math.sqrt(best)/feather);
}
function gauss(x,y,p,rx,ry,aspect){
  const dx=(x-p.x)*aspect/rx,dy=(y-p.y)/ry;
  const d2=dx*dx+dy*dy;
  return d2>9?0:Math.exp(-3*d2);
}
export function createSculptWarp({landmarks,outline,aspect=1,values=null,live=false,confidence=1}={}){
  if(!Array.isArray(landmarks)||landmarks.length<468||!Array.isArray(outline)||outline.length<3||!values||
     !Number.isFinite(aspect)||aspect<=0)return IDENTITY;
  const ids=[1,33,263,61,291,13,14,70,300,234,454,152];
  if(!ids.every(i=>good(landmarks[i]))||!outline.every(good))return IDENTITY;
  const trust=live?clamp((confidence-.60)/.30,0,1)*.32:1;
  if(trust<=0)return IDENTITY;
  const gain=k=>clamp(Number.isFinite(values[k])?values[k]/100:0,0,1)*trust;
  const gains=Object.fromEntries(SCULPT_KEYS.map(k=>[k,live&&(k==='cheek'||k==='chin')?0:gain(k)]));
  if(!SCULPT_KEYS.some(k=>gains[k]>0))return IDENTITY;
  const l=landmarks[33],r=landmarks[263],nose=landmarks[1],lip=landmarks[13],chin=landmarks[152];
  const mouthL=landmarks[61],mouthR=landmarks[291],browL=landmarks[70],browR=landmarks[300];
  const eyeWidth=Math.max(.04,Math.hypot((r.x-l.x)*aspect,r.y-l.y));
  const faceH=Math.max(.08,Math.hypot((chin.x-nose.x)*aspect,chin.y-nose.y));
  const midX=(l.x+r.x)*.5;
  const minX=Math.min(l.x,r.x,landmarks[234].x,landmarks[454].x)-.045;
  const maxX=Math.max(l.x,r.x,landmarks[234].x,landmarks[454].x)+.045;
  const minY=Math.min(browL.y,browR.y,nose.y)-.11;
  const maxY=Math.max(chin.y,lip.y)+.05;
  const maxMove=eyeWidth*(live?.009:.028);
  return function warp(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<minX||x>maxX||y<minY||y>maxY)return [x,y];
    let du=0,dv=0;
    if(gains.nose){const w=gauss(x,y,nose,eyeWidth*.22,faceH*.34,aspect);du+=(x-nose.x)*w*gains.nose*.14;}
    if(gains.lipShape){const w=gauss(x,y,lip,eyeWidth*.32,faceH*.17,aspect);dv-=(y-lip.y)*w*gains.lipShape*.20;}
    if(gains.browLift){const w=Math.max(gauss(x,y,browL,eyeWidth*.24,faceH*.16,aspect),gauss(x,y,browR,eyeWidth*.24,faceH*.16,aspect));dv+=eyeWidth/aspect*.025*w*gains.browLift;}
    if(gains.smile){const w=Math.max(gauss(x,y,mouthL,eyeWidth*.16,faceH*.18,aspect),gauss(x,y,mouthR,eyeWidth*.16,faceH*.18,aspect));dv+=faceH*.032*w*gains.smile;}
    if(gains.cheek){const w=Math.max(gauss(x,y,landmarks[234],eyeWidth*.34,faceH*.38,aspect),gauss(x,y,landmarks[454],eyeWidth*.34,faceH*.38,aspect));du-=(x-midX)*w*gains.cheek*.085;}
    if(gains.chin){const w=gauss(x,y,chin,eyeWidth*.26,faceH*.27,aspect);dv-=(y-nose.y)*w*gains.chin*.048;}
    if(Math.abs(du)+Math.abs(dv)<1e-12)return [x,y];
    const rim=boundaryFade(x,y,outline,aspect,.042)**3;
    du*=rim;dv*=rim;
    const length=Math.hypot(du*aspect,dv);
    if(length>maxMove){const k=maxMove/length;du*=k;dv*=k;}
    return [clamp(x+du,0,1),clamp(y+dv,0,1)];
  };
}
export function sculptPoint(x,y,options){return createSculptWarp(options)(x,y);}
