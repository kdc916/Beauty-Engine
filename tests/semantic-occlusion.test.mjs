import test from 'node:test';
import assert from 'node:assert/strict';
import {SEGMENTATION_CLASSES,categoriesToProtection,faceMaskQuality,faceBoundsFromLandmarks,protectionToRGBA,segmentationInterval,maskIsFresh,createSemanticMatteState} from '../semantic-occlusion.v0.9.0.mjs';

test('model category map makes face skin editable, hand/hair/background protected',()=>{
  const mask=new Uint8Array([3,1,2,0,4,5,3,3,3,3,3,3,3,3,3,3]);
  const m=categoriesToProtection(mask,4,4,{feather:false});
  assert.deepEqual([...m.protection.slice(0,8)],[0,255,255,255,255,255,0,0]);
  assert.equal(m.faceCount,11);
  assert.equal(SEGMENTATION_CLASSES.faceSkin,3);
});
test('conservative boundary feather never unprotects a solid hair/hand pixel',()=>{
  const mask=new Uint8Array(25).fill(3);mask[12]=2;
  const result=categoriesToProtection(mask,5,5).protection;
  assert.ok(result[12]>=209);
  assert.ok(result[11]>0&&result[13]>0);
  assert.equal(result[0],0);
});
test('invalid labels, dimensions and oversized images fail closed',()=>{
  assert.throws(()=>categoriesToProtection(new Uint8Array([3,1]),2,2));
  assert.throws(()=>categoriesToProtection(new Uint8Array([7,7,7,7]),2,2));
  assert.throws(()=>categoriesToProtection(new Uint8Array(0),2000,2000));
});
test('mask confidence validation rejects missing face and all-face classifications',()=>{
  const w=20,h=20,roi={left:.1,top:.1,right:.9,bottom:.9};
  assert.equal(faceMaskQuality(new Uint8Array(w*h).fill(1),w,h,roi).valid,false);
  assert.equal(faceMaskQuality(new Uint8Array(w*h).fill(3),w,h,roi).valid,false);
  const labels=new Uint8Array(w*h).fill(2);
  for(let y=4;y<16;y++)for(let x=4;x<16;x++)labels[y*w+x]=3;
  assert.equal(faceMaskQuality(labels,w,h,roi).valid,true);
});
test('face bounds, stride and buffer reuse preserve orientation',()=>{
  const pts=Array.from({length:478},()=>({x:.5,y:.5}));
  pts[10]={x:.5,y:.1};pts[152]={x:.5,y:.8};pts[234]={x:.2,y:.5};pts[454]={x:.8,y:.5};
  assert.deepEqual(faceBoundsFromLandmarks(pts),{left:.2,right:.8,top:.1,bottom:.8});
  const input=new Uint8Array([0,255,128,255]);
  const out=protectionToRGBA(input,2,2);
  assert.deepEqual([...out],[0,0,0,255,255,0,0,255,128,0,0,255,255,0,0,255]);
  assert.strictEqual(protectionToRGBA(input,2,2,out),out);
});
test('mode adaptive interval and mask freshness disallow stale camera matte',()=>{
  assert.equal(segmentationInterval({maxSide:512}),820);
  assert.equal(segmentationInterval({maxSide:640}),620);
  assert.equal(segmentationInterval({maxSide:768}),420);
  assert.equal(maskIsFresh(1400,500,'camera'),true);
  assert.equal(maskIsFresh(1500,500,'camera'),false);
  assert.equal(maskIsFresh(150000,500,'photo'),true);
  assert.equal(maskIsFresh(450,500,'camera'),false);
});
test('generation gate invalidates stale masks after source replacement',()=>{
  const state=createSemanticMatteState(),old=state.generation;
  const frame={valid:true,rgba:new Uint8Array(4),width:1,height:1};
  assert.equal(state.commit(frame,100,old),true);
  assert.strictEqual(state.current(300,'camera'),frame);
  state.reset();
  assert.equal(state.commit(frame,200,old),false);
  assert.strictEqual(state.current(300,'camera'),null);
  assert.equal(state.commit(frame,200,state.generation),true);
});
