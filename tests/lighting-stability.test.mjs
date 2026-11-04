import test from 'node:test';
import assert from 'node:assert/strict';
import {createLightStabilizer,estimateAmbientFromPixels,createAmbientTracker} from '../ambient-light.v0.3.1.mjs';
test('one-frame lighting spike is capped to prevent visible flicker',()=>{
  const filter=createLightStabilizer({alpha:1});
  const a=filter.update({brightness:1,shadow:.2,warmth:.28,direction:.4});
  assert.ok(a.shadow<=.0250001);assert.ok(a.warmth<=.0210001);assert.ok(a.direction<=.0260001);
});
test('sustained real scene lighting changes eventually follow target',()=>{
  const filter=createLightStabilizer();let prev=filter.value.shadow;
  for(let i=0;i<30;i++){
    const x=filter.update({brightness:.15,shadow:.18,warmth:.16,direction:-.13});
    assert.ok(x.shadow>=prev);prev=x.shadow;
  }
  assert.ok(filter.value.shadow>.12);
});
test('corrupt estimates do not propagate NaNs into GPU uniforms',()=>{
  const filter=createLightStabilizer();const v=filter.update({brightness:NaN,shadow:Infinity,warmth:NaN,direction:undefined});
  for(const x of Object.values(v))assert.ok(Number.isFinite(x));
  filter.reset();assert.equal(filter.value.shadow,0);
});
test('ambient pixel estimator remains compatible with previous processing',()=>{
  const arr=new Uint8Array(24*24*4);for(let i=0;i<arr.length;i+=4){arr[i]=140;arr[i+1]=139;arr[i+2]=137;arr[i+3]=255;}
  assert.ok(Number.isFinite(estimateAmbientFromPixels(arr,24,24).brightness));
  const t=createAmbientTracker();assert.equal(t.value.shadow,0);
});
