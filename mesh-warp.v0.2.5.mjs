import {referenceWarpPoint} from './reference-match.v0.2.5.mjs';
/* maxVFX Beauty Engine v0.2.5 — bounded triangular grid face mesh warp.
   Pure ES module, no browser dependencies, independently unit-testable.
   Positions and inverse source UVs are interpolated on GPU with one draw call.
   Landmark points and source UVs are in normalized TOP-LEFT image coordinates.
*/
export const FACE_OUTLINE_IDS = Object.freeze([
  10,338,297,332,284,251,389,356,454,323,361,288,
  397,365,379,378,400,377,152,148,176,149,150,136,
  172,58,132,93,234,127,162,21,54,103,67,109
]);
export const DEFAULT_COLS = 56;
export const DEFAULT_ROWS = 72;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = t => { const n=clamp(t,0,1); return n*n*(3-2*n); };

export function createWarpGrid(cols=DEFAULT_COLS, rows=DEFAULT_ROWS) {
  if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||rows<2||(cols+1)*(rows+1)>65535)
    throw new RangeError('Invalid grid dimensions for Uint16 indices');
  const vertices = new Float32Array((cols+1)*(rows+1)*4);
  const indices = new Uint16Array(cols*rows*6);
  let k=0;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const a=y*(cols+1)+x, b=a+1, c=a+cols+1, d=c+1;
    indices[k++]=a;indices[k++]=b;indices[k++]=c;
    indices[k++]=b;indices[k++]=d;indices[k++]=c;
  }
  return {cols,rows,vertices,indices,baseUV:new Float32Array(vertices.length/2),deltaUV:new Float32Array(vertices.length/2),blend:1,foldovers:0,stretchFailures:0,usedIdentity:false};
}

