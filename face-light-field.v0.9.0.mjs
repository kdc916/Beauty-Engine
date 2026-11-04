/**
 * v0.9.0 pose-guided light field. Not physical scene light reconstruction.
 * Outputs bounded, temporally stabilized shader controls from scene video.
 * 3D proxy uses face orientation as a directional hint, not actual depth.
 */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=x=>Number.isFinite(x);
export function lightFieldTarget(env,pose,strength=45){
  if(!env||!pose||![pose.yaw,pose.pitch,pose.quality].every(finite))return {x:0,y:0,intensity:0,confidence:0};
  const conf=clamp(pose.quality,0,1)*clamp((55-Math.abs(pose.yaw))/30,0,1)*clamp((42-Math.abs(pose.pitch))/22,0,1);
  const direction=clamp(finite(env.direction)?env.direction:0,-1,1);
  const shadow=clamp(finite(env.shadow)?env.shadow:0,0,1);
  const gain=clamp(strength/100,0,1);
  return {x:clamp(-direction*.78,-.78,.78),y:.23,intensity:clamp((.25+.75*shadow)*gain,0,1),confidence:conf};
}
export function createLightFieldTracker({tauMs=250,maxChangePer100Ms=.15}={}){
  let current={x:0,y:.23,intensity:0,confidence:0},last=-Infinity;
  function reset(){current={x:0,y:.23,intensity:0,confidence:0};last=-Infinity;}
  function update(env,pose,strength,now){
    if(!finite(now)||now<0)return {...current};
    const target=lightFieldTarget(env,pose,strength);
    if(last===-Infinity||now<last||now-last>1500){current=target;last=now;return {...current};}
    const dt=clamp(now-last,0,300);
    const alpha=1-Math.exp(-dt/Math.max(30,tauMs));
    const maxStep=clamp(maxChangePer100Ms*dt/100,0,.30);
    for(const k of ['x','y','intensity','confidence']){
      const delta=clamp((target[k]-current[k])*alpha,-maxStep,maxStep);
      current[k]=clamp(current[k]+delta,k==='x'?-1:0,1);
    }
    last=now;return {...current};
  }
  return {update,reset,get current(){return {...current};}};
}
