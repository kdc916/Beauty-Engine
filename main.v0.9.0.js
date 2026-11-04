/* maxVFX Beauty Engine v0.9.0 — original WebGL2 shader implementation.
   MediaPipe Tasks Vision is loaded on demand; image data stays in browser. */
'use strict';
import {createWarpGrid, updateWarpGrid, FACE_OUTLINE_IDS} from './mesh-warp.v0.9.0.mjs';
import {initReferencePanel} from './reference-panel.v0.9.0.mjs';
import {buildReferenceMatch} from './reference-match.v0.9.0.mjs';
import {createLiveFaceFilter} from './live-safety.v0.9.0.mjs';
import {createLivePerformanceController,getLiveResolution} from './live-performance.v0.9.0.mjs';
import {createAmbientTracker} from './ambient-light.v0.9.0.mjs';
import {createLook,createLookStore,normalizeLook} from './look-presets.v0.9.0.mjs';
import {createFacePoseTracker,poseLightingUniform} from './face-pose.v0.9.0.mjs';
import {createOcclusionGuard,poseSafetyMultiplier} from './occlusion-guard.v0.9.0.mjs';
import {createLiveTransition,LIVE_TRANSITION} from './live-transition.v0.9.0.mjs';
import {createSemanticOcclusionController} from './semantic-occlusion-runtime.v0.9.0.mjs';
import {createLightFieldTracker} from './face-light-field.v0.9.0.mjs';
import {createPoseContinuityGate} from './pose-continuity.v0.9.0.mjs';
import {isMatteAligned} from './matte-alignment.v0.9.0.mjs';
import {SCULPT_KEYS} from './face-sculpt.v0.9.0.mjs';
import {encodeLookLink,decodeLookHash} from './look-links.v0.9.0.mjs';
const $ = id => document.getElementById(id);
const PRESETS = {
  clear:{name:'Clear Glow',subtitle:'맑고 투명하게',icon:'✧',skin:36,bright:47,warm:32,glow:28,slim:12,eyes:10,lip:22,blush:22,saturation:49,detail:72,underEye:25,highlight:52,nose:0,lipShape:0,browLift:0,cheek:0,chin:0,smile:0},
  douyin:{name:'Douyin Beauty',subtitle:'화사한 인형 피부',icon:'♡',skin:54,bright:62,warm:56,glow:40,slim:32,eyes:24,lip:57,blush:55,saturation:58,detail:66,underEye:45,highlight:62,nose:12,lipShape:12,browLift:7,cheek:6,chin:0,smile:9},
  soft:{name:'Soft Portrait',subtitle:'은은한 자연광',icon:'☼',skin:24,bright:32,warm:35,glow:17,slim:6,eyes:5,lip:15,blush:18,saturation:46,detail:80,underEye:18,highlight:48,nose:0,lipShape:0,browLift:0,cheek:0,chin:0,smile:0},
  studio:{name:'Studio Clean',subtitle:'부드러운 포트레이트',icon:'◈',skin:28,bright:38,warm:38,glow:24,slim:8,eyes:8,lip:27,blush:24,saturation:50,detail:80,underEye:26,highlight:76,nose:5,lipShape:6,browLift:5,cheek:6,chin:0,smile:3},
  cinema:{name:'Cinema Warm',subtitle:'차분한 인물 색감',icon:'✦',skin:18,bright:20,warm:62,glow:12,slim:4,eyes:5,lip:31,blush:16,saturation:55,detail:86,underEye:12,highlight:82,nose:0,lipShape:5,browLift:0,cheek:0,chin:0,smile:3},
};
const FIELDS = {
  skin:[['skin','피부 스무딩','피부결을 보존하며 자연스럽게 보정'],['bright','얼굴 화사함','피부 영역의 밝기 및 톤 보정'],['glow','소프트 글로우','은은한 광채와 확산광'],['detail','피부결 보존','스무딩 중 피부의 미세 디테일 유지'],['underEye','눈 밑 밝기','눈 아래의 칙칙함을 국소적으로 개선'],['highlight','하이라이트 보호','밝은 피부 영역의 과노출 완화']],
  face:[['slim','얼굴 라인','사진 전용 · 턱선 안전 보호'],['eyes','눈 크기','라이브에서도 제한적 확대'],
    ['nose','콧볼 정리','라이브 안전 모드에서는 약하게 적용'],['lipShape','입술 볼륨','입술 내부 중심부 조절'],
    ['browLift','눈썹 높이','눈썹 부근을 국소적으로 이동'],['smile','입꼬리','입 주변만 미세 조정'],
    ['cheek','볼 볼륨','사진 모드 전용'],['chin','턱 길이','사진 모드 전용 · 안전 범위 제한']],
  makeup:[['lip','입술 혈색','입술에 생기를 더하는 피치 핑크'],['blush','블러셔','양 볼에 은은한 홍조']],
  color:[['warm','피치 톤','화사하고 따뜻한 피부 톤'],['saturation','컬러 생기','사진 전체의 채도 조정']]
};
const livePerf=createLivePerformanceController();
const ambient=createAmbientTracker();
const lightField=createLightFieldTracker();
const poseContinuity=createPoseContinuityGate();
let poseContinuityGain=0,poseLightGain=0,meshIdentityReady=false;
const facePoseTracker=createFacePoseTracker();
const occlusionGuard=createOcclusionGuard();
const liveTransition=createLiveTransition();
let targetQuality=0,lastOcclusionRepaired=0,liveSafetyLabel='';
let currentFacePose=null,poseAwareLighting=true,relight3D=false;
let liveSculpt=false,studioLight={enabled:false,direction:0,fill:35,warmth:50};
const lookStore=createLookStore(localStorage);
let lightingAuto=true,lightingStrength=45,trackedQuality=0,lastGoodAt=-Infinity;
let semanticOcclusionEnabled=false,semanticMaskDirty=true,semanticMaskFrame=null,semanticTexture=null,semanticWidth=1,semanticHeight=1;
const STORAGE_KEY='maxvfx.beauty.v0.1.preferences';
const state={preset:'douyin',values:{...PRESETS.douyin},enabled:true,tab:'skin',mode:'idle',face:null,faceDetected:false,mirror:true,compare:false,comparePosition:.5,stream:null,source:null,tracker:null,trackerLoading:false,ready:false,fps:0};
let referencePanel=null,referenceGeometry=null,referenceConfig=null,referenceOwnLandmarks=null;
const hiddenVideo=$('video'),glCanvas=$('glCanvas'),fallbackCanvas=$('fallbackCanvas'),stage=$('stage');
const semanticOcclusion=createSemanticOcclusionController({
  onStatus:text=>{const el=$('semanticOcclusionStatus');if(el)el.textContent=text;},
  onMatte:frame=>{semanticMaskFrame=frame;semanticMaskDirty=true;invalidate();},
  onInferenceCost:duration=>{livePerf.recordDetection(duration);},
  onFailure:()=>{semanticOcclusionEnabled=false;const cb=$('semanticOcclusionToggle');if(cb)cb.checked=false;saveLocal();toast('분할 모델을 사용할 수 없어 기본 안전 모드로 전환했습니다.');}
});
let gl=null,program=null,uniforms={},texture=null,maskTexture=null,maskDirty=true,buffer=null,meshIndexBuffer=null,meshDirty=true,faceMesh=createWarpGrid(),lastTime=0,lastDetect=0,lastFrame=0,frameCount=0,lastMetric=0,toastTimer=0,messageTimer=0,raf=0,sourceW=0,sourceH=0;
let textureSource=null, textureWidth=0, textureHeight=0;
let maskTexWidth=1,maskTexHeight=1,makeupTexWidth=1,makeupTexHeight=1;
let glEventsBound=false,lastMaskTime=-Infinity,lastMaskNose=null;
const SKIN_BLANK=new Uint8Array([0,0,0,255]);
const MAKEUP_BLANK=new Uint8Array([0,0,0,0]);

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function toast(text){const e=$('toast');e.textContent=text;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3100);}
function stageMessage(text,ms=4000){const e=$('stageMessage');e.textContent=text;e.hidden=false;clearTimeout(messageTimer);if(ms)messageTimer=setTimeout(()=>e.hidden=true,ms);}
function setLabel(what){$('trackingLabel').textContent=what;}
function saveLocal(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({preset:state.preset,values:state.values,enabled:state.enabled,liveQuality:livePerf.mode,lightingAuto,lightingStrength,poseAwareLighting,relight3D,semanticOcclusionEnabled,liveSculpt,studioLight}));}catch{}}
function restore(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY));if(!v||!v.values)return;if(PRESETS[v.preset])state.preset=v.preset;state.values={...PRESETS[state.preset]};for(const key of Object.keys(PRESETS.douyin)){if(typeof v.values[key]==='number')state.values[key]=clamp(v.values[key],0,100);}state.enabled=v.enabled!==false;if(typeof v.liveQuality==='string')livePerf.setMode(v.liveQuality);lightingAuto=v.lightingAuto!==false;if(Number.isFinite(v.lightingStrength))lightingStrength=clamp(v.lightingStrength,0,100);poseAwareLighting=v.poseAwareLighting!==false;relight3D=v.relight3D===true;semanticOcclusionEnabled=v.semanticOcclusionEnabled===true;semanticOcclusion.setEnabled(semanticOcclusionEnabled);
    liveSculpt=v.liveSculpt===true;
    if(v.studioLight&&typeof v.studioLight==='object')studioLight={enabled:v.studioLight.enabled===true,direction:clamp(Number.isFinite(v.studioLight.direction)?v.studioLight.direction:0,-100,100),fill:clamp(Number.isFinite(v.studioLight.fill)?v.studioLight.fill:35,0,100),warmth:clamp(Number.isFinite(v.studioLight.warmth)?v.studioLight.warmth:50,0,100)};
  }catch{}}
