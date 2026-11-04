import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateAmbientFromPixels,createAmbientTracker} from '../ambient-light.v0.9.0.mjs';
function frame(r,g,b){const a=new Uint8ClampedArray(24*24*4);for(let i=0;i<a.length;i+=4){a[i]=r;a[i+1]=g;a[i+2]=b;a[i+3]=255;}return a;}
test('dark scene receives positive capped fill, no overexposure',()=>{const v=estimateAmbientFromPixels(frame(45,42,40),24,24);assert.ok(v.shadow>0&&v.shadow<=.20);assert.ok(v.warmth<=.28);});
test('bright scene reduces or disables extra fill',()=>{const v=estimateAmbientFromPixels(frame(220,218,216),24,24);assert.ok(v.shadow<=0);});
test('warmer lighting is not interpreted as colder',()=>{const w=estimateAmbientFromPixels(frame(175,135,105),24,24);const c=estimateAmbientFromPixels(frame(110,145,185),24,24);assert.ok(w.warmth>c.warmth);});
test('left/right directional proxy has correct sign',()=>{const a=frame(100,100,100);for(let y=0;y<24;y++)for(let x=0;x<12;x++){const i=(y*24+x)*4;a[i]=a[i+1]=a[i+2]=175;}const v=estimateAmbientFromPixels(a,24,24);assert.ok(v.direction>0);});
test('bad or missing pixel data fails closed',()=>{assert.equal(estimateAmbientFromPixels(null,24,24),null);assert.equal(estimateAmbientFromPixels(new Uint8Array(10),24,24),null);const t=createAmbientTracker();assert.equal(t.value.shadow,0);t.reset();assert.equal(t.value.warmth,0);});
