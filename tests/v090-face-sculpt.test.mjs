import test from 'node:test';
import assert from 'node:assert/strict';
import {sculptPoint,SCULPT_KEYS} from '../face-sculpt.v0.9.0.mjs';
import {createWarpGrid,updateWarpGrid,checkWarpStretch} from '../mesh-warp.v0.9.0.mjs';
const landmarks=Array.from({length:478},()=>({x:.5,y:.52}));
Object.assign(landmarks,{
  1:{x:.5,y:.52},33:{x:.38,y:.38},263:{x:.62,y:.38},61:{x:.44,y:.64},291:{x:.56,y:.64},13:{x:.50,y:.63},14:{x:.50,y:.66},
  70:{x:.41,y:.30},300:{x:.59,y:.30},234:{x:.32,y:.53},454:{x:.68,y:.53},152:{x:.50,y:.79}
});
const outline=Array.from({length:36},(_,i)=>({x:.5+.25*Math.cos(i*Math.PI*2/36),y:.51+.33*Math.sin(i*Math.PI*2/36)}));
const values=Object.fromEntries(SCULPT_KEYS.map(k=>[k,100]));
function warp(x,y,options={}){return sculptPoint(x,y,{landmarks,outline,aspect:.8,values,...options});}
test('sculpt returns identity on image background and malformed tracking',()=>{
 for(const p of [[.01,.01],[0,.6],[.99,.3],[.5,.98]]) assert.deepEqual(warp(...p),p);
 assert.deepEqual(sculptPoint(.5,.5,{landmarks:null,outline,values}),[.5,.5]);
 assert.deepEqual(sculptPoint(.5,.5,{landmarks,outline:[],values}),[.5,.5]);
});
test('each region modifies at least one local sample under bounded max displacement',()=>{
 const points=[[.53,.53],[.51,.64],[.41,.30],[.59,.30],[.35,.55],[.5,.75],[.44,.64],[.54,.65]];
 for(const key of SCULPT_KEYS){
   const only=Object.fromEntries(SCULPT_KEYS.map(k=>[k,k===key?100:0]));
   const changed=points.some(([x,y])=>{const q=sculptPoint(x,y,{landmarks,outline,aspect:.8,values:only});return Math.hypot((q[0]-x)*.8,q[1]-y)>1e-8;});
   assert(changed,`Expected localized change for ${key}`);
 }
});
test('live sculpt rejects low confidence and never applies cheek/chin',()=>{
 const p=[.45,.7];
 assert.deepEqual(warp(...p,{live:true,confidence:.40}),p);
 const only={nose:0,lipShape:0,browLift:0,smile:0,cheek:100,chin:100};
 assert.deepEqual(sculptPoint(...p,{landmarks,outline,aspect:.8,values:only,live:true,confidence:1}),p);
});
test('face grid never folds and safely limits stretch for photo and live',()=>{
 for(const live of [false,true])for(const mirror of [false,true]){
   const mesh=createWarpGrid(56,72);
   updateWarpGrid(mesh,{width:900,height:1100,mirror,outline,sculpt:values,sculptLandmarks:landmarks,sculptLive:live,sculptConfidence:1});
   assert.equal(mesh.foldovers,0);assert.equal(mesh.stretchFailures,0);
   assert.equal(checkWarpStretch(mesh,900/1100).failures,0);
   for(let i=0;i<mesh.vertices.length;i+=4){assert(mesh.vertices[i+2]>=0&&mesh.vertices[i+2]<=1);assert(mesh.vertices[i+3]>=0&&mesh.vertices[i+3]<=1);}
 }
});
