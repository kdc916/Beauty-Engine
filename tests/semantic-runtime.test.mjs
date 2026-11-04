import test from 'node:test';
import assert from 'node:assert/strict';
import {createSemanticOcclusionController} from '../semantic-occlusion-runtime.v0.9.0.mjs';

const landmarks=()=>{const p=Array.from({length:478},()=>({x:.5,y:.5}));Object.assign(p,{10:{x:.5,y:.1},152:{x:.5,y:.9},234:{x:.1,y:.5},454:{x:.9,y:.5},33:{x:.35,y:.36},263:{x:.65,y:.36}});return p;};
const result=(good=true)=>({categoryMask:{width:20,height:20,getAsUint8Array:()=>{
 const labels=new Uint8Array(400).fill(good?2:1);
 if(good)for(let y=4;y<16;y++)for(let x=4;x<16;x++)labels[y*20+x]=3;
 return labels;
},close:()=>{}}});
const mock=({modeError=false}={})=>({
  async setOptions(o){if(modeError)throw Error('delegate unavailable');},
  segmentForVideo(_src,_time,cb){cb(result());},
  segment(_src,cb){cb(result());},
  close(){}
});
test('off by default; opt-in processes a valid mask from fake synchronous MediaPipe task',async()=>{
 let frames=0,processed=0;
 const c=createSemanticOcclusionController({taskFactory:async()=>mock(),onMatte:()=>frames++,onInferenceCost:()=>processed++});
 assert.equal(c.enabled,false);
 assert.equal(await c.process({}, {now:900,sourceMode:'camera',landmarks:landmarks()}),false);
 c.setEnabled(true);await c.initialize();
 assert.equal(await c.process({}, {now:1200,sourceMode:'camera',landmarks:landmarks(),profile:{maxSide:768}}),true);
 assert.equal(processed,1);assert.ok(frames>=2);
 assert.ok(c.getMatte(performance.now(),'camera')?.rgba?.length===1600);
 c.dispose();assert.equal(c.enabled,false);
});
test('switching source invalidates mask, delayed result cannot survive token change',async()=>{
 let release;
 const c=createSemanticOcclusionController({taskFactory:()=>new Promise(r=>release=r)});
 c.setEnabled(true);
 const pending=c.process({}, {now:500,sourceMode:'photo',landmarks:landmarks()});
 await Promise.resolve();c.resetSource();release(mock());
 assert.equal(await pending,false);
 assert.equal(c.getMatte(performance.now(),'photo'),null);
 c.dispose();
});
test('repeated model errors fail back to base live safety mode without infinite retry',async()=>{
 let errors=0;
 const c=createSemanticOcclusionController({taskFactory:async()=>mock({modeError:true}),onFailure:()=>errors++});
 c.setEnabled(true);await c.initialize();
 assert.equal(await c.process({}, {now:500,sourceMode:'camera',landmarks:landmarks()}),false);
 assert.equal(await c.process({}, {now:1200,sourceMode:'camera',landmarks:landmarks()}),false);
 assert.equal(c.enabled,false);assert.equal(errors,1);
 c.dispose();
});
test('invalid segmentation replaces previous matte with safe fallback immediately',async()=>{
 let good=true;
 const task={async setOptions(){},segmentForVideo(_s,_t,cb){cb(result(good));},close(){}};
 const c=createSemanticOcclusionController({taskFactory:async()=>task});
 c.setEnabled(true);await c.initialize();
 assert.equal(await c.process({}, {now:1000,sourceMode:'camera',landmarks:landmarks(),profile:{maxSide:768}}),true);
 assert.ok(c.getMatte(performance.now(),'camera'));
 good=false;
 assert.equal(await c.process({}, {now:1500,sourceMode:'camera',landmarks:landmarks(),profile:{maxSide:768}}),false);
 assert.equal(c.getMatte(performance.now(),'camera'),null);
 c.dispose();
});
