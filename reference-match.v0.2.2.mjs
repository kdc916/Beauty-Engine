/**
 * maxVFX Beauty Engine v0.2.2: local bounded feature-transfer warp.
 * Only the 2D geometry of two single-face photographs is compared.
 * Does not identify people or predict cosmetic surgery results.
 * Pure functions, no images, storage, browser APIs, or network access.
 */
export const REFERENCE_REGIONS=Object.freeze(['eyes','nose','lips','jaw','brow']);
export const REGION_LANDMARKS=Object.freeze({
  eyes:[33,133,159,145,362,263,386,374,7,249],
  nose:[1,4,98,327,168,197,195],
  lips:[61,291,0,17,13,14,37,267],
  jaw:[234,454,152,172,397,136,365,149,378],
  brow:[70,63,105,107,336,296,334,300]
});
export const DEFAULT_MATCH_CONFIG=Object.freeze({
  enabled:false,globalStrength:.50,
  regions:Object.freeze({eyes:.55,nose:.40,lips:.45,jaw:.55,brow:.40}),
  maxDisplacementIPD:.08
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const safe=(v)=>Number.isFinite(v);
const center=(p,w,h,ids)=>{
  let x=0,y=0;
  for(const id of ids){const v=p[id];if(!v||!safe(v.x)||!safe(v.y))throw Error('유효하지 않은 얼굴 좌표');x+=v.x*w;y+=v.y*h;}
  return [x/ids.length,y/ids.length];
};
function faceFrame(points,w,h){
  if(!Array.isArray(points)||points.length<468||!safe(w)||!safe(h)||w<2||h<2)throw Error('얼굴 분석 정보가 올바르지 않습니다.');
  const l=center(points,w,h,[33,133,159,145]),r=center(points,w,h,[362,263,386,374]);
  const dx=r[0]-l[0],dy=r[1]-l[1],ipd=Math.hypot(dx,dy);
  if(ipd<12)throw Error('얼굴이 작아 참고 비율을 안정적으로 계산할 수 없습니다.');
  const ox=(l[0]+r[0])*.5,oy=(l[1]+r[1])*.5,c=dx/ipd,s=dy/ipd;
  return {ipd,c,s,w,h,point(id){const p=points[id];const x=p.x*w-ox,y=p.y*h-oy;return [(x*c+y*s)/ipd,(-x*s+y*c)/ipd];}};
}
export function buildReferenceMatch(sourcePoints,sourceW,sourceH,referencePoints,referenceW,referenceH){
  const src=faceFrame(sourcePoints,sourceW,sourceH),ref=faceFrame(referencePoints,referenceW,referenceH);
  const groups={};let valid=0;
  for(const region of REFERENCE_REGIONS){
    const radius={eyes:.35,nose:.34,lips:.39,jaw:.58,brow:.35}[region]*src.ipd;
    groups[region]=[];
    for(const i of REGION_LANDMARKS[region]){
      const sp=sourcePoints[i],from=src.point(i),to=ref.point(i);
      let dx=(to[0]-from[0])*src.c-(to[1]-from[1])*src.s;
      let dy=(to[0]-from[0])*src.s+(to[1]-from[1])*src.c;
      const distance=Math.hypot(dx,dy);
      // Individual landmarks are clamped before mixing; the final displacement has a second cap.
      const cap=.10;if(distance>cap){dx*=cap/distance;dy*=cap/distance;}
      if(!safe(dx)||!safe(dy))throw Error('얼굴 형태의 차이를 안정적으로 계산할 수 없습니다.');
      groups[region].push({x:sp.x*sourceW,y:sp.y*sourceH,dx:dx*src.ipd,dy:dy*src.ipd,radius});
      valid++;
    }
  }
  if(!valid)throw Error('유효한 참고 좌표가 없습니다.');
  return {groups,sourceW,sourceH,ipd:src.ipd};
}
function smooth(t){const x=clamp(t,0,1);return x*x*(3-2*x);}
// Boundary weight uses the same image-space aspect handling as the core mesh-warp.
function inside(x,y,outline){let hit=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){
  const a=outline[i],b=outline[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;
}return hit;}
function edgeWeight(x,y,outline,aspect,feather){
  if(!outline||outline.length<3)return 0; // Fail closed when missing a valid face boundary.
  if(!inside(x,y,outline))return 0;
  let dist2=Infinity,px=x*aspect;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[j],b=outline[i],ax=a.x*aspect,bx=b.x*aspect,dx=bx-ax,dy=b.y-a.y;
    const t=clamp(((px-ax)*dx+(y-a.y)*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);
    const ox=px-(ax+t*dx),oy=y-(a.y+t*dy);dist2=Math.min(dist2,ox*ox+oy*oy);
  }
  return smooth(Math.sqrt(dist2)/Math.max(.002,feather));
}
export function referenceWarpPoint(x,y,{match=null,config=DEFAULT_MATCH_CONFIG,outline=null,aspect=1}={}){
  if(!match||!config?.enabled||!outline?.length||!safe(x)||!safe(y)||!safe(aspect)||aspect<=0)return [x,y];
  const gain=clamp(config.globalStrength,0,1);if(gain<=0)return [x,y];
  const feather=clamp(match.ipd/match.sourceH*.075,.008,.029);
  const border=edgeWeight(x,y,outline,aspect,feather);
  if(border<=0)return [x,y];
  const px=x*match.sourceW,py=y*match.sourceH;
  let displacementX=0,displacementY=0;
  for(const region of REFERENCE_REGIONS){
    const g=clamp(config.regions?.[region]??0,0,1);
    if(!g)continue;
    let total=0,xx=0,yy=0;
    for(const a of match.groups[region]){
      const d2=((px-a.x)**2+(py-a.y)**2)/(a.radius*a.radius);
      if(d2>12)continue;
      const weight=Math.exp(-d2*2.1);
      total+=weight;xx+=a.dx*weight;yy+=a.dy*weight;
    }
    if(total>1e-7){
      const attenuation=smooth(clamp(total*.85,0,1));
      displacementX+=xx/total*attenuation*g;
      displacementY+=yy/total*attenuation*g;
    }
  }
  displacementX*=gain*border;displacementY*=gain*border;
  const limit=match.ipd*clamp(config.maxDisplacementIPD??.08,0,.10);
  const magnitude=Math.hypot(displacementX,displacementY);
  if(magnitude>limit){displacementX*=limit/magnitude;displacementY*=limit/magnitude;}
  // Inverse UV field: move texture sampling against the requested forward landmark displacement.
  return [clamp(x-displacementX/match.sourceW,0,1),clamp(y-displacementY/match.sourceH,0,1)];
}
