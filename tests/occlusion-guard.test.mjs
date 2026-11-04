import test from 'node:test';
import assert from 'node:assert/strict';
import {createOcclusionGuard,OCCLUSION_LIMITS,poseSafetyMultiplier} from '../occlusion-guard.v0.9.0.mjs';
function face(){
  const p=Array.from({length:478},(_,i)=>({x:.5+.18*Math.sin(i*1.12),y:.5+.18*Math.cos(i*.93)}));
  p[234]={x:.26,y:.51};p[454]={x:.74,y:.51};p[1]={x:.5,y:.46};
  p[33]={x:.36,y:.35};p[263]={x:.64,y:.35};p[10]={x:.5,y:.16};p[152]={x:.5,y:.85};
  p[61]={x:.44,y:.64};p[291]={x:.56,y:.64};return p;
}
function translate(points,x,y=0){return points.map(p=>({x:p.x+x,y:p.y+y}));}
function initial(){const g=createOcclusionGuard(),p=face();assert.equal(g.inspect(p,100).safe,true);assert.equal(g.commit(p,100),true);return {g,p};}
test('isolated chin landmark jump is repaired, not inherited by mesh',()=>{
  const {g,p}=initial();const bad=translate(p,.008);bad[152].x+=.20;
  const result=g.inspect(bad,200);assert.equal(result.safe,true);
  assert.equal(result.repaired,1);assert.ok(result.quality<1);
  assert.ok(Math.abs(result.points[152].x-(p[152].x+.008))<.001);
  assert.equal(bad[152].x>result.points[152].x,true,'original input untouched');
});
test('partial eye and mouth landmark anomalies recover conservatively',()=>{
  const {g,p}=initial(),bad=translate(p,.003);bad[33].y+=.11;bad[61].x-=.12;
  const r=g.inspect(bad,180);assert.equal(r.safe,true);assert.equal(r.repaired,2);assert.ok(r.quality<1);
});
test('many feature outliers are rejected rather than rendered',()=>{
  const {g,p}=initial(),bad=face();for(let i=0;i<33;i++)bad[i].x+=.18;
  const r=g.inspect(bad,170);assert.equal(r.safe,false);
  assert.equal(r.reason,'large-occlusion-or-profile');
});
test('fast entire-head translation does not try to repair a new face',()=>{
  const {g,p}=initial();const r=g.inspect(translate(p,.25),170);
  assert.equal(r.safe,false);assert.equal(r.reason,'fast-motion');
});
test('invalid initial landmarks fail closed and do not seed tracking',()=>{
  const g=createOcclusionGuard(),bad=face();bad[152].x=NaN;
  assert.equal(g.inspect(bad,100).safe,false);assert.equal(g.hasReference,false);
  assert.equal(g.commit(bad,100),false);
});
test('transient invalid points can be replaced without leaking NaN',()=>{
  const {g,p}=initial(),bad=face();bad[152].x=Infinity;
  const r=g.inspect(bad,130);assert.equal(r.safe,true);assert.equal(r.repaired,1);
  assert.ok(Number.isFinite(r.points[152].x));
});
test('continuous repair is time limited and must not freeze indefinitely',()=>{
  const {g,p}=initial();for(let ms=130;ms<=310;ms+=30){const q=face();q[152].x+=.15;
    const r=g.inspect(q,ms);assert.equal(r.safe,true);g.commit(r.points,ms);
  }
  const q=face();q[152].x+=.15;const r=g.inspect(q,420);
  assert.equal(r.safe,false);assert.equal(r.reason,'repair-timeout');
  assert.ok(OCCLUSION_LIMITS.maxRepairDurationMs<300);
});
test('reset removes prior face and old motion estimate',()=>{
  const {g,p}=initial();g.reset();assert.equal(g.hasReference,false);
  const shifted=translate(p,.18);assert.equal(g.inspect(shifted,500).safe,true);
});

test('large yaw/pitch safely fades facial deformation without changing tracking data',()=>{
  assert.equal(poseSafetyMultiplier(null),1);
  assert.equal(poseSafetyMultiplier({yaw:0,pitch:0}),1);
  const moderate=poseSafetyMultiplier({yaw:40,pitch:12});
  assert.ok(moderate<1&&moderate>.3);
  assert.ok(poseSafetyMultiplier({yaw:55,pitch:5})<moderate);
  assert.equal(poseSafetyMultiplier({yaw:NaN,pitch:0}),0);
});
