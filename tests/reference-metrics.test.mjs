import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFaceGeometry,compareFaceGeometry,FEATURE_KEYS} from '../reference-metrics.v0.2.1.mjs';

function fakeFace(w=800,h=1000,angle=0){
  const lm=Array.from({length:478},()=>({x:.5,y:.5}));
  const set=(i,x,y)=>{const X=x*w,Y=y*h,cx=.5*w,cy=.45*h,a=angle*Math.PI/180;
    lm[i]={x:(cx+(X-cx)*Math.cos(a)-(Y-cy)*Math.sin(a))/w,y:(cy+(X-cx)*Math.sin(a)+(Y-cy)*Math.cos(a))/h};};
  // Facially plausible test geometry anchored in normalized image coordinates.
  const p={33:[.32,.36],133:[.41,.36],159:[.37,.346],145:[.37,.373],362:[.59,.36],263:[.68,.36],386:[.63,.346],374:[.63,.373],
    70:[.34,.29],63:[.38,.29],105:[.40,.30],336:[.60,.30],296:[.62,.29],334:[.66,.29],
    1:[.5,.49],168:[.5,.39],98:[.463,.53],327:[.537,.53],61:[.445,.64],291:[.555,.64],0:[.5,.62],17:[.5,.67],13:[.5,.646],14:[.5,.655],
    234:[.3,.55],454:[.7,.55],152:[.5,.81]};
  for(const [id,pos] of Object.entries(p))set(+id,...pos);
  return lm;
}

test('normalizes geometry across resolutions',()=>{
 const a=analyzeFaceGeometry(fakeFace(800,1000),800,1000);
 const b=analyzeFaceGeometry(fakeFace(1600,2000),1600,2000);
 assert.equal(FEATURE_KEYS.length,8);
 for(const key of FEATURE_KEYS)assert.ok(Math.abs(a.features[key]-b.features[key])<1e-8,key);
 assert.ok(a.ipdPx>100);
});
test('compensates rotated eye alignment',()=>{
 const a=analyzeFaceGeometry(fakeFace(),800,1000);
 const b=analyzeFaceGeometry(fakeFace(800,1000,14),800,1000);
 for(const key of FEATURE_KEYS)assert.ok(Math.abs(a.features[key]-b.features[key])<1e-8,key);
 assert.ok(Math.abs(b.rollDeg-14)<0.01);
});
test('shows warnings but no identity or medical metrics',()=>{
 const a=analyzeFaceGeometry(fakeFace(800,1000,25),800,1000);
 assert.ok(a.warnings.some(w=>w.includes('기울어진')));
 assert.equal('identity' in a,false);
});
test('comparison stays neutral for the same geometry',()=>{
 const a=analyzeFaceGeometry(fakeFace(),800,1000);
 const diffs=compareFaceGeometry(a,a);
 assert.equal(diffs.length,8);
 for(const d of diffs)assert.equal(d.deltaPercent,0);
});
test('rejects impossible input',()=>{
 assert.throws(()=>analyzeFaceGeometry([],800,1000));
 assert.throws(()=>analyzeFaceGeometry(fakeFace(),0,1000));
});
