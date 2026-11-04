/**
 * maxVFX v0.9.0: optional MediaPipe face pose transform + conservative 2D fallback.
 * A 3D orientation proxy, not a photometric reconstruction or an occluded-face predictor.
 * Pure module; transient data only. Supports 4x4 row-major MediaPipe Matrix.data.
 */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=Number.isFinite;
const RAD=180/Math.PI;
const norm=(a)=>Math.hypot(...a);
const normalize=(a)=>{const n=norm(a);return n>1e-6?a.map(x=>x/n):null;};
export const POSE_LIMITS=Object.freeze({maxYawDeg:56,maxPitchDeg:46,minMatrixReliability:.65,maxStepDeg:36,staleMs:300});
export function poseFromMatrix(matrix){
  if(!matrix||matrix.rows!==4||matrix.columns!==4||!matrix.data||matrix.data.length!==16)return null;
  const m=matrix.data;if(!Array.from(m).every(finite))return null;
  // MediaPipe FaceGeometry PoseTransformMatrix uses row-major 4x4 packed data.
  const right=normalize([m[0],m[4],m[8]]),up=normalize([m[1],m[5],m[9]]),front=normalize([m[2],m[6],m[10]]);
  if(!right||!up||!front)return null;
  const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
  if(Math.abs(dot(right,up))>.18||Math.abs(dot(right,front))>.18||Math.abs(dot(up,front))>.18)return null;
  if(front[2]<.28)return null; // invalid/extreme canonical pose; don't trust 3D estimate
  const yaw=Math.atan2(front[0],front[2])*RAD;
  const pitch=Math.atan2(-front[1],Math.hypot(front[0],front[2]))*RAD;
  const roll=Math.atan2(right[1],right[0])*RAD;
  const reliability=clamp((front[2]-.28)/.72,0,1);
  return {yaw,pitch,roll,reliability,source:'matrix'};
}
export function poseFromLandmarks(points){
  if(!Array.isArray(points)||points.length<455)return null;
  const p=(i)=>points[i];for(const i of [1,33,263,234,454,10,152]){
    if(!p(i)||![p(i).x,p(i).y].every(finite))return null;
  }
  const left=p(234),right=p(454),nose=p(1),el=p(33),er=p(263);
  const width=Math.hypot(right.x-left.x,right.y-left.y);
  if(width<.06)return null;
  const yaw=clamp((nose.x-(left.x+right.x)*.5)/width*85,-55,55);
  const roll=Math.atan2(er.y-el.y,er.x-el.x)*RAD;
  const eyeY=(el.y+er.y)*.5,chin=p(152).y,top=p(10).y;
  const pitch=clamp(((eyeY-top)/Math.max(.04,chin-top)-.39)*55,-32,32);
  return {yaw,pitch,roll,reliability:.34,source:'landmark-proxy'};
}
export function estimateFacePose(matrix,landmarks){
  const best=poseFromMatrix(matrix)||poseFromLandmarks(landmarks);
  if(!best)return null;
  if(![best.yaw,best.pitch,best.roll,best.reliability].every(finite))return null;
  // Reliability fades with head turning, without claiming we know occluded geometry.
  const yawQ=clamp((POSE_LIMITS.maxYawDeg-Math.abs(best.yaw))/24,0,1);
  const pitchQ=clamp((POSE_LIMITS.maxPitchDeg-Math.abs(best.pitch))/18,0,1);
  return {...best,quality:clamp(best.reliability*Math.min(yawQ,pitchQ),0,1)};
}
export function createFacePoseTracker({alpha=.32}={}){
  let last=null,lastTime=-Infinity;
  function reset(){last=null;lastTime=-Infinity;}
  function update(matrix,landmarks,now){
    const candidate=estimateFacePose(matrix,landmarks);
    if(!candidate||!finite(now)){reset();return null;}
    if(last&&now>lastTime&&now-lastTime<POSE_LIMITS.staleMs){
      const jump=Math.max(Math.abs(candidate.yaw-last.yaw),Math.abs(candidate.pitch-last.pitch),Math.abs(candidate.roll-last.roll));
      if(jump>POSE_LIMITS.maxStepDeg){reset();return null;}
      const a=clamp(alpha+((now-lastTime)/1000)*.12,.15,.85);
      for(const k of ['yaw','pitch','roll','quality'])candidate[k]=last[k]+(candidate[k]-last[k])*a;
    }
    last=candidate;lastTime=now;return {...candidate};
  }
  function missing(){reset();}
  return {update,missing,reset,get current(){return last?{...last}:null;}};
}
export function poseLightingUniform(pose){
  if(!pose||pose.quality<=.001)return [0,0,0,0];
  return [clamp(pose.yaw/60,-1,1),clamp(pose.pitch/50,-1,1),clamp(pose.roll/90,-1,1),clamp(pose.quality,0,1)];
}