function renderPresets(){const root=$('presets');root.replaceChildren();for(const [key,p] of Object.entries(PRESETS)){const b=document.createElement('button');b.type='button';b.className='preset'+(state.preset===key?' active':'');b.innerHTML=`<div class="preset-icon">${p.icon}</div><strong>${p.name}</strong><small>${p.subtitle}</small>`;b.addEventListener('click',()=>{state.preset=key;state.values={...p};meshDirty=true;renderPresets();renderSliders();saveLocal();invalidate();toast(`${p.name} 프리셋 적용`);});root.append(b);}}
function renderSliders(){const wrap=$('sliders');wrap.replaceChildren();for(const [key,label,hint] of FIELDS[state.tab]){const row=document.createElement('div');row.className='slider-row';const head=document.createElement('div');head.className='slider-head';const text=document.createElement('label');text.textContent=label;text.htmlFor='slider_'+key;const number=document.createElement('span');number.className='slider-val';number.textContent=state.values[key];head.append(text,number);const slider=document.createElement('input');slider.className='slider';slider.id='slider_'+key;slider.type='range';slider.min=0;slider.max=100;slider.step=1;slider.value=state.values[key];slider.setAttribute('aria-label',label);slider.addEventListener('input',()=>{state.values[key]=Number(slider.value);number.textContent=slider.value;if(key==='slim'||key==='eyes'||SCULPT_KEYS.includes(key))meshDirty=true;saveLocal();invalidate();});const small=document.createElement('div');small.className='slider-hint';small.textContent=hint;row.append(head,slider,small);wrap.append(row);}}
function selectTab(key){state.tab=key;for(const b of document.querySelectorAll('.tab')){const active=b.dataset.tab===key;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));}renderSliders();}
function applyLook(raw){const look=normalizeLook(raw);for(const k of SCULPT_KEYS)state.values[k]=0;for(const [k,v] of Object.entries(look.values))state.values[k]=v;studioLight={...look.studio};liveSculpt=look.liveSculpt;lightingAuto=look.lighting.auto;lightingStrength=look.lighting.strength;poseAwareLighting=look.lighting.poseAware;relight3D=look.lighting.relight3D;referencePanel?.setConfig?.(look.reference);syncLightingControls();syncStudioControls();meshDirty=true;renderSliders();renderPresets();saveLocal();invalidate();return look;}
function loadPresetFile(file){if(!file)return;if(file.size>100000){toast('설정 파일이 너무 큽니다.');return;}file.text().then(text=>{const o=JSON.parse(text);if(o.schema==='maxvfx.beauty.preset.v1'&&o.values){applyLook({name:'가져온 설정',values:o.values});}else applyLook(o);toast('커스텀 룩을 불러왔습니다.');}).catch(e=>toast(e.message));}
function currentLook(name){return createLook({name,values:state.values,lighting:{auto:lightingAuto,strength:lightingStrength,poseAware:poseAwareLighting,relight3D},reference:referencePanel?.getConfig?.(),studio:studioLight,liveSculpt});}
function renderSavedLooks(){const sel=$('savedLookSelect');if(!sel)return;const previous=sel.value;sel.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='저장된 룩 선택';sel.append(empty);for(const look of lookStore.list()){const o=document.createElement('option');o.value=look.name;o.textContent=look.name;sel.append(o);}sel.value=lookStore.list().some(x=>x.name===previous)?previous:'';}
function saveNamedLook(){const name=$('lookName').value.trim().slice(0,40);if(!name){toast('프리셋 이름을 입력하세요.');return;}try{lookStore.put(currentLook(name));renderSavedLooks();$('savedLookSelect').value=name;toast('로컬 프리셋 저장 완료');}catch(e){toast('저장 실패: '+e.message);}}
function loadNamedLook(){const name=$('savedLookSelect').value;const look=lookStore.list().find(x=>x.name===name);if(!look){toast('먼저 저장된 룩을 선택하세요.');return;}applyLook(look);toast('커스텀 룩 적용 완료');}
function shareNamedLook(){const selected=lookStore.list().find(x=>x.name===$('savedLookSelect').value);const look=selected||currentLook($('lookName').value.trim()||'My Beauty Look');const file=new File([JSON.stringify(look,null,2)],'maxVFX_'+look.name.replace(/[^\w가-힣-]/g,'_')+'.json',{type:'application/json'});if(navigator.canShare?.({files:[file]})){navigator.share({files:[file],title:look.name,text:'maxVFX Beauty Engine 룩 설정 (얼굴 사진 제외)'}).catch(e=>{if(e.name!=='AbortError')download(file,file.name);});}else download(file,file.name);}
function updateLiveDiagnostics({fps,w,h,semanticFresh}){
  const el=$('liveDiagnostics');if(!el||!el.open)return;
  const safe=state.mode==='camera'?(state.faceDetected?'추적 안정 / 신뢰 '+Math.round(trackedQuality*100)+'%':'추적 재획득 중'):'정지 이미지';
  const angle=currentFacePose?Math.round(currentFacePose.yaw)+'° / '+Math.round(currentFacePose.pitch)+'°':'-';
  const mesh=faceMesh.usedIdentity?'원본 UV 복구':(faceMesh.stretchFailures?'변형 제한':'안전 범위');
  const lines=[fps==null?'사진 모드':'실시간 '+fps+' fps',w+'×'+h,safe,'Yaw/Pitch '+angle,
    '메시: '+mesh,'가림 보호: '+(semanticFresh?'감지됨':semanticOcclusionEnabled?'대기/무효':'꺼짐'),
    '룩: '+(liveSculpt?'라이브 미형 BETA':'사진 전용 미형'), '환경광: '+(lightingAuto?'추정 켬':'꺼짐')];
  el.querySelector('pre').textContent=lines.join(' · ');
}
function syncStudioControls(){
  const on=$('studioLightToggle'),dir=$('studioDirection'),fill=$('studioFill'),warmth=$('studioWarmth'),sculpt=$('liveSculptToggle');
  if(on)on.checked=studioLight.enabled;if(dir)dir.value=studioLight.direction;if(fill)fill.value=studioLight.fill;if(warmth)warmth.value=studioLight.warmth;
  if(sculpt)sculpt.checked=liveSculpt;
  for(const [id,value] of [['studioDirectionValue',studioLight.direction],['studioFillValue',studioLight.fill],['studioWarmthValue',studioLight.warmth]]){const el=$(id);if(el)el.textContent=value+'%';}
}
function syncLightingControls(){const auto=$('lightingAuto'),strength=$('lightingStrength'),num=$('lightingStrengthValue');if(auto)auto.checked=lightingAuto;if(strength)strength.value=lightingStrength;if(num)num.textContent=lightingStrength+'%';const pose=$('poseAwareLight');if(pose)pose.checked=poseAwareLighting;const r=$('relight3D');if(r)r.checked=relight3D;}