function polygonInside(x,y,outline){
  let inside=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[i],b=outline[j];
    if ((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
function segmentDistanceSquared(x,y,a,b,aspect){
  const ax=a.x*aspect, bx=b.x*aspect, px=x*aspect;
  const dx=bx-ax,dy=b.y-a.y, q=(dx*dx+dy*dy);
  const t=q>1e-10?clamp(((px-ax)*dx+(y-a.y)*dy)/q,0,1):0;
  const ex=px-(ax+t*dx),ey=y-(a.y+t*dy);
  return ex*ex+ey*ey;
}
function boundaryWeight(x,y,outline,aspect,feather){
  if(!outline || outline.length<3)return 0; // fail closed; missing contour must never warp the background
  if(!polygonInside(x,y,outline))return 0;
  let minSq=Infinity;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const d=segmentDistanceSquared(x,y,outline[j],outline[i],aspect);
    if(d<minSq)minSq=d;
  }
  return smooth(Math.sqrt(minSq)/feather);
}
function gaussian(x,y,cx,cy,rx,ry,aspect){
  const dx=(x-cx)*aspect/Math.max(0.0001,rx),dy=(y-cy)/Math.max(0.0001,ry);
  const r2=dx*dx+dy*dy;
  return r2>12?0:Math.exp(-r2*0.5);
}

/**
 * Read-only inverse warp. Returns source UV for a destination pixel.
 * When data is missing, strength is zero or pixel is outside the face, it is an identity map.
 * face matches LANDMARK_IDS=[33,263,1,152,234,454,...] from the engine.
 */
export function warpPoint(x,y,{face,outline,aspect,slim=0,eyes=0}){
  if(!face||face.length<11||(!slim&&!eyes))return [x,y];
  if(!Number.isFinite(aspect)||aspect<=0||!Number.isFinite(x)||!Number.isFinite(y))return [x,y];
  const l=face[4],r=face[5],chin=face[3],nose=face[2];
  if(!l||!r||!chin||!nose)return [x,y];
  const width=Math.max(.05,Math.hypot((r.x-l.x)*aspect,r.y-l.y));
  const height=Math.max(.08,Math.hypot((face[10].x-chin.x)*aspect,face[10].y-chin.y));
  const feather=clamp(width*.055,.012,.035);
  const hull=boundaryWeight(x,y,outline,aspect,feather);
  if(hull<=0)return [x,y];
  let du=0,dv=0;
  const eyeLevel=clamp(eyes,0,1);
  if(eyeLevel>0){
    const radius=width*.24;
    for(const eye of [face[0],face[1]]){
      const dx=(x-eye.x)*aspect,dy=y-eye.y;
      const t=Math.hypot(dx,dy)/Math.max(.01,radius);
      if(t<1){
        const w=(1-smooth(t))**2 * .23*eyeLevel;
        du-=(x-eye.x)*w;
        dv-=(y-eye.y)*w;
      }
    }
  }
  const slimLevel=clamp(slim,0,1);
  if(slimLevel>0){
    const cx=(l.x+r.x)*.5;
    const midY=(nose.y+chin.y)*.5;
    const chinSpan=Math.max(.05,chin.y-nose.y);
    const relativeY=(y-nose.y)/chinSpan;
    // Jaw warp must fade *before* reaching the silhouette, chin and neck.
    // An oval cheek patch on the 0.2.2 mesh pulled background pixels across
    // the right chin; a fourth-power rim gate keeps the background identity.
    const cheekY=smooth(relativeY/.30)*(1-smooth((relativeY-.70)/.25));
    const side=Math.abs(x-cx)/Math.max(.03,Math.abs(r.x-l.x)*.5);
    const cheekX=smooth((side-.22)/.23)*(1-smooth((side-.74)/.20));
    const safeBoundary=hull*hull*hull;
    const left=gaussian(x,y,l.x*.58+chin.x*.42,midY,width*.30,height*.26,aspect);
    const right=gaussian(x,y,r.x*.58+chin.x*.42,midY,width*.30,height*.26,aspect);
    du+=(x-cx)*(.095*slimLevel*cheekY*cheekX*safeBoundary*Math.max(left,right));
  }
  // Never sample outside the source image. The hull feather protects hair/background.
  return [clamp(x+du*hull,0,1),clamp(y+dv*hull,0,1)];
}
function checkFoldovers(mesh,mirror){
  const a=mesh.vertices, ids=mesh.indices;
  const sign=mirror?1:-1; // source y goes top-to-bottom; source x mirrors optionally.
  let count=0;
  for(let k=0;k<ids.length;k+=3){
    const i0=ids[k]*4,i1=ids[k+1]*4,i2=ids[k+2]*4;
    const x1=a[i1+2]-a[i0+2],y1=a[i1+3]-a[i0+3];
    const x2=a[i2+2]-a[i0+2],y2=a[i2+3]-a[i0+3];
    if((x1*y2-y1*x2)*sign<=1e-8)count++;
  }
  return count;
}

/**
 * Reject UV edge discontinuities as well as flipped triangles. These are often
 * perceived as torn skin even when every triangle remains correctly oriented.
 */
export function checkWarpStretch(mesh,aspect=1,minRatio=.80,maxRatio=1.20){
  const {cols,rows,vertices}=mesh;
  let failures=0,peak=1;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
    const i=(y*(cols+1)+x)*4,ux=vertices[i+2],uy=vertices[i+3];
    if(!Number.isFinite(ux)||!Number.isFinite(uy))return {failures:1,peak:Infinity};
    if(x<cols){
      const j=i+4,dx=(vertices[j+2]-ux)*aspect,dy=vertices[j+3]-uy;
      const ratio=Math.hypot(dx,dy)/(aspect/cols);
      if(!Number.isFinite(ratio)||ratio<minRatio||ratio>maxRatio)failures++;
      peak=Math.max(peak,ratio);
    }
    if(y<rows){
      const j=i+(cols+1)*4,dx=(vertices[j+2]-ux)*aspect,dy=vertices[j+3]-uy;
      const ratio=Math.hypot(dx,dy)/(1/rows);
      if(!Number.isFinite(ratio)||ratio<minRatio||ratio>maxRatio)failures++;
      peak=Math.max(peak,ratio);
    }
  }
  return {failures,peak};
}

export function updateWarpGrid(mesh,{face=null,outline=null,mirror=false,width=720,height=900,slim=0,eyes=0,referenceMatch=null,referenceConfig=null}={}){
  const {cols,rows,vertices}=mesh;
  const aspect=Math.max(.01,width)/Math.max(.01,height);
  // Inverse mapping: destination is bottom-left GL space; source is top-left texture space.
  const sourceBase=mesh.baseUV,displacement=mesh.deltaUV;
  let k=0,u=0;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
    const dx=x/cols,dy=y/rows;
    const inputX=mirror?1-dx:dx,inputY=1-dy;
    const transformed=warpPoint(inputX,inputY,{face,outline,aspect,slim,eyes});
    // Combine bounded reference displacement with the preexisting local eye/jaw warp.
    const matched=referenceWarpPoint(inputX,inputY,{match:referenceMatch,config:referenceConfig,outline,aspect});
    const refDu=(matched[0]-inputX)*0.92;
    const refDv=(matched[1]-inputY)*0.92;
    transformed[0]=clamp(transformed[0]+refDu,0,1);
    transformed[1]=clamp(transformed[1]+refDv,0,1);
    vertices[k++]=dx*2-1;
    vertices[k++]=dy*2-1;
    sourceBase[u]=inputX; displacement[u++]=transformed[0]-inputX;
    sourceBase[u]=inputY; displacement[u++]=transformed[1]-inputY;
    vertices[k++]=transformed[0];
    vertices[k++]=transformed[1];
  }
  let foldovers=checkFoldovers(mesh,mirror),stretch=checkWarpStretch(mesh,aspect),blend=1;
  // A foldover is not the only artifact: excessive UV stretching makes jagged
  // patches at the jaw. Reduce the *entire* displacement field on either failure.
  for(let attempts=0;(foldovers||stretch.failures)&&attempts<9;attempts++){
    blend*=.5;
    for(let v=0;v<sourceBase.length/2;v++){
      vertices[v*4+2]=sourceBase[v*2]+displacement[v*2]*blend;
      vertices[v*4+3]=sourceBase[v*2+1]+displacement[v*2+1]*blend;
    }
    foldovers=checkFoldovers(mesh,mirror);
    stretch=checkWarpStretch(mesh,aspect);
  }
  if(foldovers||stretch.failures){
    // Ultimate safety invariant: an identity texture map is always preferable
    // to a visibly broken face. Keep the untouched source frame.
    blend=0;
    for(let v=0;v<sourceBase.length/2;v++){
      vertices[v*4+2]=sourceBase[v*2];
      vertices[v*4+3]=sourceBase[v*2+1];
    }
    foldovers=checkFoldovers(mesh,mirror);
    stretch=checkWarpStretch(mesh,aspect);
  }
  mesh.blend=blend;
  mesh.foldovers=foldovers;
  mesh.stretchFailures=stretch.failures;
  mesh.usedIdentity=blend===0;
  return mesh;
}
