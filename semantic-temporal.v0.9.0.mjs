/**
 * maxVFX Beauty Engine 0.3.0 — occlusion matte temporal stabilizer.
 * Works exclusively on 8-bit local masks. Faster protective attack than
 * release, with an unconditional reset after large head movement.
 * Never carries a matte across a new image/source or model restart.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createOcclusionTemporalFilter({attack=.84,release=.42,maxGapMs=1400,maxMotion=.032}={}){
  let last=null,rgba=null,w=0,h=0,lastX=0,lastY=0,lastTime=-Infinity,lastMode='';
  let count=0;
  function reset(){last=null;rgba=null;w=0;h=0;lastX=0;lastY=0;lastTime=-Infinity;lastMode='';count=0;}
  function update(protection,width,height,{now,noseX,noseY,mode='VIDEO'}={}){
    if(!(protection instanceof Uint8Array)||!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||protection.length!==width*height)throw Error('Invalid protection matte');
    if(![now,noseX,noseY].every(Number.isFinite))throw Error('Invalid matte tracking timestamp');
    if(now<0)throw Error('Invalid matte time');
    const n=width*height;
    const resetFrame=!last||w!==width||h!==height||mode!==lastMode||now<=lastTime||now-lastTime>maxGapMs||Math.hypot(noseX-lastX,noseY-lastY)>maxMotion;
    if(resetFrame){last=new Float32Array(n);rgba=new Uint8Array(n*4);count=0;}
    for(let i=0;i<n;i++){
      const target=protection[i];
      if(resetFrame)last[i]=target;
      else last[i]+=(target-last[i])*(target>last[i]?clamp(attack,0,1):clamp(release,0,1));
      // Edge preservation: a new occluder always wins rapidly.
      const k=i*4;rgba[k]=Math.round(last[i]);rgba[k+1]=0;rgba[k+2]=0;rgba[k+3]=255;
    }
    w=width;h=height;lastX=noseX;lastY=noseY;lastTime=now;lastMode=mode;count++;
    return {rgba,width,height,reset:resetFrame,count};
  }
  return {update,reset,get count(){return count;}};
}
/** One-pixel protective expansion to cover hair/hand mask seams. */
export function conservativeOccluderEdge(protection,width,height){
  if(!(protection instanceof Uint8Array)||protection.length!==width*height||width<2||height<2)throw Error('Invalid edge mask');
  const out=new Uint8Array(protection.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,base=protection[i];
    const left=protection[y*width+Math.max(0,x-1)],right=protection[y*width+Math.min(width-1,x+1)];
    const top=protection[Math.max(0,y-1)*width+x],bottom=protection[Math.min(height-1,y+1)*width+x];
    const neighbor=Math.max(left,right,top,bottom);
    out[i]=Math.max(base,Math.round(neighbor*.35));
  }
  return out;
}
