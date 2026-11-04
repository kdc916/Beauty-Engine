/**
 * maxVFX v0.9.0 — time-based filter fade independent of render FPS.
 * Keeps the last valid appearance only briefly. It never predicts geometry.
 */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const LIVE_TRANSITION=Object.freeze({attackMs:170,releaseMs:115,maxStaleMs:310});
export function createLiveTransition({attackMs=170,releaseMs=115}={}){
  let value=0,lastAt=null;
  function reset(){value=0;lastAt=null;}
  function step(now,target){
    if(!Number.isFinite(now))return value;
    const t=clamp(Number.isFinite(target)?target:0,0,1);
    if(lastAt===null){lastAt=now;return value;}
    const dt=clamp(now-lastAt,0,70);lastAt=now;
    const tau=t>value?attackMs:releaseMs;
    const a=1-Math.exp(-dt/Math.max(1,tau));
    value=clamp(value+(t-value)*a,0,1);
    if(Math.abs(value-t)<.004)value=t;
    return value;
  }
  return {step,reset,get value(){return value;}};
}
