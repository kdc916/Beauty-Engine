import test from 'node:test';
import assert from 'node:assert/strict';
import {createLook,normalizeLook,createLookStore,LOOK_SCHEMA} from '../look-presets.v0.9.0.mjs';
const values={skin:39,bright:67,eyes:27,slim:14};
test('preset produces sanitized and shareable settings only',()=>{const p=createLook({name:'Soft Studio',values,lighting:{auto:true,strength:39},reference:{enabled:true,globalStrength:.4,regions:{eyes:.4}}});assert.equal(p.schema,LOOK_SCHEMA);assert.equal(p.reference.enabled,false);assert.equal(p.lighting.strength,39);assert.equal(JSON.stringify(p).includes('faceLandmarks'),false);});
test('bad settings clamp and unknown keys are dropped',()=>{const p=normalizeLook({name:'x'.repeat(100),values:{skin:300,eyes:-2,photo:'secret'},reference:{regions:{eyes:30}}});assert.equal(p.values.skin,100);assert.equal(p.values.eyes,0);assert.equal(p.reference.regions.eyes,1);assert.equal(p.name.length,40);assert.equal('photo' in p.values,false);});
test('invalid settings cannot be imported',()=>{assert.throws(()=>normalizeLook({values:{photo:42}}));assert.throws(()=>normalizeLook(null));});
test('save, reload and remove named looks',()=>{const map=new Map();const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};const store=createLookStore(storage);store.put({name:'Studio',values});assert.equal(store.list().length,1);assert.equal(store.list()[0].name,'Studio');store.remove('Studio');assert.equal(store.list().length,0);});
