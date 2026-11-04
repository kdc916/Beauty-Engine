import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveFaceFilter,validateLiveFace} from '../live-safety.v0.2.7.mjs';
import {createWarpGrid,updateWarpGrid,warpPoint,checkWarpStretch} from '../mesh-warp.v0.2.7.mjs';
import {FACE_OUTLINE_IDS} from '../mesh-warp.v0.2.7.mjs';

function face(dx=0){
  const p=Array.from({length:478},(_,i)=>({x:.5+dx,y:.5}));
  p[1]={x:.5+dx,y:.47};p[234]={x:.26+dx,y:.51};p[454]={x:.74+dx,y:.51};p[152]={x:.5+dx,y:.83};
  return p;
}
function params(){
 const p=face();
 const outline=FACE_OUTLINE_IDS.map((_,i)=>{
   const a=i*2*Math.PI/FACE_OUTLINE_IDS.length-Math.PI/2;
   return {x:.5+Math.cos(a)*.245,y:.50+Math.sin(a)*.32};
 });
 const small=Array.from({length:13},()=>({x:.5,y:.5}));
 Object.assign(small,{0:{x:.39,y:.38},1:{x:.61,y:.38},2:{x:.5,y:.54},3:{x:.5,y:.79},4:{x:.26,y:.51},5:{x:.74,y:.51},10:{x:.5,y:.18}});
 return {outline,small};
}
test('camera warp only engages after two valid frames and recovers from missed face',()=>{
 const filter=createLiveFaceFilter();
 assert.equal(filter.update(face(),100).safe,false);
 assert.equal(filter.update(face(.001),200).safe,true);
 assert.equal(filter.missing().safe,false);
 assert.equal(filter.update(face(.002),300).safe,false);
 assert.equal(filter.update(face(.003),400).safe,true);
});
test('face jump, invalid coordinates and large scale change fail closed',()=>{
 const filter=createLiveFaceFilter();filter.update(face(),100);filter.update(face(.001),200);
 assert.equal(filter.update(face(.25),300).safe,false);
 assert.equal(filter.update(face(),400).safe,false);
 assert.equal(filter.update(face(.001),500).safe,true);
 const bad=face();bad[23].x=Infinity;
 assert.deepEqual(validateLiveFace(bad).valid,false);
 assert.equal(filter.update(bad,600).safe,false);
 const huge=face();huge[234].x=.01;huge[454].x=.98;
 assert.equal(filter.update(huge,700).safe,false);
 const chinFilter=createLiveFaceFilter();chinFilter.update(face(),100);chinFilter.update(face(.001),200);
 const unstable=face();unstable[152].x+=.18;
 assert.equal(chinFilter.update(unstable,300).safe,false,'isolated chin landmark jump must be rejected');
});
test('mesh never applies warp outside its contour, nor without contours',()=>{
 const {outline,small}=params();
 for(const p of [[.04,.05],[.97,.9],[.5,.95],[.5,.84]]){
   assert.deepEqual(warpPoint(...p,{face:small,outline,slim:1,eyes:1,aspect:.8}),p);
 }
 assert.deepEqual(warpPoint(.68,.65,{face:small,outline:null,slim:1,eyes:1,aspect:.8}),[.68,.65]);
});
test('UV stretch gate guarantees bounded inverse map for 4:5, square and widescreen',()=>{
 const {outline,small}=params();
 for(const [w,h] of [[720,900],[900,900],[1600,900]])for(const mirror of [false,true]){
   const mesh=createWarpGrid();
   for(const strength of [0,.3,1]){
     updateWarpGrid(mesh,{face:small,outline,slim:strength,eyes:strength,width:w,height:h,mirror});
     const q=checkWarpStretch(mesh,w/h);
     assert.equal(q.failures,0,JSON.stringify({w,h,mirror,strength,q}));
     assert.equal(mesh.foldovers,0);
     for(let i=0;i<mesh.vertices.length;i+=4){
       assert.ok(Number.isFinite(mesh.vertices[i+2])&&Number.isFinite(mesh.vertices[i+3]));
     }
   }
 }
});
test('stretch or non-finite emergency falls back to identity UV',()=>{
 const mesh=createWarpGrid(8,8),{outline,small}=params();
 const broken=small.map(p=>({...p}));broken[4].x=Infinity;
 updateWarpGrid(mesh,{face:broken,outline,slim:1,eyes:1,width:720,height:900});
 assert.equal(mesh.foldovers,0);assert.equal(mesh.stretchFailures,0);
 assert.equal(mesh.usedIdentity,true);
});
