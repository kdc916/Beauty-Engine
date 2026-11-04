import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFaceGeometry,compareFaceGeometry,FEATURE_KEYS} from '../reference-metrics.v0.2.1.mjs';
function face(w=800,h=1000,roll=0){
  const lm=Array.from({length:478},()=>({x:.5,y:.5}));
  const pts={33:[.32,.36],133:[.41,.36],159:[.37,.346],145:[.37,.373],362:[.59,.36],263:[.68,.36],386:[.63,.346],374:[.63,.373],70:[.34,.29],63:[.38,.29],105:[.40,.30],336:[.60,.30],296:[.62,.29],334:[.66,.29],1:[.5,.49],168:[.5,.39],98:[.463,.53],327:[.537,.53],61:[.445,.64],291:[.555,.64],0:[.5,.62],17:[.5,.67],13:[.5,.646],14:[.5,.655],234:[.3,.55],454:[.7,.55],152:[.5,.81]};
  for(const [id,pos] of Object.entries(pts)){
    const [x,y]=pos,a=roll*Math.PI/180,cx=.5*w,cy=.45*h;
    const px=x*w-cx,py=y*h-cy;
    lm[Number(id)]={x:(cx+px*Math.cos(a)-py*Math.sin(a))/w,y:(cy+px*Math.sin(a)+py*Math.cos(a))/h};
  }
  return lm;
}
test('resolution-independent facial ratios',()=>{
  const a=analyzeFaceGeometry(face(),800,1000),b=analyzeFaceGeometry(face(1600,2000),1600,2000);
  for(const key of FEATURE_KEYS)assert.ok(Math.abs(a.features[key]-b.features[key])<1e-7,key);
});
test('roll-independent facial ratios',()=>{
  const a=analyzeFaceGeometry(face(),800,1000),b=analyzeFaceGeometry(face(800,1000,14),800,1000);
  for(const key of FEATURE_KEYS)assert.ok(Math.abs(a.features[key]-b.features[key])<1e-7,key);
  assert.ok(Math.abs(b.rollDeg-14)<.02);
});
test('missing and invalid inputs rejected',()=>{
  assert.throws(()=>analyzeFaceGeometry([],800,1000));
  assert.throws(()=>analyzeFaceGeometry(face(),0,1000));
});
test('identical comparison does not report artificial changes',()=>{
  const a=analyzeFaceGeometry(face(),800,1000);
  assert.equal(compareFaceGeometry(a,a).length,8);
  for(const row of compareFaceGeometry(a,a))assert.equal(row.deltaPercent,0);
});
test('reports pose warnings, not identity or surgical predictions',()=>{
  const a=analyzeFaceGeometry(face(800,1000,25),800,1000);
  assert.ok(a.warnings.length>0);
  assert.equal('identity' in a,false);
});
