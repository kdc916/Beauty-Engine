import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLook} from '../look-presets.v0.9.0.mjs';
test('old v2 look JSON loads with opt-in 3D relighting disabled',()=>{
 const old={name:'old',values:{skin:50},lighting:{auto:true,strength:50,poseAware:true}};
 const look=normalizeLook(old);assert.equal(look.lighting.relight3D,false);
});
test('new relighting preference round trips without biometric image data',()=>{
 const input={name:'new',values:{skin:20},lighting:{auto:true,strength:70,poseAware:true,relight3D:true},faceLandmarks:[{x:0.2,y:0.2}]};
 const look=normalizeLook(input);assert.equal(look.lighting.relight3D,true);
 assert.equal(JSON.stringify(look).includes('faceLandmarks'),false);
});
