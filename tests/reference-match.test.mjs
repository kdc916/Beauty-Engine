import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReferenceMatch,referenceWarpPoint} from '../reference-match.v0.2.2.mjs';
import {createWarpGrid,updateWarpGrid,FACE_OUTLINE_IDS} from '../mesh-warp.v0.2.2.mjs';
function face(modifier=0){
 const p=Array.from({length:478},()=>({x:.5,y:.52}));
 FACE_OUTLINE_IDS.forEach((id,i)=>{const a=2*Math.PI*i/FACE_OUTLINE_IDS.length-Math.PI/2;p[id]={x:.5+Math.cos(a)*.27,y:.5+Math.sin(a)*.38};});
 const anchor={33:[.33,.36],133:[.43,.36],159:[.38,.345],145:[.38,.38],7:[.36,.355],
 362:[.57,.36],263:[.67,.36],386:[.62,.345],374:[.62,.38],249:[.64,.355],
 70:[.34,.30],63:[.36,.29],105:[.39,.30],107:[.41,.30],336:[.59,.30],296:[.62,.29],334:[.65,.30],300:[.67,.30],
 1:[.5,.50],4:[.5,.545],98:[.46,.54],327:[.54,.54],168:[.5,.4],197:[.5,.47],195:[.5,.52],
 61:[.44,.65],291:[.56,.65],0:[.5,.625],17:[.5,.68],13:[.5,.644],14:[.5,.659],37:[.46,.63],267:[.54,.63],
 234:[.26,.55],454:[.74,.55],152:[.5,.84],172:[.34,.75],397:[.66,.75],136:[.38,.77],365:[.62,.77],149:[.46,.835],378:[.54,.835]};
 for(const [id,xy] of Object.entries(anchor))p[+id]={x:xy[0],y:xy[1]};
 if(modifier){
  for(const id of [33,133,159,145,7])p[id].x+=.028;
  for(const id of [362,263,386,374,249])p[id].x-=.025;
  for(const id of [98,327])p[id].x+=(id===98?-.027:.027);
  for(const id of [61,291,0,17,13,14,37,267])p[id].y+=.018;
  for(const id of [234,454,172,397,136,365])p[id].x+=(p[id].x<.5?.035:-.035);
  for(const id of [70,63,105,107,336,296,334,300])p[id].y-=.021;
 }return p;
}
const own=face(),ref=face(1),outline=FACE_OUTLINE_IDS.map(i=>own[i]);
const cfg={enabled:true,globalStrength:1,regions:{eyes:1,nose:1,lips:1,jaw:1,brow:1},maxDisplacementIPD:.08};
const match=buildReferenceMatch(own,800,1000,ref,800,1000),opts={match,config:cfg,outline,aspect:.8};
test('disabled/zero/identical faces preserve the original UV',()=>{
 for(const p of [[.5,.5],[.4,.35],[.9,.9]]){
  assert.deepEqual(referenceWarpPoint(...p,{...opts,config:{...cfg,enabled:false}}),p);
  assert.deepEqual(referenceWarpPoint(...p,{...opts,config:{...cfg,globalStrength:0}}),p);
  const same=referenceWarpPoint(...p,{...opts,match:buildReferenceMatch(own,800,1000,own,800,1000)});
  assert.ok(Math.hypot(same[0]-p[0],same[1]-p[1])<1e-12);
 }
});
test('five part morph stays inside source face and below hard IPD limit',()=>{
 assert.deepEqual(referenceWarpPoint(.9,.1,opts),[.9,.1]);
 let changed=0;
 for(const p of [[.38,.36],[.46,.54],[.5,.64],[.4,.73],[.6,.3]]){
  const q=referenceWarpPoint(...p,opts),d=Math.hypot((q[0]-p[0])*800,(q[1]-p[1])*1000);
  if(d>1e-6)changed++;
  assert.ok(d<=match.ipd*.08001);
 }
 assert.ok(changed>=3);
});
test('disabling independent facial regions avoids unrelated changes',()=>{
 const c={...cfg,regions:{eyes:1,nose:0,lips:0,jaw:0,brow:0}};
 assert.deepEqual(referenceWarpPoint(.5,.65,{...opts,config:c}),[.5,.65]);
});
test('triangular grid never folds after attenuation across aspects/mirrors',()=>{
 for(const [w,h] of [[800,1000],[900,900],[1600,900]])for(const mirror of [false,true]){
  const grid=createWarpGrid();
  updateWarpGrid(grid,{outline,mirror,width:w,height:h,referenceMatch:buildReferenceMatch(own,w,h,ref,w,h),referenceConfig:cfg});
  assert.equal(grid.foldovers,0);
  assert.ok(grid.blend>=0&&grid.blend<=1);
 }
});
test('invalid landmarks reject instead of mutating canvas',()=>{
 assert.throws(()=>buildReferenceMatch([],800,1000,ref,800,1000));
 assert.throws(()=>buildReferenceMatch(own,0,1000,ref,800,1000));
});