function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportPreset(){const look=currentLook($('lookName').value.trim()||'My Beauty Look');download(new Blob([JSON.stringify(look,null,2)],{type:'application/json'}),'maxVFX_Beauty_Look.json');}
function correctedSnapshot(){
  if(!state.ready)return null;
  const source=gl?glCanvas:fallbackCanvas;
  const output=document.createElement('canvas');output.width=source.width;output.height=source.height;
  const ctx=output.getContext('2d');if(!ctx)return null;
  if(state.compare){
    if(gl&&uniforms.uCompare){
      // Render a single corrected frame. Copy it before restoring the live comparison.
      gl.uniform1f(uniforms.uCompare,0);
      gl.drawElements(gl.TRIANGLES,faceMesh.indices.length,gl.UNSIGNED_SHORT,0);
      ctx.drawImage(source,0,0);
      gl.uniform1f(uniforms.uCompare,1);
      gl.drawElements(gl.TRIANGLES,faceMesh.indices.length,gl.UNSIGNED_SHORT,0);
    }else{
      ctx.save();if(state.mirror){ctx.translate(output.width,0);ctx.scale(-1,1);}
      const v=state.values;ctx.filter=state.enabled?`brightness(${1+v.bright/100*.14}) saturate(${.85+v.saturation/100*.4})`:'none';
      ctx.drawImage(state.source,0,0,output.width,output.height);ctx.restore();
    }
  }else ctx.drawImage(source,0,0);
  return output;
}
function exportBeforeAfter(){
  if(!state.ready||!state.source){toast('먼저 카메라 또는 사진을 실행하세요.');return;}
  const corrected=correctedSnapshot();if(!corrected){toast('보정 이미지를 가져올 수 없습니다.');return;}
  const unitW=Math.min(corrected.width,1000),unitH=Math.max(1,Math.round(corrected.height*unitW/corrected.width));
  const combined=document.createElement('canvas');combined.width=unitW*2;combined.height=unitH;
  const ctx=combined.getContext('2d');if(!ctx){toast('비교 이미지 생성 실패');return;}
  ctx.save();if(state.mirror){ctx.translate(unitW,0);ctx.scale(-1,1);}
  ctx.drawImage(state.source,0,0,unitW,unitH);ctx.restore();
  ctx.drawImage(corrected,unitW,0,unitW,unitH);
  for(const [x,label] of [[8,'BEFORE'],[unitW+8,'AFTER']]){
    ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(x,8,92,28);
    ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.fillText(label,x+12,27);
  }
  combined.toBlob(blob=>{if(blob)download(blob,'maxVFX_Before_After.png');else toast('비교 PNG를 저장하지 못했습니다.');},'image/png');
}
function capture(){if(!state.ready){toast('먼저 카메라 또는 사진을 실행하세요.');return;}const c=correctedSnapshot();if(!c){toast('사진 처리 실패');return;}c.toBlob(blob=>{if(blob)download(blob,`maxVFX_Beauty_${new Date().toISOString().replace(/[.:]/g,'-')}.png`);else toast('이미지 저장에 실패했습니다.');},'image/png');}
function stopStream(){livePerf.resetTiming();ambient.reset();lightField.reset();trackedQuality=0;lastGoodAt=-Infinity;if(state.stream){for(const t of state.stream.getTracks())t.stop();state.stream=null;}hiddenVideo.pause();hiddenVideo.srcObject=null;}
async function startCamera(facing='user'){
  referencePanel?.clearSource();beginSourceChange();stopStream();state.source=null;state.ready=false;
  const generation=sourceGeneration;
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('카메라를 사용할 수 없습니다. HTTPS 환경을 확인하세요.');
    const max=livePerf.profile.maxSide;
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
      facingMode:{ideal:facing},width:{ideal:Math.max(640,max)},height:{ideal:720},frameRate:{ideal:30,max:30}
    }});
    // Camera permission dialogs can outlive a subsequent photo/sample selection.
    if(generation!==sourceGeneration){stream.getTracks().forEach(track=>track.stop());return;}
    state.stream=stream;hiddenVideo.srcObject=stream;
    await hiddenVideo.play();
    if(generation!==sourceGeneration){stopStream();return;}
    state.source=hiddenVideo;state.mode='camera';state.mirror=facing==='user';
    setActiveSource('camera');activate();startTracking();
  }catch(e){
    if(generation!==sourceGeneration)return;
    console.error(e);stageMessage(`카메라를 열지 못했습니다: ${e.name==='NotAllowedError'?'카메라 권한을 확인하세요.':e.message}`,0);
    toast('사진 불러오기로도 테스트할 수 있습니다.');
  }
}
async function loadImage(file,fromReference=false){if(!file)return;if(!file.type.startsWith('image/')){toast('이미지 파일을 선택하세요.');return;}beginSourceChange();stopStream();const url=URL.createObjectURL(file);const currentGeneration=sourceGeneration;const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);if(currentGeneration!==sourceGeneration)return;state.source=img;state.mode='photo';state.mirror=false;resetMask();setActiveSource('photo');if(!fromReference)referencePanel?.clearSource();activate();startTracking();};img.onerror=()=>{URL.revokeObjectURL(url);toast('이미지를 읽지 못했습니다. 지원되는 JPG/PNG/WebP를 사용하세요.');};img.src=url;}
function setActiveSource(which){
 for(const [id,value] of [['sampleControlBtn','sample'],['cameraBtn','camera'],['uploadBtn','photo']]){
  const btn=$(id);if(!btn)continue;const on=which===value;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));
 }
}
function loadBundledSample(){
 referencePanel?.clearSource();beginSourceChange();stopStream();
 const currentGeneration=sourceGeneration;const img=new Image();
 img.onload=()=>{
  if(currentGeneration!==sourceGeneration)return;state.source=img;state.mode='sample';state.mirror=false;resetMask();
  setActiveSource('sample');activate();showCompare(true);startTracking();
 };
 img.onerror=()=>{
  setActiveSource('photo');stageMessage('샘플 사진 로딩 실패: 사진 업로드 또는 카메라로 테스트하세요.',0);
 };
 img.src=new URL('./assets/sample-portrait.webp',import.meta.url).href;
}
function activate(){if(!state.source)return;livePerf.resetTiming();lastMaskTime=-Infinity;lastMaskNose=null;textureSource=null;state.ready=true;$('intro').hidden=true;$('stageBottom').hidden=false;$('stageMessage').hidden=true;meshDirty=true;$('liveLabel').textContent=state.mode==='camera'?'LIVE CAMERA':state.mode==='sample'?'SAMPLE PHOTO':'PHOTO PREVIEW';$('liveDot').classList.toggle('on',state.mode==='camera');const liveBadge=$('liveSafeBadge');if(liveBadge)liveBadge.hidden=state.mode!=='camera';setLabel('● 얼굴 추적 준비 중');if(!gl&&!initGL()){$('fallbackCanvas').classList.add('active');toast('WebGL2 미지원: 기본 미리보기 모드');}else{$('glCanvas').classList.add('active');$('fallbackCanvas').classList.remove('active');}cancelAnimationFrame(raf);raf=0;frameCount=0;lastMetric=performance.now();raf=requestAnimationFrame(draw);}
function resolution(){
  const src=state.source;if(!src)return [720,900];
  const w=src.videoWidth||src.naturalWidth||720,h=src.videoHeight||src.naturalHeight||900;
  if(state.mode==='camera')return getLiveResolution(w,h,livePerf.profile);
  const ratio=Math.min(1,1600/Math.max(w,h));
  return [Math.max(2,Math.round(w*ratio)),Math.max(2,Math.round(h*ratio))];
}

