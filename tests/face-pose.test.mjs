import test from 'node:test';
import assert from 'node:assert/strict';
import {poseFromMatrix,poseFromLandmarks,estimateFacePose,createFacePoseTracker,poseLightingUniform} from '../face-pose.v0.2.7.mjs';
import {createLook,normalizeLook,createLookStore} from '../look-presets.v0.2.7.mjs';
function yawMatrix(deg){
  const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return {rows:4,columns:4,data:[c,0,s,0, 0,1,0,0, -s,0,c,0, 0,0,0,1]};
}
function pitchMatrix(deg){
  const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return {rows:4,columns:4,data:[1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1]};
}
function face(){
  const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
  for(const [i,x,y] of [[1,.5,.49],[33,.39,.35],[263,.61,.35],[234,.30,.53],[454,.70,.53],[10,.5,.16],[152,.5,.84]])p[i]={x,y,z:0};
  return p;
}
test('identity matrix means frontal pose, full reliability',()=>{
  const p=poseFromMatrix(yawMatrix(0));assert.ok(p);assert.ok(Math.abs(p.yaw)<1e-7);assert.ok(Math.abs(p.pitch)<1e-7);assert.ok(p.reliability>.99);
});
test('3D matrix tracks yaw without image aspect distortion',()=>{
  const p=poseFromMatrix(yawMatrix(27));assert.ok(Math.abs(p.yaw-27)<.02);assert.ok(p.quality===undefined);
});
test('3D matrix tracks pitch consistently',()=>{
  const p=poseFromMatrix(pitchMatrix(19));assert.ok(Math.abs(p.pitch-19)<.02);
});
test('invalid matrix falls back to conservative landmark proxy',()=>{
  assert.equal(poseFromMatrix(null),null);assert.equal(poseFromMatrix({rows:3,columns:3,data:new Array(9).fill(1)}),null);
  assert.equal(poseFromMatrix({rows:4,columns:4,data:new Array(16).fill(NaN)}),null);
  const p=estimateFacePose(null,face());assert.ok(p);assert.equal(p.source,'landmark-proxy');assert.ok(p.quality<=.34);
});
test('unusable face has no residual lighting after tracking loss',()=>{
  const t=createFacePoseTracker();assert.ok(t.update(yawMatrix(0),face(),100));
  t.missing();assert.equal(t.current,null);assert.deepEqual(poseLightingUniform(t.current),[0,0,0,0]);
});
test('smoothing damps moderate turns without freezing pose',()=>{
  const t=createFacePoseTracker({alpha:.35});t.update(yawMatrix(0),face(),10);
  const step=t.update(yawMatrix(24),face(),110);assert.ok(step.yaw>0&&step.yaw<24);
  const follow=t.update(yawMatrix(24),face(),210);assert.ok(follow.yaw>step.yaw);
});
test('abrupt turn rejects frame instead of teleporting face',()=>{
  const t=createFacePoseTracker();t.update(yawMatrix(0),face(),10);
  assert.equal(t.update(yawMatrix(48),face(),80),null);assert.deepEqual(poseLightingUniform(t.current),[0,0,0,0]);
  assert.ok(t.update(yawMatrix(48),face(),160));
});
test('extreme yaw progressively loses lighting confidence',()=>{
  const a=estimateFacePose(yawMatrix(0),face()),b=estimateFacePose(yawMatrix(53),face());
  assert.ok(a.quality>b.quality&&b.quality>=0);assert.ok(poseLightingUniform(b)[3]<=a.quality);
});
test('pose light setting survives JSON sharing without face biometrics',()=>{
  const values={skin:50,bright:30,eyes:12};
  const saved=createLook({name:'Pose Studio',values,lighting:{auto:true,strength:45,poseAware:false}});
  assert.equal(saved.lighting.poseAware,false);
  const imported=normalizeLook(JSON.parse(JSON.stringify(saved)));assert.equal(imported.lighting.poseAware,false);
  const legacy=normalizeLook({name:'Legacy',values,lighting:{auto:true,strength:35}});assert.equal(legacy.lighting.poseAware,true);
  assert.ok(!('landmarks' in saved)&&!('photo' in saved));
  const store=new Map();const api=createLookStore({getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)});
  api.put(saved);assert.equal(api.list()[0].lighting.poseAware,false);
});
