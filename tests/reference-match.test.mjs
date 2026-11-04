import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReferenceMatch,referenceWarpPoint,DEFAULT_MATCH_CONFIG} from '../reference-match.v0.2.5.mjs';
import {createWarpGrid,updateWarpGrid,FACE_OUTLINE_IDS} from '../mesh-warp.v0.2.5.mjs';

function sampleFace(variant=0){
  const pts=Array.from({length:478},()=>({x:.50,y:.52}));
  FACE_OUTLINE_IDS.forEach((id,i)=>{const t=i/FACE_OUTLINE_IDS.length*2*Math.PI-Math.PI/2;pts[id]={x:.5+Math.cos(t)*.27,y:.5+Math.sin(t)*.38};});
  const features={
    33:[.33,.36],133:[.43,.36],159:[.38,.345],145:[.38,.38],7:[.36,.355],
    362:[.57,.36],263:[.67,.36],386:[.62,.345],374:[.62,.38],249:[.64,.355],
    70:[.34,.30],63:[.36,.29],105:[.39,.3],107:[.41,.30],
    336:[.59,.3],296:[.62,.29],334:[.65,.3],300:[.67,.30],
    1:[.5,.50],4:[.5,.545],98:[.46,.54],327:[.54,.54],168:[.5,.4],197:[.5,.47],195:[.5,.52],
    61:[.44,.65],291:[.56,.65],0:[.5,.625],17:[.5,.68],13:[.5,.644],14:[.5,.659],37:[.46,.63],267:[.54,.63],
    234:[.26,.55],454:[.74,.55],152:[.5,.84],172:[.34,.75],397:[.66,.75],136:[.38,.77],365:[.62,.77],149:[.46,.835],378:[.54,.835]
  };
  for(const [id,p] of Object.entries(features))pts[Number(id)]={x:p[0],y:p[1]};
  if(variant){
    for(const id of [33,133,159,145,7])pts[id].x+=.028*variant;
    for(const id of [362,263,386,374,249])pts[id].x-=.025*variant;
    for(const id of [98,327])pts[id].x+=(id===98?-.027:.027)*variant;
    for(const id of [61,291,0,17,13,14,37,267])pts[id].y+=.018*variant;
    for(const id of [234,454,172,397,136,365])pts[id].x+=(pts[id].x<.5?.035:-.035)*variant;
    for(const id of [70,63,105,107,336,296,334,300])pts[id].y-=.021*variant;
  }
  return pts;
}
const face=sampleFace(),ref=sampleFace(1),outline=FACE_OUTLINE_IDS.map(i=>face[i]);
const config={enabled:true,globalStrength:1,regions:{eyes:1,nose:1,lips:1,jaw:1,brow:1},maxDisplacementIPD:.08};
const context={match:buildReferenceMatch(face,800,1000,ref,800,1000),config,outline,aspect:.8};

test('identity for disabled, zero strength, and exactly matching landmarks',()=>{
  const unchanged={...context,config:{...config,enabled:false}};
  for(const point of [[.5,.5],[.48,.63],[.4,.34],[.9,.9]])assert.deepEqual(referenceWarpPoint(...point,unchanged),point);
  assert.deepEqual(referenceWarpPoint(.5,.52,{...context,config:{...config,globalStrength:0}}),[.5,.52]);
  const same=buildReferenceMatch(face,800,1000,face,800,1000);
  for(const point of [[.5,.52],[.41,.37],[.5,.65]]){
    const out=referenceWarpPoint(...point,{...context,match:same});
    assert.ok(Math.abs(out[0]-point[0])<1e-12&&Math.abs(out[1]-point[1])<1e-12);
  }
});
test('matching changes local features but not background, and enforces maximum delta',()=>{
  assert.deepEqual(referenceWarpPoint(.9,.1,context),[.9,.1]);
  const probes=[[.38,.36],[.46,.54],[.5,.64],[.4,.73],[.6,.3]];
  let changed=0;
  for(const point of probes){
    const p=referenceWarpPoint(...point,context);
    if(Math.hypot(p[0]-point[0],p[1]-point[1])>1e-6)changed++;
    const pixels=Math.hypot((p[0]-point[0])*800,(p[1]-point[1])*1000);
    assert.ok(pixels<=context.match.ipd*.08001,`delta: ${pixels}`);
  }
  assert.ok(changed>=3,`unexpected number of affected regions ${changed}`);
});
test('part toggle isolates feature groups',()=>{
  const eyesOnly={...context,config:{...config,regions:{eyes:1,nose:0,lips:0,jaw:0,brow:0}}};
  assert.deepEqual(referenceWarpPoint(.50,.65,eyesOnly),[.5,.65]);
});
test('mesh blend prevents foldovers across aspect ratios and mirror modes',()=>{
  for(const [w,h] of [[800,1000],[900,900],[1600,900]])for(const mirror of [false,true]){
    const mesh=createWarpGrid();
    updateWarpGrid(mesh,{face:null,outline,mirror,width:w,height:h,slim:0,eyes:0,referenceMatch:buildReferenceMatch(face,w,h,ref,w,h),referenceConfig:config});
    assert.equal(mesh.foldovers,0,`mesh folds at ${w}x${h} mirror=${mirror} blend=${mesh.blend}`);
    assert.ok(mesh.blend>=0&&mesh.blend<=1);
  }
});
test('invalid landmarks are rejected',()=>{
  assert.throws(()=>buildReferenceMatch([],800,1000,ref,800,1000));
  assert.throws(()=>buildReferenceMatch(face,0,1000,ref,800,1000));
});
