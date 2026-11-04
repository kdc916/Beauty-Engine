/** v0.9.0 — local pose continuity / confidence gate.
 * Fast fade-out, delayed re-acquisition. Never extrapolates hidden anatomy.
 * Pose source may be MediaPipe 4x4 matrix or landmark-proxy.
 */
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function createPoseContinuityGate({jumpDeg=21,minStableFrames=3,releaseMs=70,acquireMs=300,staleMs=380}={}){
  let last=null,lastAt=null,stable=0,gain=0,quality=0,reason='warming-up';
  function reset(){last=null;lastAt=null;stable=0;gain=0;quality=0;reason='warming-up';}
  function update(pose,now){
    if(!Number.isFinite(now)||now<0)return {gain:0,lightGain:0,stable:0,reason:'invalid-time'};
    const dt=lastAt===null?0:Math.max(0,Math.min(120,now-lastAt));
    const oldAt=lastAt;lastAt=now;
    const valid=!!pose&&[pose.yaw,pose.pitch,pose.roll,pose.quality].every(Number.isFinite)&&pose.quality>=0&&pose.quality<=1;
    const gap=oldAt!==null&&(now<oldAt||now-oldAt>staleMs);
    if(gap){last=null;stable=0;gain=0;quality=0;reason='stale';}
    let abrupt=false;
    if(valid&&last&&!gap){
      const dist=Math.max(Math.abs(pose.yaw-last.yaw),Math.abs(pose.pitch-last.pitch),Math.abs(pose.roll-last.roll));
      abrupt=dist>jumpDeg&&dt<125;
    }
    let target=0;
    if(!valid){stable=0;last=null;reason='lost';}
    else if(abrupt){stable=0;last=null;reason='pose-jump';}
    else{
      last={yaw:pose.yaw,pitch:pose.pitch,roll:pose.roll};
      stable=Math.min(minStableFrames+1,stable+1);
      const yawFactor=1-clamp((Math.abs(pose.yaw)-26)/26,0,1);
      const pitchFactor=1-clamp((Math.abs(pose.pitch)-21)/22,0,1);
      // 2D fallback is explicitly lower confidence; never treat it as a 3D pose.
      const sourceCap=pose.source==='matrix'?1:.42;
      quality=clamp(pose.quality,0,1)*Math.min(yawFactor,pitchFactor)*sourceCap;
      target=stable>=minStableFrames?quality:0;
      reason=target>0?'stable':'acquiring';
    }
    const tau=target<gain?releaseMs:acquireMs;
    const a=dt===0?0:1-Math.exp(-dt/Math.max(1,tau));
    gain=clamp(gain+(target-gain)*a,0,1);
    if(!valid||abrupt)quality=0;
    const lightGain=clamp(gain*(pose?.source==='matrix'?1:.45),0,1);
    return {gain,lightGain,stable,reason};
  }
  return {update,reset,get current(){return {gain,stable,reason};}};
}
