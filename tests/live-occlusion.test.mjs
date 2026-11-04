import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveFaceFilter,validateLiveFace,LIVE_SAFETY} from '../live-safety.v0.9.0.mjs';
function face(){const p=Array.from({length:478},()=>({x:.5,y:.5}));p[1]={x:.5,y:.48};p[234]={x:.26,y:.5};p[454]={x:.74,y:.5};p[152]={x:.5,y:.82};return p;}
test('short occlusion is held for under 130ms and never indefinitely',()=>{const f=createLiveFaceFilter();f.update(face(),100);assert.equal(f.update(face(),200).safe,true);assert.equal(f.canHold(290),true);f.missing();assert.ok(f.heldPoints(300));assert.equal(f.canHold(331),false);assert.equal(f.heldPoints(333),null);});
test('no hold during warmup or after reset',()=>{const f=createLiveFaceFilter();f.update(face(),100);assert.equal(f.canHold(130),false);f.reset();assert.equal(f.canHold(130),false);});
test('clearly asymmetric face tracking is rejected',()=>{const p=face();p[1].x=.73;assert.equal(validateLiveFace(p).valid,false);});
test('full missing data cannot activate a safe filter',()=>{const f=createLiveFaceFilter();assert.equal(f.update([],100).safe,false);assert.equal(f.missing().safe,false);assert.equal(f.canHold(110),false);assert.ok(LIVE_SAFETY.graceHoldMs<=150);});
