import test from 'node:test';
import assert from 'node:assert/strict';
import {createOcclusionTemporalFilter,conservativeOccluderEdge} from '../semantic-temporal.v0.9.0.mjs';
const matte=(x)=>new Uint8Array([x,x,x,x]);

test('new mask is used immediately and creates opaque alpha',()=>{
  const f=createOcclusionTemporalFilter();
  const x=f.update(matte(255),2,2,{now:100,noseX:.5,noseY:.5});
  assert.deepEqual([...x.rgba],[255,0,0,255,255,0,0,255,255,0,0,255,255,0,0,255]);
  assert.equal(x.reset,true);
});
test('new occluder attacks faster than it releases',()=>{
  const f=createOcclusionTemporalFilter();
  f.update(matte(0),2,2,{now:100,noseX:.5,noseY:.5});
  const on=f.update(matte(255),2,2,{now:540,noseX:.5,noseY:.5});
  const initialProtection=on.rgba[0];
  assert.ok(initialProtection>=200);
  const off=f.update(matte(0),2,2,{now:980,noseX:.5,noseY:.5});
  assert.ok(off.rgba[0]>=100);
  assert.ok(off.rgba[0]<initialProtection);
});
test('tracking displacement immediately invalidates old mask',()=>{
  const f=createOcclusionTemporalFilter();
  f.update(matte(255),2,2,{now:100,noseX:.3,noseY:.5});
  const r=f.update(matte(0),2,2,{now:520,noseX:.4,noseY:.5});
  assert.equal(r.reset,true);assert.equal(r.rgba[0],0);
});
test('source mode, timestamp gaps and dimensions invalidate history',()=>{
  const f=createOcclusionTemporalFilter();
  f.update(matte(255),2,2,{now:100,noseX:.5,noseY:.5,mode:'VIDEO'});
  assert.equal(f.update(matte(0),2,2,{now:540,noseX:.5,noseY:.5,mode:'IMAGE'}).reset,true);
  assert.equal(f.update(matte(255),2,2,{now:3000,noseX:.5,noseY:.5,mode:'IMAGE'}).reset,true);
  assert.equal(f.update(new Uint8Array(9),3,3,{now:3100,noseX:.5,noseY:.5,mode:'IMAGE'}).reset,true);
  f.reset();assert.equal(f.count,0);
});
test('protective edge expands seam without removing central occluder',()=>{
  const a=new Uint8Array(9);a[4]=255;
  const o=conservativeOccluderEdge(a,3,3);
  assert.equal(o[4],255);
  for(const i of [1,3,5,7])assert.ok(o[i]>=85);
  for(const i of [0,2,6,8])assert.equal(o[i],0);
});
test('reject incorrect mask payload, no silent memory corruption',()=>{
  const f=createOcclusionTemporalFilter();
  assert.throws(()=>f.update(new Uint8Array(3),2,2,{now:10,noseX:.5,noseY:.5}));
  assert.throws(()=>conservativeOccluderEdge(new Uint8Array(2),2,2));
});
