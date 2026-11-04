/**
 * v0.9.0: optional semantic face-occlusion matte, local inference only.
 * MediaPipe SelfieMulticlass categories: 0 bg, 1 hair, 2 body-skin,
 * 3 face-skin, 4 clothing, 5 accessories. These are semantic labels,
 * NOT a guarantee of correct hand or hair occlusion in every frame.
 * Zero network access and no persistent storage in this pure module.
 */
export const SEGMENTATION_CLASSES=Object.freeze({background:0,hair:1,bodySkin:2,faceSkin:3,clothes:4,others:5});
export const SEGMENTATION_LIMITS=Object.freeze({maxPixels:1048576,minFaceSkinFraction:.085,minFacePixels:20,validMs:950,photoValidMs:30000,liveIntervalMs:420,batteryIntervalMs:820});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/** Protected mask R: 255=keep original pixel; 0=allow beauty/warp. */
export function categoriesToProtection(labels,width,height,{feather=true}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>SEGMENTATION_LIMITS.maxPixels)throw Error('잘못된 segmentation 크기');
  if(!labels||labels.length!==width*height)throw Error('Segmentation label 크기 불일치');
  const n=width*height,protection=new Uint8Array(n);
  let faceCount=0;
  for(let i=0;i<n;i++){
    const label=labels[i];if(label>5)throw Error('지원하지 않는 segmentation 클래스');
    if(label===3){protection[i]=0;faceCount++;}else protection[i]=255;
  }
  if(!feather)return {protection,faceCount,width,height};
  // Conservative one-pixel feather around an occluder boundary.
  // The center pixel remains dominant, to retain thin hair/hand protection.
  const soft=new Uint8Array(n);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,c=protection[i];
    const l=protection[y*width+Math.max(0,x-1)],r=protection[y*width+Math.min(width-1,x+1)];
    const u=protection[Math.max(0,y-1)*width+x],d=protection[Math.min(height-1,y+1)*width+x];
    soft[i]=Math.round(Math.max(c*.82,(c*4+l+r+u+d)/8));
  }
  return {protection:soft,faceCount,width,height};
}

export function faceMaskQuality(labels,width,height,faceBounds){
  if(!labels||labels.length!==width*height||!faceBounds)return {valid:false,reason:'missing-input'};
  const left=clamp(Math.floor(faceBounds.left*width),0,width-1);
  const right=clamp(Math.ceil(faceBounds.right*width),left+1,width);
  const top=clamp(Math.floor(faceBounds.top*height),0,height-1);
  const bottom=clamp(Math.ceil(faceBounds.bottom*height),top+1,height);
  let faceSkin=0,other=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const label=labels[y*width+x];if(label===3)faceSkin++;else other++;
  }
  const total=faceSkin+other;
  const fraction=total?faceSkin/total:0;
  // Fail closed on broken/misclassified model results; no stale matte.
  if(faceSkin<SEGMENTATION_LIMITS.minFacePixels||fraction<SEGMENTATION_LIMITS.minFaceSkinFraction)
    return {valid:false,reason:'insufficient-face-skin',fraction};
  if(fraction>.995)return {valid:false,reason:'implausible-all-face',fraction};
  return {valid:true,reason:'ok',fraction};
}

export function faceBoundsFromLandmarks(points){
  if(!Array.isArray(points)||points.length<455)return null;
  const required=[10,152,234,454];
  if(required.some(i=>!points[i]||!Number.isFinite(points[i].x)||!Number.isFinite(points[i].y)))return null;
  const left=Math.min(...required.map(i=>points[i].x)),right=Math.max(...required.map(i=>points[i].x));
  const top=Math.min(...required.map(i=>points[i].y)),bottom=Math.max(...required.map(i=>points[i].y));
  if(right-left<.08||bottom-top<.09)return null;
  return {left:clamp(left,0,1),right:clamp(right,0,1),top:clamp(top,0,1),bottom:clamp(bottom,0,1)};
}

/** Reuse GPU upload arrays and avoid allocating per-frame RGBA buffers. */
export function protectionToRGBA(protection,width,height,target=null){
  if(!protection||protection.length!==width*height)throw Error('Protection mask size mismatch');
  const out=target&&target.length===width*height*4?target:new Uint8Array(width*height*4);
  for(let i=0;i<protection.length;i++){
    const k=i*4;out[k]=protection[i];out[k+1]=0;out[k+2]=0;out[k+3]=255;
  }
  return out;
}
export function segmentationInterval(profile){
  return profile?.maxSide<=512?SEGMENTATION_LIMITS.batteryIntervalMs:profile?.maxSide<=640?620:SEGMENTATION_LIMITS.liveIntervalMs;
}
export function maskIsFresh(now,receivedAt,mode='camera'){
  if(!Number.isFinite(now)||!Number.isFinite(receivedAt)||receivedAt<0||now<receivedAt)return false;
  return mode!=='camera'||now-receivedAt<=SEGMENTATION_LIMITS.validMs;
}

export function createSemanticMatteState(){
  let frame=null,stamp=-Infinity,generation=0;
  function reset(){frame=null;stamp=-Infinity;generation++;return generation;}
  function commit(next,now,expectedGeneration){
    if(expectedGeneration!==generation||!next||!Number.isFinite(now)||now<0)return false;
    if(!next.valid||!next.rgba)return false;
    frame=next;stamp=now;return true;
  }
  function current(now,mode){return maskIsFresh(now,stamp,mode)?frame:null;}
  return {reset,commit,current,get generation(){return generation;},get hasData(){return !!frame;}};
}
