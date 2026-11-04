import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoseContinuityGate} from '../pose-continuity.v0.9.0.mjs';
const p=(yaw=0,source='matrix')=>({yaw,pitch:0,roll:0,quality:1,source});
test('rejects single-frame pose jump then slowly reacquires',()=>{
  const c=createPoseContinuityGate();c.update(p(),0);c.update(p(),40);let r=c.update(p(),80);
  assert.equal(r.stable,3);assert.ok(r.gain>0);
  r=c.update(p(),120);assert.ok(r.gain>0);
  r=c.update(p(55),135);assert.equal(r.reason,'pose-jump');
  assert.ok(r.gain<.3);assert.equal(r.lightGain<=r.gain,true);
  r=c.update(p(55),175);assert.equal(r.reason,'acquiring');
  r=c.update(p(55),215);assert.ok(r.gain<.3);
});
test('missing/invalid pose never raises gain and resets stability',()=>{
  const c=createPoseContinuityGate();for(let t=0;t<400;t+=40)c.update(p(),t);
  const before=c.current.gain;assert.ok(before>0);
  const r=c.update(null,410);assert.equal(r.reason,'lost');assert.ok(r.gain<before);
  assert.equal(c.update({yaw:NaN,pitch:0,roll:0,quality:1},450).stable,0);
});
test('fallback landmarks remain conservative vs matrix',()=>{
  const a=createPoseContinuityGate(),b=createPoseContinuityGate();let ma,pr;
  for(let t=0;t<1000;t+=40){ma=a.update(p(),t);pr=b.update(p(0,'landmark-proxy'),t);}
  assert.ok(pr.gain<ma.gain*.5);assert.ok(pr.lightGain<ma.lightGain*.25);
});
test('extreme yaw never regains strong deformation',()=>{
  const c=createPoseContinuityGate();let r;
  for(let t=0;t<1000;t+=40)r=c.update(p(55),t);
  assert.ok(r.gain<.04);
});
test('stale gap resets accumulated confidence',()=>{
  const c=createPoseContinuityGate();for(let t=0;t<600;t+=40)c.update(p(),t);
  const r=c.update(p(),1500);assert.equal(r.stable,1);assert.equal(r.gain,0);
});
test('nonfinite timestamps fail closed',()=>{
  const c=createPoseContinuityGate();assert.equal(c.update(p(),NaN).gain,0);
});
