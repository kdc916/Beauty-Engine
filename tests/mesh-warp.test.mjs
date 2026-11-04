import assert from 'node:assert/strict';
import {createWarpGrid,updateWarpGrid,warpPoint,FACE_OUTLINE_IDS} from '../mesh-warp.v0.2.4.mjs';

const face=Array.from({length:13},()=>({x:.51,y:.5}));
Object.assign(face,{
  0:{x:.41,y:.37},1:{x:.61,y:.37},2:{x:.51,y:.53},
  3:{x:.51,y:.78},4:{x:.29,y:.51},5:{x:.73,y:.51},10:{x:.51,y:.18}
});
const outline=Array.from({length:36},(_,i)=>({x:.51+Math.cos(i*Math.PI*2/36)*.25,y:.49+Math.sin(i*Math.PI*2/36)*.31}));
function run(aspect,mirror){
  const grid=createWarpGrid(56,72), noFace=createWarpGrid(56,72);
  updateWarpGrid(noFace,{mirror,width:Math.round(900*aspect),height:900});
  updateWarpGrid(grid,{face,outline,mirror,width:Math.round(900*aspect),height:900,slim:0,eyes:0});
  assert.deepEqual(grid.vertices,noFace.vertices,'0% must be an identity map');
  assert.equal(grid.foldovers,0,'identity must not fold');
  const before=grid.vertices.slice();
  updateWarpGrid(grid,{face,outline,mirror,width:Math.round(900*aspect),height:900,slim:1,eyes:1});
  assert.equal(grid.foldovers,0,'face mesh must not fold over at max settings');
  let changed=0,maxDisplace=0;
  for(let i=0;i<grid.vertices.length;i+=4){
    const px=before[i+2],py=before[i+3],ux=grid.vertices[i+2],uy=grid.vertices[i+3];
    const dist=Math.hypot(px-ux,py-uy);
    if(dist>1e-5)changed++;
    maxDisplace=Math.max(maxDisplace,dist);
    assert(ux>=0&&ux<=1&&uy>=0&&uy<=1,'all source coords within [0..1]');
    if(px<.12||px>.90||py<.1||py>.9){assert.equal(dist,0,'background must remain identical')}
  }
  assert(changed>0,'Face should visibly change');
  assert(maxDisplace<.06,'Warp must remain bounded');
  console.log('PASS grid',aspect,mirror?'mirrored':'normal','vertices',grid.vertices.length/4,'changed',changed,'max',maxDisplace.toFixed(5));
}
for(const aspect of [.8,1,16/9])for(const mirror of [false,true])run(aspect,mirror);
for(const p of [[0,0],[1,1],[.02,.56],[.99,.45]]){
  assert.deepEqual(warpPoint(...p,{face,outline,aspect:.8,eyes:1,slim:1}),p,'image background should not deform');
}
assert.throws(()=>createWarpGrid(300,300),RangeError);
assert.equal(FACE_OUTLINE_IDS.length,36);
console.log('PASS mesh identity, background protection, foldover limits, aspect-ratio/mirror behavior');
