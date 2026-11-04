/**
 * maxVFX v0.9.0 — low-frequency scene illuminance / white-balance proxy.
 * Not calibrated lux or physically accurate 3D light estimation.
 * No frame content is stored or transmitted.
 */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
/** Slew-rate limiter for transient camera exposure/white-balance spikes. */
export function createLightStabilizer({alpha=.20}={}){
  let value={brightness:.5,shadow:0,warmth:0,direction:0};
  const steps={brightness:.070,shadow:.025,warmth:.021,direction:.026};
  function update(candidate){
    if(!candidate)return {...value};
    for(const key of Object.keys(value)){
      const next=candidate[key];if(!Number.isFinite(next))continue;
      const step=steps[key];
      value[key]+=clamp((next-value[key])*clamp(alpha,.01,1),-step,step);
    }
    return {...value};
  }
  function reset(){value={brightness:.5,shadow:0,warmth:0,direction:0};}
  return {update,reset,get value(){return {...value};}};
}

export function estimateAmbientFromPixels(data,width,height){
  if(!data||width<2||height<2||data.length<width*height*4)return null;
  let l=0,left=0,right=0,rl=0,bl=0,n=0,nl=0,nr=0;
  // Exclude top/bottom 15% to reduce ceiling and clothing contamination.
  const y0=Math.floor(height*.15),y1=Math.ceil(height*.85);
  for(let y=y0;y<y1;y+=2)for(let x=0;x<width;x+=2){
    const j=(y*width+x)*4,r=data[j]/255,g=data[j+1]/255,b=data[j+2]/255;
    const lum=.2126*r+.7152*g+.0722*b;
    if(lum<.03||lum>.98)continue;
    l+=lum;rl+=r-g;bl+=b-g;n++;
    if(x<width*.5){left+=lum;nl++;}else{right+=lum;nr++;}
  }
  if(n<12)return null;
  const brightness=l/n;
  const warmth=clamp((rl-bl)/n*1.0,-.28,.28);
  const direction=nl&&nr?clamp(((left/nl)-(right/nr))*.8,-.4,.4):0;
  // Shadows may be brightened softly; preserve original highlights.
  const shadow=clamp((.46-brightness)*.75,-.14,.20);
  return {brightness,shadow,warmth,direction};
}
export function createAmbientTracker({intervalMs=280,alpha=.18}={}){
  const w=24,h=24;let canvas=null,ctx=null,lastAt=-Infinity;
  const smoother=createLightStabilizer({alpha});
  function updateFrame(source,now){
    if(!source||!Number.isFinite(now)||now-lastAt<intervalMs)return smoother.value;
    lastAt=now;
    try{
      if(!canvas){canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;ctx=canvas.getContext('2d',{willReadFrequently:true});}
      ctx.drawImage(source,0,0,w,h);
      const e=estimateAmbientFromPixels(ctx.getImageData(0,0,w,h).data,w,h);
      if(e)smoother.update(e);
    }catch{/* Cross-origin/image read failure: keep neutral or last valid estimate. */}
    return smoother.value;
  }
  function reset(){lastAt=-Infinity;smoother.reset();}
  return {updateFrame,reset,get value(){return smoother.value;}};
}
