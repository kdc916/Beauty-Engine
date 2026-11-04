/**
 * maxVFX Beauty Engine v0.9.0 — local landmark anomaly/partial-occlusion guard.
 * This is NOT an object or occlusion segmentation detector. It rejects improbable
 * point jumps and temporarily repairs a few bad landmarks from the last stable
 * face. No learned identity, images, networking or persistent face data.
 */
export const OCCLUSION_LIMITS=Object.freeze({
  maxGapMs:360,maxRelativeTranslation:.17,
  maxOutlierFraction:.095,maxOutlierCount:23,
  maxCriticalOutliers:3,maxRepairDurationMs:240,
  minQuality:.42
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-.05&&p.x<=1.05&&p.y>=-.05&&p.y<=1.05;
const ANCHORS=Object.freeze([1,33,263,234,454,10,152,61,291]);
const CRITICAL=new Set([1,33,263,234,454,10,152,61,291,127,356,172,397,149,378]);
const median=values=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:0;};
const makeCopy=points=>points.map(p=>({x:p.x,y:p.y}));
/** Smoothly fades deformation on extreme yaw/pitch, including 2D pose fallback. */
export function poseSafetyMultiplier(pose){
  if(!pose)return 1; // No pose estimate: rely on spatial landmark guard.
  if(!Number.isFinite(pose.yaw)||!Number.isFinite(pose.pitch))return 0;
  const yaw=clamp((Math.abs(pose.yaw)-25)/35,0,1);
  const pitch=clamp((Math.abs(pose.pitch)-20)/30,0,1);
  const factor=1-Math.max(yaw*yaw*(3-2*yaw),pitch*pitch*(3-2*pitch))*.92;
  return clamp(factor,.08,1);
}

export function createOcclusionGuard(){
  let previous=null,at=-Infinity,repairStart=-Infinity;
  function reset(){previous=null;at=-Infinity;repairStart=-Infinity;}
  function inspect(points,now){
    if(!Array.isArray(points)||points.length<467||!Number.isFinite(now))return {safe:false,reason:'invalid-face',points:null,quality:0,repaired:0};
    const bad=points.reduce((a,p)=>a+(finite(p)?0:1),0);
    if(bad>OCCLUSION_LIMITS.maxOutlierCount)return {safe:false,reason:'multiple-invalid-landmarks',points:null,quality:0,repaired:bad};
    if(!previous||points.length!==previous.length||now-at<0||now-at>OCCLUSION_LIMITS.maxGapMs){
      if(bad)return {safe:false,reason:'invalid-warmup',points:null,quality:0,repaired:bad};
      const safe=makeCopy(points);return {safe:true,reason:'initial',points:safe,quality:1,repaired:0};
    }
    // Translation consensus from multiple landmarks. A single eye/nose jumping
    // does not shift the whole face or trigger a false camera movement.
    const differences=ANCHORS.filter(i=>finite(points[i])&&finite(previous[i]));
    if(differences.length<6)return {safe:false,reason:'anchor-occlusion',points:null,quality:0,repaired:0};
    const deltaX=median(differences.map(i=>points[i].x-previous[i].x));
    const deltaY=median(differences.map(i=>points[i].y-previous[i].y));
    const width=Math.hypot(previous[454].x-previous[234].x,previous[454].y-previous[234].y);
    if(Math.hypot(deltaX,deltaY)>Math.min(.095,width*OCCLUSION_LIMITS.maxRelativeTranslation)){
      return {safe:false,reason:'fast-motion',points:null,quality:0,repaired:0};
    }
    const threshold=clamp(width*.145,.030,.074);
    let repairs=0,critical=0;
    const copy=new Array(points.length);
    for(let i=0;i<points.length;i++){
      const p=points[i],old=previous[i];
      const distance=finite(p)?Math.hypot(p.x-old.x-deltaX,p.y-old.y-deltaY):Infinity;
      if(distance>threshold){
        repairs++;if(CRITICAL.has(i))critical++;
        copy[i]={x:clamp(old.x+deltaX,-.05,1.05),y:clamp(old.y+deltaY,-.05,1.05)};
      }else copy[i]={x:p.x,y:p.y};
    }
    if(repairs>Math.min(OCCLUSION_LIMITS.maxOutlierCount,points.length*OCCLUSION_LIMITS.maxOutlierFraction)||critical>OCCLUSION_LIMITS.maxCriticalOutliers){
      return {safe:false,reason:'large-occlusion-or-profile',points:null,quality:0,repaired:repairs};
    }
    if(repairs){
      if(repairStart===-Infinity)repairStart=now;
      if(now-repairStart>OCCLUSION_LIMITS.maxRepairDurationMs)return {safe:false,reason:'repair-timeout',points:null,quality:0,repaired:repairs};
    }else repairStart=-Infinity;
    const quality=clamp(1-repairs/(points.length*.18)-critical*.095,OCCLUSION_LIMITS.minQuality,1);
    return {safe:true,reason:repairs?'isolated-outliers':'ok',points:copy,quality,repaired:repairs};
  }
  function commit(points,now){if(!Array.isArray(points)||!points.every(finite)||!Number.isFinite(now))return false;previous=makeCopy(points);at=now;return true;}
  return {inspect,commit,reset,get hasReference(){return !!previous;}};
}
