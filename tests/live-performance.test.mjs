import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_PROFILES, createLivePerformanceController, getLiveResolution} from '../live-performance.v0.9.0.mjs';

function simulate(controller,{durationMs,renderGapMs,renderCostMs,detectCostMs=25,startAt=0}){
  for(let t=startAt;t<=startAt+durationMs;t+=renderGapMs){
    controller.recordDetection(detectCostMs);
    controller.recordRendered(t,renderCostMs);
  }
}

test('all live profiles use finite, increasing power budgets',()=>{
  assert.equal(getLiveResolution(1280,720,LIVE_PROFILES.balanced)[0],768);
  assert.deepEqual(getLiveResolution(720,1280,LIVE_PROFILES.battery),[288,512]);
  assert.deepEqual(getLiveResolution(320,240,LIVE_PROFILES.quality),[320,240]);
  assert.deepEqual(getLiveResolution(NaN,0),[720,900]);
  assert.ok(LIVE_PROFILES.quality.maxSide>LIVE_PROFILES.balanced.maxSide);
  assert.ok(LIVE_PROFILES.balanced.renderFPS>LIVE_PROFILES.performance.renderFPS);
});

test('auto starts balanced and drops resolution after sustained overload',()=>{
  const p=createLivePerformanceController('auto');
  assert.equal(p.tier,'balanced');
  simulate(p,{durationMs:19000,renderGapMs:65,renderCostMs:44,detectCostMs:92});
  assert.equal(p.tier,'battery');
  assert.ok(p.transitions>=2);
});

test('manual quality profile is not changed by overload',()=>{
  const p=createLivePerformanceController('quality');
  simulate(p,{durationMs:24000,renderGapMs:100,renderCostMs:90,detectCostMs:130});
  assert.equal(p.tier,'quality');
  assert.equal(p.transitions,0);
});

test('auto recovers slowly and never secretly upgrades above balanced',()=>{
  const p=createLivePerformanceController('auto');
  simulate(p,{durationMs:19000,renderGapMs:65,renderCostMs:44,detectCostMs:92});
  assert.equal(p.tier,'battery');
  // Recovery happens only if a tier can hit *its own* target frame pacing.
  let t=19100;
  while(t<63000){
    p.recordDetection(10);
    p.recordRendered(t,4);
    t+=1000/p.profile.renderFPS;
  }
  assert.equal(p.tier,'balanced');
});

test('frame pacing, detector intervals and suspended state are deterministic',()=>{
  const p=createLivePerformanceController('balanced');
  assert.equal(p.shouldRender(0),true);
  p.recordRendered(0,5);
  assert.equal(p.shouldRender(12),false);
  assert.equal(p.shouldRender(40),true);
  assert.equal(p.shouldDetect(100,0),false);
  assert.equal(p.shouldDetect(140,0),true);
  p.setSuspended(true);
  assert.equal(p.shouldRender(10000),false);
  assert.equal(p.shouldDetect(10000,0),false);
  p.setSuspended(false);
  assert.equal(p.shouldRender(10001),true);
});

test('malformed quality modes are rejected without breaking active profile',()=>{
  const p=createLivePerformanceController();
  assert.equal(p.setMode('impossible'),false);
  assert.equal(p.mode,'auto');
  assert.equal(p.setMode('battery'),true);
  assert.equal(p.tier,'battery');
  assert.equal(p.setMode('auto'),true);
  assert.equal(p.tier,'balanced');
});
