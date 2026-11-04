import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveTransition,LIVE_TRANSITION} from '../live-transition.v0.9.0.mjs';
test('filter fades in from zero without one-frame appearance pop',()=>{
  const g=createLiveTransition();assert.equal(g.step(0,1),0);
  const a=g.step(16,1);assert.ok(a>0&&a<.2);
  const b=g.step(32,1);assert.ok(b>a&&b<.4);
});
test('filter fades out instead of keeping a stale full-strength face',()=>{
  const g=createLiveTransition();g.step(0,1);
  for(let t=16;t<=400;t+=16)g.step(t,1);
  const strong=g.value;const a=g.step(416,0);const b=g.step(448,0);
  assert.ok(a<strong&&a>0);assert.ok(b<a);
});
test('elapsed time determines transition at 30fps and 60fps',()=>{
  const a=createLiveTransition(),b=createLiveTransition();a.step(0,1);b.step(0,1);
  for(let t=10;t<=320;t+=10)a.step(t,1);
  for(let t=20;t<=320;t+=20)b.step(t,1);
  assert.ok(Math.abs(a.value-b.value)<1e-6);
});
test('invalid targets and reset fail safely',()=>{
  const g=createLiveTransition();g.step(0,1);g.step(20,NaN);
  assert.ok(g.value>=0&&g.value<=1);
  g.reset();assert.equal(g.value,0);
  assert.ok(LIVE_TRANSITION.maxStaleMs<=350);
});
