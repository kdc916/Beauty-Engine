import test from 'node:test';
import assert from 'node:assert/strict';
import {lightFieldTarget,createLightFieldTracker} from '../face-light-field.v0.9.0.mjs';
const env={shadow:.6,direction:.8,warmth:.3};
const pose={yaw:0,pitch:0,quality:1};
test('without a valid face, 3D light is disabled',()=>{
  assert.equal(lightFieldTarget(env,null,80).confidence,0);
  assert.equal(lightFieldTarget(env,{yaw:NaN,pitch:0,quality:1},80).intensity,0);
});
test('strong head yaw fades relighting, never fabricates hidden-face normals',()=>{
  const front=lightFieldTarget(env,pose,80);
  const profile=lightFieldTarget(env,{...pose,yaw:56},80);
  assert.ok(front.confidence>profile.confidence);
  assert.equal(profile.confidence,0);
});
test('light intensity and direction bounded for unrealistic input',()=>{
  const v=lightFieldTarget({shadow:99,direction:999},pose,150);
  assert.ok(v.x>=-.78&&v.x<=.78);
  assert.ok(v.intensity<=1&&v.intensity>=0);
});
test('light strength is zero if user disables slider',()=>{
  assert.equal(lightFieldTarget(env,pose,0).intensity,0);
});
test('temporal light field cannot jump on single frame',()=>{
  const f=createLightFieldTracker();
  f.update({...env,direction:-1},pose,100,0);
  const a=f.current;
  f.update({...env,direction:1},pose,100,16);
  assert.ok(Math.abs(f.current.x-a.x)<=.025);
});
test('reset removes pose-dependent lighting state',()=>{
  const f=createLightFieldTracker();f.update(env,pose,100,10);
  f.reset();assert.equal(f.current.confidence,0);
});