const VERT=`#version 300 es
in vec2 aPos;in vec2 aSourceUv;out vec2 vUv;out vec2 vMeshUv;
void main(){vUv=aPos*0.5+0.5;vMeshUv=aSourceUv;gl_Position=vec4(aPos,0.0,1.0);}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUv;in vec2 vMeshUv;out vec4 outColor;
uniform sampler2D uTex;uniform sampler2D uSkinMask;uniform sampler2D uMakeupMask;uniform sampler2D uSemanticMask;uniform float uSemanticEnabled;uniform float uDebugMask;uniform vec2 uSize;uniform vec2 uPoints[13];uniform float uDetected;uniform float uMirror;uniform float uEnabled;uniform float uCompare;uniform float uCompPos;
uniform vec4 uAmbient;uniform vec4 uFacePose;uniform vec4 uLightField;uniform vec4 uStudioLight;uniform float uRelight3D;uniform float uPoseAwareLight;uniform float uFaceQuality;uniform float uSkin;uniform float uBright;uniform float uGlow;uniform float uDetail;uniform float uUnderEye;uniform float uHighlight;uniform float uWarm;uniform float uSaturation;uniform float uSlim;uniform float uEyes;uniform float uLip;uniform float uBlush;
vec3 readTex(vec2 p){return texture(uTex,vec2(clamp(p.x,0.001,0.999),clamp(p.y,0.001,0.999))).rgb;}
float gauss(float x,float sig){return exp(-0.5*x*x/max(0.0001,sig*sig));}
float ellipseMask(vec2 p,vec2 center,vec2 radii){vec2 d=(p-center)/max(radii,vec2(.001));return 1.0-smoothstep(.72,1.13,length(d));}
// The deformed source UV is generated on the CPU and interpolated over a bounded triangular mesh.
void main(){
  vec2 p=vec2(uMirror>0.5?1.-vUv.x:vUv.x,1.-vUv.y);
  vec3 original=readTex(p);
  if(uEnabled<0.5 || (uCompare>0.5 && vUv.x<uCompPos)){outColor=vec4(original,1.);return;}
  // vMeshUv is the normalized inverse face-mesh mapping.
  vec2 src=vMeshUv;
  vec3 color=readTex(src);
  float skinMask=0.;float blushMask=0.;float lipMask=0.;
  if(uDetected>0.5){
    vec2 mid=(uPoints[4]+uPoints[5])*.5;
    vec2 r=vec2(max(.07,length(uPoints[5]-uPoints[4])*.64),max(.08,length(uPoints[3]-uPoints[10])*.61));
    vec2 ctr=vec2(mid.x,(uPoints[10].y+uPoints[3].y)*.50);
    skinMask=clamp(texture(uSkinMask,src).r,0.,1.);
    float er=max(.025,length(uPoints[1]-uPoints[0])*.20);
    // Eyes, eyebrows and lips are already excluded from the rasterized face mask.

    // Makeup is rasterized from the tracked lip contour (R) and feathered cheeks (G).
    // Both masks use source UV after geometry warp, keeping color aligned to facial features.
    vec4 makeupSample=texture(uMakeupMask,src);
    lipMask=clamp(makeupSample.r*makeupSample.a,0.,1.);
    blushMask=clamp(makeupSample.g*makeupSample.a,0.,1.);
    skinMask=clamp(skinMask,0.,1.)*uFaceQuality;lipMask*=uFaceQuality;blushMask*=uFaceQuality;
  }
  // Two-scale, mask-gated bilateral smoothing with fine detail reconstruction.
  // Small radius captures skin microtexture; larger radius evens out local tone.
  // Only skin neighbors contribute, preventing spill across lips/eyebrows/hair.
  if(uSkin>0.001 && skinMask>0.001){
    vec3 inputColor=color;
    vec3 fineAccum=inputColor*2.0, toneAccum=inputColor*2.0;
    float fineWeight=2.0, toneWeight=2.0;
    for(int i=0;i<8;i++){
      float a=6.2831853*float(i)/8.0;
      vec2 direction=vec2(cos(a),sin(a));
      vec2 fineUV=src+direction*1.5/uSize;
      vec2 toneUV=src+direction*4.1/uSize;
      vec3 fineColor=readTex(fineUV), toneColor=readTex(toneUV);
      float fineGate=texture(uSkinMask,fineUV).r;
      float toneGate=texture(uSkinMask,toneUV).r;
      float wf=fineGate*exp(-dot(fineColor-inputColor,fineColor-inputColor)*56.0);
      float wt=toneGate*exp(-dot(toneColor-inputColor,toneColor-inputColor)*31.0);
      fineAccum+=fineColor*wf;fineWeight+=wf;
      toneAccum+=toneColor*wt;toneWeight+=wt;
    }
    vec3 fineBase=fineAccum/fineWeight;
    vec3 toneBase=toneAccum/toneWeight;
    float smoothing=clamp(uSkin*skinMask*.78,0.0,.78);
    vec3 highDetail=inputColor-fineBase;
    color=mix(inputColor,toneBase,smoothing);
    color+=highDetail*(smoothing*uDetail*.47);
  }
  // 2D scene-adaptive lighting, masked to facial skin only.
  // This is NOT a physically calibrated light field; cap adjustments to preserve identity/texture.
  float fillDirection=clamp((src.x-.5)*2.,-1.,1.);
  float sideFill=(1.-abs(fillDirection))*.5+(-fillDirection*uAmbient.z*.6);
  float sceneFill=uAmbient.x*clamp(sideFill+.5,0.,1.)*uAmbient.w;
  float sceneWarm=uAmbient.y*uAmbient.w;
  float highkey=dot(color,vec3(.2126,.7152,.0722));
  color+=skinMask*vec3(sceneFill+.015*sceneWarm,sceneFill,sceneFill-.014*sceneWarm)*(1.-smoothstep(.58,.96,highkey));
  // Pose-guided, low-amplitude diffuse light proxy (not full 3D light estimation).
  // Use the optional canonical-face transform only as an orientation hint.
  // The face mask protects hair, eyes, teeth, neck and background.
  if(uDetected>0.5 && uPoseAwareLight>0.001 && uFacePose.w>0.001){
    float side=max(.08,length(uPoints[5]-uPoints[4]));
    float tall=max(.10,length(uPoints[3]-uPoints[10]));
    vec2 ctr=vec2((uPoints[4].x+uPoints[5].x)*.5,(uPoints[3].y+uPoints[10].y)*.5);
    vec2 faceLocal=clamp((src-ctr)/vec2(side*.60,tall*.60),vec2(-1.),vec2(1.));
    vec3 faceNormal=normalize(vec3(faceLocal.x*.32+uFacePose.x*.38,faceLocal.y*.22-uFacePose.y*.30,1.));
    vec3 lightDir=normalize(vec3(-uAmbient.z*1.6,.20,.96));
    float lightDelta=clamp(dot(faceNormal,lightDir)-.95,-.30,.07);
    float faceExposure=(1.-smoothstep(.60,.96,highkey))*skinMask*uFacePose.w*uPoseAwareLight*uAmbient.w;
    color+=vec3(clamp(lightDelta*.19,-.052,.013))*faceExposure;
  }
  // 3D-oriented *proxy* diffuse light: a soft ellipsoidal face surface,
  // aligned by MediaPipe pose. This is not true scene light/depth recovery.
  // All deltas are bounded and applied ONLY to face skin, not hair or background.
  if(uDetected>0.5 && uRelight3D>0.5 && uLightField.w>0.001 && skinMask>0.001){
    float faceW=max(.10,length(uPoints[5]-uPoints[4]));
    float faceH=max(.14,length(uPoints[10]-uPoints[3]));
    vec2 fc=vec2((uPoints[4].x+uPoints[5].x)*.5,(uPoints[10].y+uPoints[3].y)*.5);
    vec2 q=clamp((src-fc)/vec2(faceW*.56,faceH*.53),vec2(-1.),vec2(1.));
    float dome=sqrt(max(.16,1.-dot(q,q)*.33));
    vec3 normal=normalize(vec3(q.x*.46+uFacePose.x*.22,-q.y*.31-uFacePose.y*.18,dome));
    vec3 light=normalize(vec3(uLightField.x*.80,uLightField.y,1.));
    float diffuse=clamp(dot(normal,light),0.,1.);
    float strength=uLightField.z*uLightField.w*skinMask;
    float highlightGate=1.-smoothstep(.62,.94,dot(color,vec3(.2126,.7152,.0722)));
    float signedFill=clamp((diffuse-.88)*.17,-.042,.020)*strength*highlightGate;
    color+=vec3(signedFill,signedFill*.96,signedFill*.92);
  }
  // User-controlled studio fill. Gentle faux key light with skin-only masking.
  // This is a creative portrait light, not an estimate of physical radiance.
  if(uDetected>0.5 && uStudioLight.w>0.5 && skinMask>0.001){
    float faceW=max(.08,length(uPoints[5]-uPoints[4]));
    float faceH=max(.10,length(uPoints[10]-uPoints[3]));
    vec2 fc=vec2((uPoints[4].x+uPoints[5].x)*.5,(uPoints[10].y+uPoints[3].y)*.5);
    vec2 localUV=clamp((src-fc)/vec2(faceW*.60,faceH*.60),vec2(-1.),vec2(1.));
    vec3 norm=normalize(vec3(localUV.x*.52,-localUV.y*.32,.94));
    vec3 key=normalize(vec3(uStudioLight.x*.85,.20,1.));
    float diffuse=clamp(dot(norm,key),0.,1.);
    float delta=clamp((diffuse-.78)*uStudioLight.y*.115,-.032,.032);
    float skinLuma=dot(color,vec3(.2126,.7152,.0722));
    float highlightSafe=1.-smoothstep(.69,.96,skinLuma);
    color+=skinMask*highlightSafe*vec3(delta*(1.+uStudioLight.z*.20),delta,delta*(1.-uStudioLight.z*.16));
  }
  // Local facial exposure with highlight protection.
  float lum=dot(color,vec3(.2126,.7152,.0722));
  float protect=1.-smoothstep(.67,1.,lum);
  color+=vec3(.085,.068,.076)*uBright*skinMask*protect;
  // Landmark-anchored under-eye fill. Lower eyelid positions are new points 11/12.
  // Keep eye pixels unchanged using the existing skin feature-exclusion mask.
  if(uDetected>0.5 && uUnderEye>0.001){
    float faceWidth=max(.08,length(uPoints[5]-uPoints[4]));
    float faceHeight=max(.08,length(uPoints[3]-uPoints[10]));
    vec2 radius=vec2(faceWidth*.18,faceHeight*.065);
    vec2 drop=vec2(0.,faceHeight*.060);
    float underMask=max(ellipseMask(src,uPoints[11]+drop,radius),
                        ellipseMask(src,uPoints[12]+drop,radius));
    color+=vec3(.105,.095,.100)*uUnderEye*underMask*skinMask*protect;
  }
  // Selective peach warmth, blush and lip color.
  color+=vec3(.065,.011,-.013)*uWarm*skinMask*(1.-smoothstep(.78,1.,lum));
  color=mix(color,vec3(color.r*1.045+.02,color.g*.944,color.b*.978),clamp(blushMask*uBlush*.45,0.,.55));
  color=mix(color,vec3(color.r*1.10+.08,color.g*.72+.025,color.b*.84+.035),clamp(lipMask*uLip*.52,0.,.65));
  // Restrained high-key filmic contrast and soft local glow.
  vec3 soft=vec3(1.)-pow(max(vec3(0.),vec3(1.)-color),vec3(1.0+uGlow*.23));
  color=mix(color,soft,skinMask*uGlow*.35);
  float gray=dot(color,vec3(.2126,.7152,.0722));
  color=mix(vec3(gray),color,clamp(.65+uSaturation*.7,.45,1.40));
  // Gentle shoulder applied on skin highlights only, avoiding white clipping.
  float peak=max(max(color.r,color.g),color.b);
  float shoulder=smoothstep(.67,.98,peak)*uHighlight*skinMask;
  color-=max(color-vec3(.68),vec3(0.))*(.42*shoulder);
  // Optional localized QA overlay; only visible on the corrected side.
  if(uDebugMask>0.5 && uDetected>0.5){
    color=mix(color,vec3(.12,.94,.46),skinMask*.42);
    color=mix(color,vec3(.96,.18,.51),lipMask*.65);
    color=mix(color,vec3(1.,.69,.18),blushMask*.55);
  }
  // Multiclass matte: hair / hand-like body skin / clothes / accessories are protected.
  // Sample at the *unwarped* pixel to retain visible occluding objects.
  if(uSemanticEnabled>0.5){float protectMask=clamp(texture(uSemanticMask,p).r,0.,1.);color=mix(color,original,protectMask);}
  outColor=vec4(clamp(color,0.,1.),1.);
}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(e);}return s;}
function uploadSourceTexture(src){
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  const sw=src.videoWidth||src.naturalWidth||0,sh=src.videoHeight||src.naturalHeight||0;
  if(sw<2||sh<2)throw Error('비디오/사진 크기가 올바르지 않습니다.');
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
  if(textureSource!==src||textureWidth!==sw||textureHeight!==sh){
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
    textureSource=src;textureWidth=sw;textureHeight=sh;
  }else if(state.mode==='camera'){
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,src);
  }
}
function uploadSemanticMask(){
  if(!gl||!semanticTexture||!semanticMaskDirty)return;
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,semanticTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
  const frame=semanticMaskFrame;
  if(!frame){
    if(semanticWidth!==1||semanticHeight!==1){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));semanticWidth=1;semanticHeight=1;}
    else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
  }else if(frame.width!==semanticWidth||frame.height!==semanticHeight){
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,frame.width,frame.height,0,gl.RGBA,gl.UNSIGNED_BYTE,frame.rgba);
    semanticWidth=frame.width;semanticHeight=frame.height;
  }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,frame.width,frame.height,gl.RGBA,gl.UNSIGNED_BYTE,frame.rgba);
  gl.activeTexture(gl.TEXTURE0);semanticMaskDirty=false;
}
function syncSemanticOcclusionUI(){
  const toggle=$('semanticOcclusionToggle');if(toggle)toggle.checked=semanticOcclusionEnabled;
  const status=$('semanticOcclusionStatus');if(status)status.textContent=semanticOcclusionEnabled?'모델 준비 중 · 첫 실행 시 다운로드':'꺼짐 · 기존 라이브 안전 모드';
}
function initGL(){try{gl=glCanvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl)return false;const v=shader(gl.VERTEX_SHADER,VERT),f=shader(gl.FRAGMENT_SHADER,FRAG);program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,faceMesh.vertices.byteLength,gl.DYNAMIC_DRAW);
    const loc=gl.getAttribLocation(program,'aPos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,16,0);
    const srcLoc=gl.getAttribLocation(program,'aSourceUv');gl.enableVertexAttribArray(srcLoc);gl.vertexAttribPointer(srcLoc,2,gl.FLOAT,false,16,8);
    meshIndexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,meshIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,faceMesh.indices,gl.STATIC_DRAW);
    // Fresh GPU buffer starts empty; never reuse a previous context's identity cache.
    meshDirty=true;meshIdentityReady=false;texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.uniform1i(gl.getUniformLocation(program,'uTex'),0);
    maskTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,maskTexture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.uniform1i(gl.getUniformLocation(program,'uSkinMask'),1);
    makeupTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,makeupTexture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    gl.uniform1i(gl.getUniformLocation(program,'uMakeupMask'),2);
    semanticTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,semanticTexture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.uniform1i(gl.getUniformLocation(program,'uSemanticMask'),3);semanticWidth=1;semanticHeight=1;semanticMaskDirty=true;
    gl.activeTexture(gl.TEXTURE0);maskDirty=true;maskTexWidth=1;maskTexHeight=1;makeupTexWidth=1;makeupTexHeight=1;textureSource=null;textureWidth=0;textureHeight=0;for(const n of ['uSemanticEnabled','uAmbient','uFacePose','uLightField','uRelight3D','uPoseAwareLight','uFaceQuality','uStudioLight','uSize','uDebugMask','uPoints[0]','uDetected','uMirror','uEnabled','uCompare','uCompPos','uSkin','uBright','uGlow','uDetail','uUnderEye','uHighlight','uWarm','uSaturation','uSlim','uEyes','uLip','uBlush'])uniforms[n]=gl.getUniformLocation(program,n);if(!glEventsBound){
      glEventsBound=true;
      glCanvas.addEventListener('webglcontextlost',e=>{
        e.preventDefault();gl=null;program=null;texture=null;textureSource=null;
        maskTexture=null;makeupTexture=null;semanticTexture=null;semanticWidth=1;semanticHeight=1;semanticMaskDirty=true;buffer=null;meshIndexBuffer=null;
        meshDirty=true;meshIdentityReady=false;maskDirty=true;skinMaskReady=false;
        glCanvas.classList.remove('active');fallbackCanvas.classList.add('active');
        toast('GPU 연결이 끊겨 임시 미리보기로 전환했습니다.');
      });
      glCanvas.addEventListener('webglcontextrestored',()=>{
        gl=null;textureSource=null;maskDirty=true;meshDirty=true;meshIdentityReady=false;semanticMaskDirty=true;
        if(initGL()){
          glCanvas.classList.add('active');fallbackCanvas.classList.remove('active');
          if(trackedLandmarks&&state.mode!=='camera')rasterizeSkinMask(trackedLandmarks);
          toast('GPU 연결이 복구되었습니다.');invalidate();
        }else{
          glCanvas.classList.remove('active');fallbackCanvas.classList.add('active');
        }
      });
    }
    return true;}catch(e){console.error('WebGL initialization:',e);gl=null;stageMessage('WebGL2 셰이더 실행 실패: 기본 영상 모드로 표시합니다.');return false;}}
const LANDMARK_IDS=[33,263,1,152,234,454,61,291,13,14,10,145,374];
const FACE_OVAL=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const LEFT_EYE=[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];
const RIGHT_EYE=[362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398];
const LEFT_BROW=[70,63,105,66,107,55,65,52,53,46];
const RIGHT_BROW=[336,296,334,293,300,285,295,282,283,276];
const OUTER_LIPS=[61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];
const INNER_LIPS=[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];
const makeupMaskCanvas=document.createElement('canvas');
const makeupMaskCtx=makeupMaskCanvas.getContext('2d');
let makeupTexture=null;
let trackedLandmarks=null;
let lastFaceTime=0;
const liveFaceFilter=createLiveFaceFilter();
let liveGateReason='warming-up';
const skinMaskCanvas=document.createElement('canvas');
const skinMaskCtx=skinMaskCanvas.getContext('2d',{willReadFrequently:false});
let skinMaskReady=false;
let sourceGeneration=0;
const normalizedPoints=new Float32Array(26);
function invalidate(){if(!state.ready||state.mode==='camera')return;if(!raf)raf=requestAnimationFrame(draw);}
function resetMask(){poseContinuity.reset();poseContinuityGain=0;poseLightGain=0;meshIdentityReady=false;occlusionGuard.reset();liveTransition.reset();targetQuality=0;lastOcclusionRepaired=0;ambient.reset();lightField.reset();facePoseTracker.reset();currentFacePose=null;updatePoseStatus();trackedQuality=0;lastGoodAt=-Infinity;lastMaskTime=-Infinity;lastMaskNose=null;liveFaceFilter.reset();liveGateReason='warming-up';skinMaskReady=false;maskDirty=true;meshDirty=true;state.face=null;trackedLandmarks=null;lastFaceTime=0;state.faceDetected=false;invalidate();}
function beginSourceChange(){sourceGeneration++;semanticOcclusion.resetSource();semanticMaskFrame=null;semanticMaskDirty=true;resetMask();}
function updatePoseStatus(){const el=$('poseStatus');if(!el)return;const p=currentFacePose;if(!p){el.textContent='얼굴 방향: 추적 대기 · 조명 보수 모드';return;}const quality=p.quality<.1?'낮음':p.quality<.42?'보통':'양호';const liveStatus=state.mode==='camera'?` · 변형 안전도 ${Math.round(poseContinuityGain*100)}%`:'';el.textContent=`얼굴 방향: 좌우 ${Math.round(p.yaw)}° · 상하 ${Math.round(p.pitch)}° · 안정성 ${quality}${liveStatus}`;}
function releaseLiveGeometry(reason='face-missing'){
  const now=performance.now();
  targetQuality=0;
  // During brief interruption only the last verified geometry is held. Its strength
  // decays every rendered frame; there is no extrapolation of hidden anatomy.
  if(state.mode==='camera'&&trackedLandmarks&&now-lastGoodAt<=LIVE_TRANSITION.maxStaleMs){
    liveGateReason=reason;
    setLabel('◌ 부분 가림·회전 · 보정 완만 해제 중');
    return;
  }
  liveTransition.reset();poseContinuity.reset();poseContinuityGain=0;poseLightGain=0;trackedQuality=0;occlusionGuard.reset();
  facePoseTracker.missing();currentFacePose=null;updatePoseStatus();
  lastMaskTime=-Infinity;lastMaskNose=null;liveGateReason=reason;
  skinMaskReady=false;maskDirty=true;meshDirty=true;state.face=null;trackedLandmarks=null;state.faceDetected=false;
  if(state.mode==='camera')setLabel('◌ LIVE SAFE · 얼굴 재인식 대기');
}
function maskHole(ctx,pts,w,h,indices,sx,sy){
  let minX=1,maxX=0,minY=1,maxY=0;
  for(const i of indices){const p=pts[i];if(!p)return;minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
  const cx=(minX+maxX)*.5*w,cy=(minY+maxY)*.5*h;
  const rx=Math.max(2,(maxX-minX)*.5*w*sx),ry=Math.max(2,(maxY-minY)*.5*h*sy);
  ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function rasterizeSkinMask(points){
  if(!points||points.length<=466)return false;
  const [iw,ih]=resolution(),scale=256/Math.max(iw,ih);
  const w=Math.max(2,Math.round(iw*scale)),h=Math.max(2,Math.round(ih*scale));
  if(skinMaskCanvas.width!==w||skinMaskCanvas.height!==h){skinMaskCanvas.width=w;skinMaskCanvas.height=h;}
  const ctx=skinMaskCtx;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
  // Blur softens only the skin boundary; no global full-image skin ellipse is used.
  ctx.save();ctx.filter='blur(1.6px)';ctx.fillStyle='#fff';ctx.beginPath();
  FACE_OVAL.forEach((i,n)=>{const p=points[i];if(n===0)ctx.moveTo(p.x*w,p.y*h);else ctx.lineTo(p.x*w,p.y*h);});
  ctx.closePath();ctx.fill();ctx.restore();
  // Protect all four facial features with a slightly feathered exclusion.
  ctx.save();ctx.filter='blur(1.2px)';ctx.fillStyle='#000';
  maskHole(ctx,points,w,h,LEFT_EYE,1.30,1.62);
  maskHole(ctx,points,w,h,RIGHT_EYE,1.30,1.62);
  maskHole(ctx,points,w,h,LEFT_BROW,1.15,1.48);
  maskHole(ctx,points,w,h,RIGHT_BROW,1.15,1.48);
  maskHole(ctx,points,w,h,OUTER_LIPS,1.12,1.30);
  ctx.restore();
  rasterizeMakeupMask(points,w,h);
  skinMaskReady=true;maskDirty=true;meshDirty=true;invalidate();
  return true;
}
// R channel = lip polygon, G channel = soft cheeks; inner mouth is excluded.
// A small mask texture is sufficient; GPU filtering smooths its boundaries.
function maskPath(ctx,points,indices,w,h){
  ctx.beginPath();indices.forEach((i,n)=>{const p=points[i];if(n===0)ctx.moveTo(p.x*w,p.y*h);else ctx.lineTo(p.x*w,p.y*h);});ctx.closePath();
}
function rasterizeMakeupMask(points,w,h){
  const ctx=makeupMaskCtx;
  if(makeupMaskCanvas.width!==w||makeupMaskCanvas.height!==h){makeupMaskCanvas.width=w;makeupMaskCanvas.height=h;}
  ctx.clearRect(0,0,w,h);
  const cheekRadius=Math.max(5,Math.abs(points[454].x-points[234].x)*w*.18);
  const eyeMouthPairs=[[33,61,-1],[263,291,1]];
  for(const [eye,mouth,side] of eyeMouthPairs){
    const ex=points[eye].x*w,ey=points[eye].y*h;
    const mx=points[mouth].x*w,my=points[mouth].y*h;
    const cx=ex*.46+mx*.54+side*cheekRadius*.20;
    const cy=ey*.46+my*.54;
    const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,cheekRadius);
    gradient.addColorStop(0,'rgba(0,255,0,0.65)');
    gradient.addColorStop(.52,'rgba(0,255,0,0.32)');
    gradient.addColorStop(1,'rgba(0,255,0,0)');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(cx,cy,cheekRadius,0,Math.PI*2);ctx.fill();
  }
  ctx.save();ctx.fillStyle='rgba(255,0,0,1)';ctx.filter='blur(0.65px)';
  maskPath(ctx,points,OUTER_LIPS,w,h);ctx.fill();ctx.restore();
  // Opening the mouth must not paint the teeth and interior pink.
  ctx.save();ctx.globalCompositeOperation='destination-out';
  maskPath(ctx,points,INNER_LIPS,w,h);ctx.fill();ctx.restore();
}
function uploadMaskTexture(){
  if(!maskDirty||!gl||!maskTexture)return;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,maskTexture);
  if(skinMaskReady){
    const w=skinMaskCanvas.width,h=skinMaskCanvas.height;
    if(maskTexWidth!==w||maskTexHeight!==h){
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,skinMaskCanvas);
      maskTexWidth=w;maskTexHeight=h;
    }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,skinMaskCanvas);
  }else{
    if(maskTexWidth!==1||maskTexHeight!==1){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,SKIN_BLANK);maskTexWidth=1;maskTexHeight=1;}
    else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,SKIN_BLANK);
  }
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,makeupTexture);
  if(skinMaskReady){
    const w=makeupMaskCanvas.width,h=makeupMaskCanvas.height;
    if(makeupTexWidth!==w||makeupTexHeight!==h){
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,makeupMaskCanvas);
      makeupTexWidth=w;makeupTexHeight=h;
    }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,makeupMaskCanvas);
  }else{
    if(makeupTexWidth!==1||makeupTexHeight!==1){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,MAKEUP_BLANK);makeupTexWidth=1;makeupTexHeight=1;}
    else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,MAKEUP_BLANK);
  }
  gl.activeTexture(gl.TEXTURE0);maskDirty=false;
}

function draw(t){
  if(!state.ready||!state.source)return;
  const src=state.source;
  if(state.mode==='camera'&&(src.readyState<2||!livePerf.shouldRender(t))){raf=requestAnimationFrame(draw);return;}
  const renderStarted=performance.now();
  const [w,h]=resolution();const canvas=gl?glCanvas:fallbackCanvas;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;sourceW=w;sourceH=h;meshDirty=true;meshIdentityReady=false;syncCompareDivider();}
  if(state.mode==='camera'){
    const age=t-lastGoodAt;
    if(state.face&&age>LIVE_TRANSITION.maxStaleMs)releaseLiveGeometry('occlusion-timeout');
    const before=trackedQuality;
    // Invalid/occluded frames reduce intensity rather than teleporting the face warp.
    const desired=age>150?0:targetQuality;
    trackedQuality=liveTransition.step(t,desired);
    if(Math.abs(trackedQuality-before)>.005)meshDirty=true;
  }
  const env=lightingAuto?ambient.updateFrame(src,t):ambient.value;
  const relightField=lightField.update(env,currentFacePose,lightingStrength,t);
  if(state.mode==='camera')relightField.confidence*=poseLightGain;
  if(gl){try{gl.viewport(0,0,w,h);gl.useProgram(program);
    if(meshDirty){
      const matchingLandmarks=referenceOwnLandmarks&&state.mode!=='camera'?referenceOwnLandmarks:null;
      const outline=(trackedLandmarks||matchingLandmarks)?FACE_OUTLINE_IDS.map(i=>(matchingLandmarks||trackedLandmarks)[i]):null;
      const slimStrength=state.enabled&&(state.mode!=='camera')?state.values.slim/100:0;
      const eyeStrength=state.enabled?Math.min(state.values.eyes/100,state.mode==='camera'?.18*trackedQuality:1):0;
      const activeReference=state.enabled&&state.mode!=='camera'&&referenceConfig?.enabled?referenceGeometry:null;
      const sculptStrength=SCULPT_KEYS.some(k=>state.values[k]>0);
      const sculptActive=state.enabled&&skinMaskReady&&trackedLandmarks&&sculptStrength&&
        (state.mode!=='camera'||(liveSculpt&&trackedQuality>.62&&poseContinuityGain>.52));
      const requiresWarp=!!activeReference||!!sculptActive||(!!state.face&&!!skinMaskReady&&(slimStrength>0.0001||eyeStrength>0.0001));
      // If the last upload was already an identity map, tracking updates do not
      // need to remap/upload 4,161 vertices. Still rebuild once to release a warp.
      if(requiresWarp||!meshIdentityReady){
        updateWarpGrid(faceMesh,{face:skinMaskReady?state.face:null,outline,mirror:state.mirror,width:w,height:h,slim:slimStrength,eyes:eyeStrength,referenceMatch:activeReference,referenceConfig,sculpt:sculptActive?state.values:null,sculptLandmarks:sculptActive?trackedLandmarks:null,sculptLive:state.mode==='camera',sculptConfidence:state.mode==='camera'?trackedQuality:1});
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,faceMesh.vertices);
        meshIdentityReady=!requiresWarp;
      }
      meshDirty=false;
    }
    uploadMaskTexture();uploadSemanticMask();uploadSourceTexture(src);
    // Matte is valid only while eye baseline, roll, scale and nose still align.
    const maskAligned=isMatteAligned(semanticMaskFrame,trackedLandmarks);
    const semanticFresh=semanticOcclusionEnabled&&maskAligned&&!!semanticOcclusion.getMatte(performance.now(),state.mode)&&state.enabled;
    gl.uniform1f(uniforms.uSemanticEnabled,semanticFresh?1:0);
    gl.uniform4f(uniforms.uStudioLight,studioLight.direction/100,studioLight.fill/100,studioLight.warmth/100,studioLight.enabled&&state.enabled?1:0);
    gl.uniform2f(uniforms.uSize,w,h);gl.uniform4f(uniforms.uAmbient,env.shadow,env.warmth,env.direction,lightingAuto?lightingStrength/100:0);const poseU=poseLightingUniform(currentFacePose);gl.uniform4f(uniforms.uFacePose,...poseU);gl.uniform4f(uniforms.uLightField,relightField.x,relightField.y,relightField.intensity,relightField.confidence);gl.uniform1f(uniforms.uRelight3D,lightingAuto&&poseAwareLighting&&relight3D?1:0);gl.uniform1f(uniforms.uPoseAwareLight,poseAwareLighting&&!relight3D?(state.mode==='camera'?trackedQuality:1):0);gl.uniform1f(uniforms.uFaceQuality,state.mode==='camera'?trackedQuality:1);gl.uniform1f(uniforms.uDetected,state.face&&skinMaskReady?1:0);gl.uniform1f(uniforms.uDebugMask,state.debugMask?1:0);gl.uniform1f(uniforms.uMirror,state.mirror?1:0);gl.uniform1f(uniforms.uEnabled,state.enabled?1:0);gl.uniform1f(uniforms.uCompare,state.compare?1:0);gl.uniform1f(uniforms.uCompPos,state.comparePosition);normalizedPoints.fill(0);if(state.face){for(let i=0;i<13;i++){normalizedPoints[i*2]=state.face[i].x;normalizedPoints[i*2+1]=state.face[i].y;}}gl.uniform2fv(uniforms['uPoints[0]'],normalizedPoints);const v=state.values;for(const k of Object.keys(v)){const u='u'+k[0].toUpperCase()+k.slice(1);if(uniforms[u]!=null)gl.uniform1f(uniforms[u],v[k]/100);}gl.drawElements(gl.TRIANGLES,faceMesh.indices.length,gl.UNSIGNED_SHORT,0);}
    catch(e){console.error('Render:',e);stageMessage('렌더링 오류: '+e.message,0);state.ready=false;return;}
  }else{const ctx=fallbackCanvas.getContext('2d');ctx.save();ctx.clearRect(0,0,w,h);if(state.mirror){ctx.translate(w,0);ctx.scale(-1,1);}const b=state.values.bright/100;ctx.filter=state.enabled?`brightness(${1+b*.14}) saturate(${.85+state.values.saturation/100*.4})`:'none';ctx.drawImage(src,0,0,w,h);ctx.restore();
    // 2D fallback cannot emulate reference mesh geometry; do not claim matched output.
    // 2D fallback must support the same before/after split even without WebGL2.
    if(state.compare && state.enabled){ctx.save();ctx.beginPath();ctx.rect(0,0,w*state.comparePosition,h);ctx.clip();if(state.mirror){ctx.translate(w,0);ctx.scale(-1,1);}ctx.filter='none';ctx.drawImage(src,0,0,w,h);ctx.restore();}
  }
  if(referencePanel&&state.mode!=='camera'){
    // The triptych's result must be fully corrected even while the main canvas shows a split comparison.
    if(gl&&state.compare&&referencePanel.isTriptychOpen()){
      try{
        gl.uniform1f(uniforms.uCompare,0);
        gl.drawElements(gl.TRIANGLES,faceMesh.indices.length,gl.UNSIGNED_SHORT,0);
        referencePanel.renderResultPreview(glCanvas);
      }finally{
        gl.uniform1f(uniforms.uCompare,1);
        gl.drawElements(gl.TRIANGLES,faceMesh.indices.length,gl.UNSIGNED_SHORT,0);
      }
    }else referencePanel.renderResultPreview(canvas);
  }
  if(state.mode==='camera'){
    // Observe elapsed rendering cost before synchronous MediaPipe inference.
    livePerf.recordRendered(t,performance.now()-renderStarted);
    if(state.tracker&&livePerf.shouldDetect(t,lastDetect)){lastDetect=t;void updateFace(t);}
    if(gl&&semanticOcclusionEnabled&&trackedLandmarks&&trackedQuality>.45&&document.visibilityState==='visible')
      void semanticOcclusion.process(src,{now:t,sourceMode:'camera',landmarks:trackedLandmarks,profile:livePerf.profile});
  }
  frameCount++;
  if(state.mode==='camera'){
    if(t-lastMetric>=1200){
      state.fps=Math.round(frameCount*1000/Math.max(1,t-lastMetric));
      const profile=livePerf.profile;
      $('metrics').textContent=`${state.fps} fps · ${w}×${h} · ${profile.label}${livePerf.mode==='auto'?' AUTO':''}`;
      updateLiveDiagnostics({fps:state.fps,w,h,semanticFresh:semanticOcclusionEnabled&&!!semanticMaskFrame,profile});
      frameCount=0;lastMetric=t;
    }
    raf=requestAnimationFrame(draw);
  }else{$('metrics').textContent=`PHOTO · ${w}×${h}`;updateLiveDiagnostics({fps:null,w,h,semanticFresh:false});raf=0;}
  lastFrame=t;
}
async function startTracking(){if(state.tracker){if(state.mode!=='camera')updateFace(performance.now(),true);return;}if(state.trackerLoading)return;state.trackerLoading=true;setLabel('◌ 얼굴 추적 모델 로딩 중');try{const base='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0';const {FaceLandmarker,FilesetResolver}=await import(`${base}/+esm`);const vision=await FilesetResolver.forVisionTasks(`${base}/wasm`);let tracker=null,lastCreationError=null;
  // Matrices are an optional enhancement; never sacrifice the working face filter
  // when a mobile MediaPipe build does not expose facial transformation matrices.
  for(const delegate of ['GPU','CPU']){
    for(const withPose of [true,false]){
      try{
        tracker=await FaceLandmarker.createFromOptions(vision,{
          baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate},
          runningMode:state.mode==='camera'?'VIDEO':'IMAGE',numFaces:1,
          minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5,
          outputFacialTransformationMatrixes:withPose
        });break;
      }catch(err){lastCreationError=err;console.warn('Face model fallback:',delegate,withPose?'pose-on':'pose-off',err);}
    }
    if(tracker)break;
  }
  if(!tracker)throw(lastCreationError||Error('얼굴 추적 모델을 시작할 수 없습니다.'));
  state.tracker=tracker;setLabel('● 얼굴 추적 활성화');if(state.mode!=='camera')updateFace(performance.now(),true);}
  catch(e){console.error('Face landmark model:',e);setLabel('○ 얼굴 추적 불가 · 기본 색감 사용 가능');stageMessage('얼굴 모델 연결 실패: 기본 색감 필터는 사용 가능합니다. 미형·메이크업은 네트워크 확인 후 새로고침하세요.',6500);}finally{state.trackerLoading=false;}}
let lastTrackerMode='', trackerBusy=false;
async function updateFace(t,force=false){if(!state.tracker||!state.source||trackerBusy)return;trackerBusy=true;const epoch=sourceGeneration;const source=state.source;try{const mode=state.mode==='camera'?'VIDEO':'IMAGE';if(mode!==lastTrackerMode){await state.tracker.setOptions({runningMode:mode});lastTrackerMode=mode;}const detectStarted=performance.now();const result=mode==='VIDEO'?state.tracker.detectForVideo(source,t):state.tracker.detect(source);if(mode==='VIDEO')livePerf.recordDetection(performance.now()-detectStarted);if(epoch!==sourceGeneration)return;const lm=result.faceLandmarks?.[0];
  if(lm&&lm.length>466){
    if(mode==='VIDEO'){
      // Spatial guard repairs a few isolated unstable points only. A multi-region
      // occlusion or sudden profile jump is rejected before any mesh/mask update.
      const inspection=occlusionGuard.inspect(lm,t);
      if(!inspection.safe){liveFaceFilter.missing();releaseLiveGeometry(inspection.reason);return;}
      const gate=liveFaceFilter.update(inspection.points,t);
      if(!gate.safe){
        // Warmup must establish a coherent reference for the next frame.
        if(gate.reason==='warming-up')occlusionGuard.commit(inspection.points,t);
        releaseLiveGeometry(gate.reason);return;
      }
      trackedLandmarks=gate.points;
      occlusionGuard.commit(trackedLandmarks,t);
      lastOcclusionRepaired=inspection.repaired;
      targetQuality=inspection.quality;
    }else{
      trackedLandmarks=lm.map(p=>({x:p.x,y:p.y}));
    }
    currentFacePose=facePoseTracker.update(result.facialTransformationMatrixes?.[0],trackedLandmarks,t);
    if(mode==='VIDEO'){const gate=poseContinuity.update(currentFacePose,t);poseContinuityGain=gate.gain;poseLightGain=gate.lightGain;}
    else{poseContinuityGain=1;poseLightGain=1;}
    updatePoseStatus();
    liveGateReason='ok';lastFaceTime=t;lastGoodAt=performance.now();
    // Preserve live skin effects through moderate turns, but reduce spatial
    // deformation as the 3D pose reliability falls toward the profile limit.
    if(mode==='VIDEO'){
      // Face pose reliability is a modifier; isolated repairs already lowered
      // targetQuality. This is smoothly enveloped by the render loop.
      const poseFactor=currentFacePose?.source==='matrix'
        ? clamp(.42+.58*currentFacePose.quality,.42,1):1;
      // Pose loss must fail closed: a null pose can no longer re-enable the mesh.
      const coherentGain=poseContinuityGain;
      targetQuality=clamp(targetQuality*poseFactor*poseSafetyMultiplier(currentFacePose)*coherentGain,0,1);
    }else{trackedQuality=1;}
    state.face=LANDMARK_IDS.map(i=>({x:trackedLandmarks[i].x,y:trackedLandmarks[i].y}));
    state.faceDetected=true;meshDirty=true;
    const nose=trackedLandmarks[1];
    const moved=lastMaskNose&&Math.hypot(nose.x-lastMaskNose.x,nose.y-lastMaskNose.y)>.012;
    if(mode!=='VIDEO'||!skinMaskReady||moved||t-lastMaskTime>=livePerf.profile.maskIntervalMs){
      rasterizeSkinMask(trackedLandmarks);lastMaskTime=t;lastMaskNose={x:nose.x,y:nose.y};
    }
    setLabel(mode==='VIDEO'?(lastOcclusionRepaired?'◌ LIVE SAFE · 일부 좌표 보호 중':'● LIVE SAFE · 얼굴 추적 안정'):'● 얼굴 인식 중 · 1인');
    if(mode==='IMAGE'&&gl&&semanticOcclusionEnabled)void semanticOcclusion.process(source,{now:t,sourceMode:'photo',landmarks:trackedLandmarks,profile:livePerf.profile});
    invalidate();
  }else{
    if(mode==='VIDEO')liveFaceFilter.missing();
    releaseLiveGeometry('face-missing');
  }
  }catch(e){console.warn('Tracking error:',e);if(state.mode==='camera'){liveFaceFilter.missing();releaseLiveGeometry('tracking-error');}else{resetMask();setLabel('○ 얼굴 추적 일시 중단');}}finally{trackerBusy=false;}}
function getImageBounds(){
  const rect=stage.getBoundingClientRect();
  const canvas=gl?glCanvas:fallbackCanvas;
  const cw=canvas.width||1,ch=canvas.height||1;
  const ratio=Math.min(rect.width/cw,rect.height/ch);
  const width=cw*ratio,height=ch*ratio;
  return {left:rect.left+(rect.width-width)*.5,top:rect.top+(rect.height-height)*.5,width,height};
}
function syncCompareDivider(){
  if(!state.compare)return;
  const b=getImageBounds(),r=stage.getBoundingClientRect();
  const line=$('compareDivider');
  line.style.left=`${b.left-r.left+b.width*state.comparePosition}px`;
  line.style.top=`${b.top-r.top}px`;
  line.style.bottom='auto';
  line.style.height=`${b.height}px`;
}
function showCompare(on){state.compare=on;invalidate();$('stageCompare').hidden=!on;$('compareBtn').classList.toggle('active',on);syncCompareDivider();}
function getCompareX(event){const b=getImageBounds();return clamp((event.clientX-b.left)/b.width,0,1);}
let dragging=false;stage.addEventListener('pointerdown',e=>{if(!state.compare||!state.ready)return;dragging=true;stage.setPointerCapture(e.pointerId);state.comparePosition=getCompareX(e);syncCompareDivider();invalidate();});stage.addEventListener('pointermove',e=>{if(!dragging)return;state.comparePosition=getCompareX(e);syncCompareDivider();invalidate();});stage.addEventListener('pointerup',()=>dragging=false);stage.addEventListener('pointercancel',()=>dragging=false);
window.addEventListener('resize',syncCompareDivider);
$('startBtn').addEventListener('click',()=>startCamera('user'));
$('cameraBtn').addEventListener('click',()=>startCamera('user'));
$('comparePanelBtn').addEventListener('click',()=>{if(state.ready)showCompare(!state.compare);else toast('먼저 카메라 또는 사진을 실행하세요.');});
$('sampleBtn').addEventListener('click',loadBundledSample);
$('sampleControlBtn').addEventListener('click',loadBundledSample);
$('uploadBtn').addEventListener('click',()=>$('imageInput').click());
$('imageInput').addEventListener('change',e=>{loadImage(e.target.files?.[0]);e.target.value='';});
$('flipBtn').addEventListener('click',()=>{if(state.mode==='camera')startCamera(state.mirror?'environment':'user');else startCamera('user');});
$('captureBtn').addEventListener('click',capture);
$('compareBtn').addEventListener('click',()=>{if(state.ready)showCompare(!state.compare);});
$('resetBtn').addEventListener('click',()=>{state.values={...PRESETS[state.preset]};meshDirty=true;renderSliders();saveLocal();invalidate();toast('프리셋 기본값으로 복원했습니다.');});
$('enabled').addEventListener('change',e=>{state.enabled=e.target.checked;meshDirty=true;saveLocal();invalidate();});
$('debugMaskBtn').addEventListener('click',()=>{state.debugMask=!state.debugMask;$('debugMaskBtn').classList.toggle('active',state.debugMask);$('debugMaskBtn').setAttribute('aria-pressed',String(state.debugMask));invalidate();});
$('savePresetBtn').addEventListener('click',()=>{saveLocal();toast('현재 설정을 이 브라우저에 저장했습니다.');});
$('exportBtn').addEventListener('click',exportPreset);
$('importBtn').addEventListener('click',()=>$('presetInput').click());
$('presetInput').addEventListener('change',e=>{loadPresetFile(e.target.files?.[0]);e.target.value='';});
for(const b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>selectTab(b.dataset.tab));
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
$('closeHelp').addEventListener('click',()=>$('helpDialog').close());
$('okHelp').addEventListener('click',()=>$('helpDialog').close());
$('qualitySelect').addEventListener('change',e=>{
  livePerf.setMode(e.target.value);meshDirty=true;lastMaskTime=-Infinity;
  saveLocal();invalidate();
  toast(livePerf.mode==='auto'?'화질 자동 조절을 켰습니다.':`라이브 화질: ${livePerf.profile.label}`);
});
document.addEventListener('visibilitychange',()=>{
  livePerf.setSuspended(document.hidden);
  // Still-image face analysis is immutable; never discard it during tab switching.
  if(state.mode==='camera'){
    if(document.hidden){releaseLiveGeometry('background');occlusionGuard.reset();liveTransition.reset();lastDetect=0;}
    else{liveFaceFilter.reset();occlusionGuard.reset();liveTransition.reset();targetQuality=0;trackedQuality=0;lastDetect=0;lastMaskTime=-Infinity;meshDirty=true;}
  }
  if(!document.hidden)invalidate();
});
window.addEventListener('pagehide',stopStream);
referencePanel=initReferencePanel({
  getCurrentSource:()=>({source:state.source,mode:state.mode,mirror:state.mirror,previewCanvas:gl?glCanvas:fallbackCanvas}),
  notify:toast,
  canWarp:()=>!!gl,
  onSourceSelected:file=>{void loadImage(file,true);},
  onAnalysisChange:({source,reference})=>{
    referenceGeometry=null;referenceOwnLandmarks=source?.landmarks||null;
    try{if(source&&reference){
      referenceGeometry=buildReferenceMatch(source.landmarks,source.width,source.height,reference.landmarks,reference.width,reference.height);
    }}catch(error){console.warn('Reference Match build:',error);toast('얼굴 비율 차이가 커서 매칭을 제한했습니다.');}
    meshDirty=true;invalidate();
  },
  onConfigChange:config=>{referenceConfig=config;meshDirty=true;invalidate();}
});
$('semanticOcclusionToggle').addEventListener('change',e=>{
  semanticOcclusionEnabled=e.target.checked;semanticOcclusion.setEnabled(semanticOcclusionEnabled);
  semanticMaskFrame=null;semanticMaskDirty=true;saveLocal();
  if(semanticOcclusionEnabled){
    void semanticOcclusion.initialize().then(ok=>{if(!ok||!semanticOcclusionEnabled)return;
      if(state.mode!=='camera'&&state.source&&trackedLandmarks)
        void semanticOcclusion.process(state.source,{now:performance.now(),sourceMode:'photo',landmarks:trackedLandmarks,profile:livePerf.profile});
    });
  }else syncSemanticOcclusionUI();invalidate();
});
$('lightingAuto').addEventListener('change',e=>{lightingAuto=e.target.checked;saveLocal();invalidate();});
$('poseAwareLight').addEventListener('change',e=>{poseAwareLighting=e.target.checked;saveLocal();invalidate();});
$('relight3D').addEventListener('change',e=>{relight3D=e.target.checked;lightField.reset();saveLocal();invalidate();});
$('lightingStrength').addEventListener('input',e=>{lightingStrength=Number(e.target.value);$('lightingStrengthValue').textContent=lightingStrength+'%';saveLocal();invalidate();});
$('liveSculptToggle').addEventListener('change',e=>{liveSculpt=e.target.checked;meshDirty=true;saveLocal();invalidate();});
$('studioLightToggle').addEventListener('change',e=>{studioLight.enabled=e.target.checked;saveLocal();invalidate();});
for(const [id,key,valueId] of [['studioDirection','direction','studioDirectionValue'],['studioFill','fill','studioFillValue'],['studioWarmth','warmth','studioWarmthValue']]){
  $(id).addEventListener('input',e=>{studioLight[key]=Number(e.target.value);$(valueId).textContent=studioLight[key]+'%';saveLocal();invalidate();});
}
const STUDIO_PRESETS=Object.freeze({
  neutral:{enabled:true,direction:0,fill:20,warmth:40},
  window:{enabled:true,direction:-64,fill:55,warmth:36},
  warm:{enabled:true,direction:57,fill:48,warmth:88},
  cool:{enabled:true,direction:-35,fill:39,warmth:12}
});
for(const button of document.querySelectorAll('[data-studio]'))button.addEventListener('click',()=>{
  const preset=STUDIO_PRESETS[button.dataset.studio];if(!preset)return;
  studioLight={...preset};syncStudioControls();saveLocal();invalidate();toast('스튜디오 라이트 적용');
});
$('exportCompareBtn').addEventListener('click',exportBeforeAfter);
$('shareLookLinkBtn').addEventListener('click',async()=>{
  try{
    const selected=lookStore.list().find(x=>x.name===$('savedLookSelect').value);
    const url=encodeLookLink(selected||currentLook($('lookName').value.trim()||'My Beauty Look'),window.location.href);
    if(navigator.share){try{await navigator.share({title:'maxVFX Beauty Look',url});return;}catch(e){if(e.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(url);toast('룩 공유 링크를 복사했습니다.');}
    catch{const output=$('lookShareFallback');output.hidden=false;output.value=url;output.focus();output.select();toast('링크를 직접 복사할 수 있습니다.');}
  }catch(e){toast('링크 만들기 실패: '+e.message);}
});

$('saveLookBtn').addEventListener('click',saveNamedLook);
$('loadLookBtn').addEventListener('click',loadNamedLook);
$('deleteLookBtn').addEventListener('click',()=>{if(!$('savedLookSelect').value)return;lookStore.remove($('savedLookSelect').value);renderSavedLooks();toast('저장된 룩을 삭제했습니다.');});
$('shareLookBtn').addEventListener('click',shareNamedLook);
$('shareSnapshotBtn').addEventListener('click',()=>{if(!state.ready){toast('먼저 카메라 또는 사진을 실행하세요.');return;}const c=correctedSnapshot();if(!c){toast('미리보기 처리 실패');return;}c.toBlob(async blob=>{if(!blob){toast('이미지 변환 실패');return;}const file=new File([blob],'maxVFX_Look_Preview.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'maxVFX Beauty Preview'});}catch(e){if(e.name!=='AbortError')download(file,file.name);}}else download(file,file.name);},'image/png');});
restore();
try{const linked=decodeLookHash(window.location.hash);if(linked){applyLook(linked);toast('공유된 룩 설정을 불러왔습니다.');}}catch(e){console.warn('룩 링크:',e);toast('룩 링크를 열지 못했습니다.');}
syncSemanticOcclusionUI();syncLightingControls();syncStudioControls();renderSavedLooks();$('qualitySelect').value=livePerf.mode;$('enabled').checked=state.enabled;renderPresets();selectTab('skin');loadBundledSample();