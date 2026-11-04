import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLook,createLookStore} from '../look-presets.v0.9.0.mjs';
import {encodeLookLink,decodeLookHash} from '../look-links.v0.9.0.mjs';
const v={skin:35,bright:44,nose:30,lipShape:25,cheek:40,chin:10,browLift:15,smile:20};
const old={name:'Old look',values:{skin:40,eyes:15},lighting:{auto:false}};
test('old presets remain compatible and studio defaults disabled',()=>{
 const o=normalizeLook(old);assert.equal(o.studio.enabled,false);assert.equal(o.liveSculpt,false);assert.equal(o.values.skin,40);
});
test('new look share link roundtrips Korean names and excludes photographic/biometric data',()=>{
 const raw={name:'봄 햇살 ✨',values:v,studio:{enabled:true,direction:-37,fill:45,warmth:89},liveSculpt:true,lighting:{auto:true},photo:'PRIVATE',landmarks:[{x:.1,y:.2}],reference:{enabled:true}};
 const url=encodeLookLink(raw,'https://example.com/beauty/index.html?lang=ko#foo');
 const out=decodeLookHash(new URL(url).hash);assert.equal(out.name,'봄 햇살 ✨');assert.equal(out.studio.direction,-37);assert.equal(out.values.nose,30);
 assert.equal(out.liveSculpt,true);assert.equal(out.reference.enabled,false);
 assert(!url.includes('PRIVATE'));assert(!JSON.stringify(out).includes('landmarks'));
});
test('malicious or malformed hash fails closed',()=>{
 assert.equal(decodeLookHash('#foobar'),null);
 assert.throws(()=>decodeLookHash('#look=<script>'));
 assert.throws(()=>decodeLookHash('#look='+'A'.repeat(7100)));
 assert.throws(()=>encodeLookLink({name:'bad',values:{}},'https://example.com'));
 assert.throws(()=>encodeLookLink({name:'ok',values:v},'file:///test'));
});
test('look store retains sculpt and studio settings within 16 cap',()=>{
 const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const store=createLookStore(storage);
 store.put({name:'warm',values:v,studio:{enabled:true,direction:20,fill:50,warmth:55}});
 assert.equal(store.list()[0].studio.enabled,true);assert.equal(store.list()[0].values.nose,30);
 for(let i=0;i<20;i++)store.put({name:'look'+i,values:v});assert.equal(store.list().length,16);
});
