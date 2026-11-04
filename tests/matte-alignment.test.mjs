import test from 'node:test';
import assert from 'node:assert/strict';
import {measureFaceAlignment,isMatteAligned} from '../matte-alignment.v0.9.0.mjs';
const face=()=>{const p=Array.from({length:468},()=>({x:.5,y:.5}));
  p[1]={x:.5,y:.48};p[33]={x:.35,y:.35};p[263]={x:.65,y:.35};return p;};
test('accepts exact anchor match',()=>{const p=face();assert.ok(isMatteAligned(measureFaceAlignment(p),p));});
test('rejects nose motion',()=>{const p=face(),anchor=measureFaceAlignment(p);p[1].x+=.06;assert.equal(isMatteAligned(anchor,p),false);});
test('rejects eye position drift even when nose remains',()=>{const p=face(),anchor=measureFaceAlignment(p);p[33].x+=.06;p[263].x+=.06;assert.equal(isMatteAligned(anchor,p),false);});
test('rejects eye scale change with fixed nose',()=>{const p=face(),anchor=measureFaceAlignment(p);p[33].x=.29;p[263].x=.71;assert.equal(isMatteAligned(anchor,p),false);});
test('rejects eye roll change and tolerates small rotation',()=>{const p=face(),anchor=measureFaceAlignment(p);
  p[33].y=.29;p[263].y=.41;assert.equal(isMatteAligned(anchor,p),false);
  p[33].y=.34;p[263].y=.36;assert.equal(isMatteAligned(anchor,p),true);});
test('fail closed on stale legacy or malformed face',()=>{
  const p=face();assert.equal(isMatteAligned({noseX:.5,noseY:.48},p),false);
  assert.equal(measureFaceAlignment([]),null);assert.equal(isMatteAligned(null,p),false);
});
