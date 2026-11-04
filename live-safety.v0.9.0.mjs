/**
 * maxVFX Beauty Engine — live face landmark safety gate v0.9.0.
 * A rejected frame may never reach mesh, skin/makeup mask or shader uniforms.
 * No identity information, images or network access are retained by this module.
 */
export const LIVE_SAFETY = Object.freeze({
  minFaceWidth: 0.095,
  maxFaceWidth: 0.85,
  maxInstantMotion: 0.075,
  maxContourMotion: 0.065,
  maxScaleStep: 0.30,
  maxFrameGapMs: 400,
  maxPoseAsymmetry: 0.55, // conservative 2D profile/occlusion proxy
  graceHoldMs: 130,
  consecutiveGoodFrames: 2,
  minAlpha: 0.22,
  maxAlpha: 0.82
});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-0.05&&p.x<=1.05&&p.y>=-0.05&&p.y<=1.05;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CONTOUR_SENTINELS=Object.freeze([10,127,356,234,454,172,397,152,1,61,291,33,263]);

export function validateLiveFace(points){
  if(!Array.isArray(points)||points.length<467)return {valid:false,reason:'missing-landmarks'};
  for(let i=0;i<points.length;i++)if(!finite(points[i]))return {valid:false,reason:'invalid-coordinate'};
  const width=distance(points[234],points[454]);
  if(width<LIVE_SAFETY.minFaceWidth||width>LIVE_SAFETY.maxFaceWidth)return {valid:false,reason:'face-size'};
  if(!Number.isFinite(points[1].x)||!Number.isFinite(points[152].y))return {valid:false,reason:'geometry'};
  // Extreme yaw/occlusion is not tracked by preserving stale points indefinitely.
  const dl=distance(points[1],points[234]),dr=distance(points[1],points[454]);
  const asymmetry=Math.abs(dl-dr)/Math.max(.0001,dl+dr);
  if(asymmetry>LIVE_SAFETY.maxPoseAsymmetry)return {valid:false,reason:'profile-or-occlusion'};
  return {valid:true,reason:'ok',width};
}

export function createLiveFaceFilter(){
  let last=null,lastAt=0,lastWidth=0,good=0,rejected=0,lastSafeAt=-Infinity;
  function reset(){last=null;lastAt=0;lastWidth=0;good=0;rejected=0;lastSafeAt=-Infinity;}
  function reject(reason){good=0;rejected++;return {safe:false,points:null,reason,rejected};}
  function update(points,now){
    const check=validateLiveFace(points);
    if(!check.valid||!Number.isFinite(now))return reject(check.reason||'invalid-time');
    if(!last||points.length!==last.length||now<=lastAt||now-lastAt>LIVE_SAFETY.maxFrameGapMs){
      last=points.map(p=>({x:p.x,y:p.y}));lastAt=now;lastWidth=check.width;good=1;rejected=0;
      return {safe:false,points:null,reason:'warming-up',rejected:0};
    }
    const step=now-lastAt;
    const motion=distance(points[1],last[1]);
    const scaleStep=Math.abs(check.width-lastWidth)/Math.max(.02,lastWidth);
    const contourJump=CONTOUR_SENTINELS.some(i=>distance(points[i],last[i])>LIVE_SAFETY.maxContourMotion);
    // Reacquire from a clean state instead of interpolating across unrelated faces.
    if(motion>LIVE_SAFETY.maxInstantMotion||scaleStep>LIVE_SAFETY.maxScaleStep||contourJump){
      reset();return reject('landmark-jump');
    }
    const a=clamp(LIVE_SAFETY.minAlpha+motion*10+step*.0006,LIVE_SAFETY.minAlpha,LIVE_SAFETY.maxAlpha);
    for(let i=0;i<last.length;i++){
      last[i].x+=(points[i].x-last[i].x)*a;
      last[i].y+=(points[i].y-last[i].y)*a;
    }
    lastAt=now;lastWidth=lastWidth+(check.width-lastWidth)*a;good++;
    if(good<LIVE_SAFETY.consecutiveGoodFrames)return {safe:false,points:null,reason:'warming-up',rejected};
    lastSafeAt=now;rejected=0;return {safe:true,points:last,reason:'ok',rejected:0};
  }
  function missing(){return reject('face-missing');}
  function canHold(now){return !!last&&Number.isFinite(now)&&now-lastSafeAt>=0&&now-lastSafeAt<=LIVE_SAFETY.graceHoldMs;}
  function heldPoints(now){return canHold(now)?last:null;}
  return {update,missing,reset,canHold,heldPoints,get goodFrames(){return good;},get rejectedFrames(){return rejected;}};
}
