/* maxVFX Beauty Engine v0.1.3 — original WebGL2 shader implementation.
   MediaPipe Tasks Vision is loaded on demand; image data stays in browser. */
'use strict';
const $ = id => document.getElementById(id);
const PRESETS = {
  clear:{name:'Clear Glow',subtitle:'맑고 투명하게',icon:'✧',skin:36,bright:47,warm:32,glow:28,slim:12,eyes:10,lip:22,blush:22,saturation:49},
  douyin:{name:'Douyin Beauty',subtitle:'화사한 인형 피부',icon:'♡',skin:54,bright:62,warm:56,glow:40,slim:32,eyes:24,lip:57,blush:55,saturation:58},
  soft:{name:'Soft Portrait',subtitle:'은은한 자연광',icon:'☼',skin:24,bright:32,warm:35,glow:17,slim:6,eyes:5,lip:15,blush:18,saturation:46}
};
const FIELDS = {
  skin:[['skin','피부 스무딩','피부결을 보존하며 자연스럽게 보정'],['bright','얼굴 화사함','피부 영역의 밝기 및 톤 보정'],['glow','소프트 글로우','은은한 광채와 확산광']],
  face:[['slim','얼굴 라인','얼굴 윤곽을 부드럽게 정리'],['eyes','눈 크기','눈 주변 영역을 자연스럽게 확대']],
  makeup:[['lip','입술 혈색','입술에 생기를 더하는 피치 핑크'],['blush','블러셔','양 볼에 은은한 홍조']],
  color:[['warm','피치 톤','화사하고 따뜻한 피부 톤'],['saturation','컬러 생기','사진 전체의 채도 조정']]
};
const STORAGE_KEY='maxvfx.beauty.v0.1.preferences';
const state={preset:'douyin',values:{...PRESETS.douyin},enabled:true,tab:'skin',mode:'idle',face:null,faceDetected:false,mirror:true,compare:false,comparePosition:.5,stream:null,source:null,tracker:null,trackerLoading:false,ready:false,fps:0};
const hiddenVideo=$('video'),glCanvas=$('glCanvas'),fallbackCanvas=$('fallbackCanvas'),stage=$('stage');
let gl=null,program=null,uniforms={},texture=null,buffer=null,lastTime=0,lastDetect=0,lastFrame=0,frameCount=0,lastMetric=0,toastTimer=0,messageTimer=0,raf=0,sourceW=0,sourceH=0;

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function toast(text){const e=$('toast');e.textContent=text;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3100);}
function stageMessage(text,ms=4000){const e=$('stageMessage');e.textContent=text;e.hidden=false;clearTimeout(messageTimer);if(ms)messageTimer=setTimeout(()=>e.hidden=true,ms);}
function setLabel(what){$('trackingLabel').textContent=what;}
function saveLocal(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({preset:state.preset,values:state.values,enabled:state.enabled}));}catch{}}
function restore(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY));if(!v||!v.values)return;if(PRESETS[v.preset])state.preset=v.preset;for(const key of Object.keys(PRESETS.douyin)){if(typeof v.values[key]==='number')state.values[key]=clamp(v.values[key],0,100);}state.enabled=v.enabled!==false;}catch{}}
function renderPresets(){const root=$('presets');root.replaceChildren();for(const [key,p] of Object.entries(PRESETS)){const b=document.createElement('button');b.type='button';b.className='preset'+(state.preset===key?' active':'');b.innerHTML=`<div class="preset-icon">${p.icon}</div><strong>${p.name}</strong><small>${p.subtitle}</small>`;b.addEventListener('click',()=>{state.preset=key;state.values={...p};renderPresets();renderSliders();saveLocal();toast(`${p.name} 프리셋 적용`);});root.append(b);}}
function renderSliders(){const wrap=$('sliders');wrap.replaceChildren();for(const [key,label,hint] of FIELDS[state.tab]){const row=document.createElement('div');row.className='slider-row';const head=document.createElement('div');head.className='slider-head';const text=document.createElement('label');text.textContent=label;text.htmlFor='slider_'+key;const number=document.createElement('span');number.className='slider-val';number.textContent=state.values[key];head.append(text,number);const slider=document.createElement('input');slider.className='slider';slider.id='slider_'+key;slider.type='range';slider.min=0;slider.max=100;slider.step=1;slider.value=state.values[key];slider.setAttribute('aria-label',label);slider.addEventListener('input',()=>{state.values[key]=Number(slider.value);number.textContent=slider.value;saveLocal();});const small=document.createElement('div');small.className='slider-hint';small.textContent=hint;row.append(head,slider,small);wrap.append(row);}}
function selectTab(key){state.tab=key;for(const b of document.querySelectorAll('.tab')){const active=b.dataset.tab===key;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));}renderSliders();}
function loadPresetFile(file){if(!file)return;if(file.size>500000){toast('설정 파일이 너무 큽니다.');return;}file.text().then(text=>{const o=JSON.parse(text);if(!o||typeof o.values!=='object')throw Error('올바른 설정 JSON이 아닙니다.');let n=0;for(const k of Object.keys(PRESETS.douyin)){if(Number.isFinite(o.values[k])){state.values[k]=clamp(o.values[k],0,100);n++;}}if(!n)throw Error('유효한 설정 항목이 없습니다.');if(PRESETS[o.preset])state.preset=o.preset;renderPresets();renderSliders();saveLocal();toast('설정을 가져왔습니다.');}).catch(e=>toast(e.message));}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportPreset(){const payload={schema:'maxvfx.beauty.preset.v1',preset:state.preset,values:state.values};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'maxVFX_Beauty_Preset.json');}
function capture(){if(!state.ready){toast('먼저 카메라 또는 사진을 실행하세요.');return;}const canvas=gl?glCanvas:fallbackCanvas;canvas.toBlob(blob=>{if(blob)download(blob,`maxVFX_Beauty_${new Date().toISOString().replace(/[.:]/g,'-')}.png`);else toast('이미지 저장에 실패했습니다.');},'image/png');}
function stopStream(){if(state.stream){for(const t of state.stream.getTracks())t.stop();state.stream=null;}hiddenVideo.pause();hiddenVideo.srcObject=null;}
async function startCamera(facing='user'){stopStream();state.source=null;state.face=null;state.ready=false;try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('카메라를 사용할 수 없습니다. HTTPS 환경을 확인하세요.');const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}}});state.stream=stream;hiddenVideo.srcObject=stream;await hiddenVideo.play();state.source=hiddenVideo;state.mode='camera';state.mirror=facing==='user';setActiveSource('camera');activate();startTracking();}catch(e){console.error(e);stageMessage(`카메라를 열지 못했습니다: ${e.name==='NotAllowedError'?'카메라 권한을 확인하세요.':e.message}`,0);toast('사진 불러오기로도 테스트할 수 있습니다.');}}
async function loadImage(file){if(!file)return;if(!file.type.startsWith('image/')){toast('이미지 파일을 선택하세요.');return;}stopStream();const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);state.source=img;state.mode='photo';state.mirror=false;state.face=null;setActiveSource('photo');activate();startTracking();};img.onerror=()=>{URL.revokeObjectURL(url);toast('이미지를 읽지 못했습니다. 지원되는 JPG/PNG/WebP를 사용하세요.');};img.src=url;}
function setActiveSource(which){
 for(const [id,value] of [['sampleControlBtn','sample'],['cameraBtn','camera'],['uploadBtn','photo']]){
  const btn=$(id);if(!btn)continue;const on=which===value;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));
 }
}
function loadBundledSample(){
 stopStream();
 const img=new Image();
 img.onload=()=>{
  state.source=img;state.mode='sample';state.mirror=false;state.face=null;state.faceDetected=false;
  setActiveSource('sample');activate();showCompare(true);startTracking();
 };
 img.onerror=()=>{
  setActiveSource('photo');stageMessage('샘플 사진 로딩 실패: 사진 업로드 또는 카메라로 테스트하세요.',0);
 };
 img.src=new URL('./assets/sample-portrait.webp',import.meta.url).href;
}
function activate(){if(!state.source)return;state.ready=true;$('intro').hidden=true;$('stageBottom').hidden=false;$('stageMessage').hidden=true;$('liveLabel').textContent=state.mode==='camera'?'LIVE CAMERA':state.mode==='sample'?'SAMPLE PHOTO':'PHOTO PREVIEW';$('liveDot').classList.toggle('on',state.mode==='camera');setLabel('● 얼굴 추적 준비 중');if(!gl&&!initGL()){$('fallbackCanvas').classList.add('active');toast('WebGL2 미지원: 기본 미리보기 모드');}else{$('glCanvas').classList.add('active');$('fallbackCanvas').classList.remove('active');}cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);}
function resolution(){const src=state.source;if(!src)return [720,900];const w=src.videoWidth||src.naturalWidth||720,h=src.videoHeight||src.naturalHeight||900;const maxSide=state.mode==='camera'?960:1600;const ratio=Math.min(1,maxSide/Math.max(w,h));return [Math.max(2,Math.round(w*ratio)),Math.max(2,Math.round(h*ratio))];}

const VERT=`#version 300 es
in vec2 aPos;out vec2 vUv;
void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUv;out vec4 outColor;
uniform sampler2D uTex;uniform vec2 uSize;uniform vec2 uPoints[11];uniform float uDetected;uniform float uMirror;uniform float uEnabled;uniform float uCompare;uniform float uCompPos;
uniform float uSkin;uniform float uBright;uniform float uGlow;uniform float uWarm;uniform float uSaturation;uniform float uSlim;uniform float uEyes;uniform float uLip;uniform float uBlush;
vec3 readTex(vec2 p){return texture(uTex,vec2(clamp(p.x,0.001,0.999),clamp(p.y,0.001,0.999))).rgb;}
float gauss(float x,float sig){return exp(-0.5*x*x/max(0.0001,sig*sig));}
float ellipseMask(vec2 p,vec2 center,vec2 radii){vec2 d=(p-center)/max(radii,vec2(.001));return 1.0-smoothstep(.72,1.13,length(d));}
// UV coordinates are never aspect-scaled. Only the distance metric uses aspect ratio.
// An explicit identity return outside the eye region prevents any global image magnification.
vec2 mapEyes(vec2 p,vec2 c,float radius,float strength){
  if(strength <= 0.00001) return p;
  vec2 d=p-c;
  vec2 metric=vec2(d.x*(uSize.x/uSize.y),d.y);
  float r=length(metric)/max(0.0001,radius);
  if(r >= 1.0) return p;
  float falloff=pow(1.0-smoothstep(0.0,1.0,r),2.0);
  return p-d*clamp(strength,0.0,0.12)*falloff;
}
void main(){
  vec2 p=vec2(uMirror>0.5?1.-vUv.x:vUv.x,1.-vUv.y);
  vec3 original=readTex(p);
  if(uEnabled<0.5 || (uCompare>0.5 && vUv.x<uCompPos)){outColor=vec4(original,1.);return;}
  vec2 src=p;
  if(uDetected>0.5){
    vec2 mid=(uPoints[4]+uPoints[5])*.5;
    float width=max(.08,length(uPoints[5]-uPoints[4]));
    float height=max(.08,length(uPoints[3]-uPoints[10]));
    // Face slimming is restricted to the lower face and fades to zero at its rim.
    // This keeps hair/background pixels in place, even at extreme slider settings.
    float halfWidth=max(.06,abs(uPoints[5].x-uPoints[4].x)*.5);
    float side=abs((p.x-mid.x)/halfWidth);
    float yLower=smoothstep(uPoints[2].y,uPoints[3].y,p.y);
    float yChin=1.0-smoothstep(uPoints[3].y-height*.11,uPoints[3].y+height*.10,p.y);
    float cheekZone=smoothstep(.38,.76,side)*(1.-smoothstep(.91,1.04,side));
    float jaw=yLower*yChin*cheekZone;
    src.x+=(p.x-mid.x)*min(uSlim,.55)*.14*jaw;
    src=mapEyes(src,uPoints[0],width*.22,uEyes*.24);
    src=mapEyes(src,uPoints[1],width*.22,uEyes*.24);
  }
  vec3 color=readTex(src);
  float skinMask=0.;float blushMask=0.;float lipMask=0.;
  if(uDetected>0.5){
    vec2 mid=(uPoints[4]+uPoints[5])*.5;
    vec2 r=vec2(max(.07,length(uPoints[5]-uPoints[4])*.64),max(.08,length(uPoints[3]-uPoints[10])*.61));
    vec2 ctr=vec2(mid.x,(uPoints[10].y+uPoints[3].y)*.50);
    skinMask=ellipseMask(p,ctr,r);
    float er=max(.025,length(uPoints[1]-uPoints[0])*.20);
    skinMask*=1.-ellipseMask(p,uPoints[0],vec2(er,er*.66));
    skinMask*=1.-ellipseMask(p,uPoints[1],vec2(er,er*.66));
    vec2 mouth=(uPoints[6]+uPoints[7])*.5;
    vec2 mouthR=vec2(max(.01,length(uPoints[7]-uPoints[6])*.60),max(.016,length(uPoints[9]-uPoints[8])*.9));
    lipMask=ellipseMask(p,mouth,mouthR);
    skinMask*=1.-lipMask;
    vec2 cheekL=mix(uPoints[0],uPoints[6],.57);cheekL.x-=r.x*.14;
    vec2 cheekR=mix(uPoints[1],uPoints[7],.57);cheekR.x+=r.x*.14;
    blushMask=max(ellipseMask(p,cheekL,r*vec2(.28,.16)),ellipseMask(p,cheekR,r*vec2(.28,.16)));
    skinMask=clamp(skinMask,0.,1.);
  }
  // 8-tap edge-aware, face-mask-only low-frequency retouch. Retains a substantial amount of original detail.
  if(uSkin>0.001 && skinMask>0.001){
    vec2 stepPx=(1./uSize)*2.0;
    vec3 total=color*3.;float weights=3.;
    for(int i=0;i<8;i++){
      float a=6.2831853*float(i)/8.;vec2 q=src+vec2(cos(a),sin(a))*stepPx;
      vec3 c=readTex(q);
      float edge=exp(-dot(c-color,c-color)*45.);
      total+=c*edge;weights+=edge;
    }
    vec3 blur=total/weights;
    color=mix(color,blur,clamp(uSkin*.77*skinMask,0.,.80));
  }
  // Local facial exposure with highlight protection.
  float lum=dot(color,vec3(.2126,.7152,.0722));
  float protect=1.-smoothstep(.67,1.,lum);
  color+=vec3(.085,.068,.076)*uBright*skinMask*protect;
  // Selective peach warmth, blush and lip color.
  color+=vec3(.065,.011,-.013)*uWarm*skinMask*(1.-smoothstep(.78,1.,lum));
  color=mix(color,vec3(color.r*1.045+.02,color.g*.944,color.b*.978),clamp(blushMask*uBlush*.45,0.,.55));
  color=mix(color,vec3(color.r*1.10+.08,color.g*.72+.025,color.b*.84+.035),clamp(lipMask*uLip*.52,0.,.65));
  // Restrained high-key filmic contrast and soft local glow.
  vec3 soft=vec3(1.)-pow(max(vec3(0.),vec3(1.)-color),vec3(1.0+uGlow*.23));
  color=mix(color,soft,skinMask*uGlow*.35);
  float gray=dot(color,vec3(.2126,.7152,.0722));
  color=mix(vec3(gray),color,clamp(.65+uSaturation*.7,.45,1.40));
  outColor=vec4(clamp(color,0.,1.),1.);
}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(e);}return s;}
function initGL(){try{gl=glCanvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl)return false;const v=shader(gl.VERTEX_SHADER,VERT),f=shader(gl.FRAGMENT_SHADER,FRAG);program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'aPos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.uniform1i(gl.getUniformLocation(program,'uTex'),0);for(const n of ['uSize','uPoints[0]','uDetected','uMirror','uEnabled','uCompare','uCompPos','uSkin','uBright','uGlow','uWarm','uSaturation','uSlim','uEyes','uLip','uBlush'])uniforms[n]=gl.getUniformLocation(program,n);glCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;state.face=null;toast('GPU 컨텍스트가 끊겼습니다. 다시 시작해주세요.');});return true;}catch(e){console.error('WebGL initialization:',e);gl=null;stageMessage('WebGL2 셰이더 실행 실패: 기본 영상 모드로 표시합니다.');return false;}}
const LANDMARK_IDS=[33,263,1,152,234,454,61,291,13,14,10];
function draw(t){if(!state.ready||!state.source)return;const src=state.source;if(state.mode==='camera'&&src.readyState<2){raf=requestAnimationFrame(draw);return;}const [w,h]=resolution();const canvas=gl?glCanvas:fallbackCanvas;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;sourceW=w;sourceH=h;syncCompareDivider();}
  if(gl){try{gl.viewport(0,0,w,h);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.uniform2f(uniforms.uSize,w,h);gl.uniform1f(uniforms.uDetected,state.face?1:0);gl.uniform1f(uniforms.uMirror,state.mirror?1:0);gl.uniform1f(uniforms.uEnabled,state.enabled?1:0);gl.uniform1f(uniforms.uCompare,state.compare?1:0);gl.uniform1f(uniforms.uCompPos,state.comparePosition);const pts=new Float32Array(22);if(state.face){for(let i=0;i<11;i++){pts[i*2]=state.face[i].x;pts[i*2+1]=state.face[i].y;}}gl.uniform2fv(uniforms['uPoints[0]'],pts);const v=state.values;for(const k of Object.keys(v)){const u='u'+k[0].toUpperCase()+k.slice(1);if(uniforms[u]!=null)gl.uniform1f(uniforms[u],v[k]/100);}gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
    catch(e){console.error('Render:',e);stageMessage('렌더링 오류: '+e.message,0);state.ready=false;return;}
  }else{const ctx=fallbackCanvas.getContext('2d');ctx.save();ctx.clearRect(0,0,w,h);if(state.mirror){ctx.translate(w,0);ctx.scale(-1,1);}const b=state.values.bright/100;ctx.filter=state.enabled?`brightness(${1+b*.14}) saturate(${.85+state.values.saturation/100*.4})`:'none';ctx.drawImage(src,0,0,w,h);ctx.restore();}
  if(state.mode==='camera'&&state.tracker&&t-lastDetect>=100){lastDetect=t;updateFace(t);}
  frameCount++;if(t-lastMetric>=1200){state.fps=Math.round(frameCount*1000/Math.max(1,t-lastMetric));$('metrics').textContent=`${state.fps} fps · ${w}×${h}`;frameCount=0;lastMetric=t;}lastFrame=t;raf=requestAnimationFrame(draw);
}
async function startTracking(){if(state.tracker){if(state.mode!=='camera')updateFace(performance.now(),true);return;}if(state.trackerLoading)return;state.trackerLoading=true;setLabel('◌ 얼굴 추적 모델 로딩 중');try{const base='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0';const {FaceLandmarker,FilesetResolver}=await import(`${base}/+esm`);const vision=await FilesetResolver.forVisionTasks(`${base}/wasm`);let tracker;try{tracker=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'GPU'},runningMode:state.mode==='camera'?'VIDEO':'IMAGE',numFaces:1,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5});}catch(e){console.warn('GPU delegate failed; using CPU',e);tracker=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'CPU'},runningMode:state.mode==='camera'?'VIDEO':'IMAGE',numFaces:1});}state.tracker=tracker;setLabel('● 얼굴 추적 활성화');if(state.mode!=='camera')updateFace(performance.now(),true);}
  catch(e){console.error('Face landmark model:',e);setLabel('○ 얼굴 추적 불가 · 기본 색감 사용 가능');stageMessage('얼굴 모델 연결 실패: 기본 색감 필터는 사용 가능합니다. 미형·메이크업은 네트워크 확인 후 새로고침하세요.',6500);}finally{state.trackerLoading=false;}}
let lastTrackerMode='', trackerBusy=false;
async function updateFace(t,force=false){if(!state.tracker||!state.source||trackerBusy)return;trackerBusy=true;try{const mode=state.mode==='camera'?'VIDEO':'IMAGE';if(mode!==lastTrackerMode){await state.tracker.setOptions({runningMode:mode});lastTrackerMode=mode;}const result=mode==='VIDEO'?state.tracker.detectForVideo(state.source,t):state.tracker.detect(state.source);const lm=result.faceLandmarks?.[0];if(lm&&lm.length>454){const next=LANDMARK_IDS.map(i=>({x:lm[i].x,y:lm[i].y}));if(state.face){state.face=next.map((p,i)=>({x:state.face[i].x*.58+p.x*.42,y:state.face[i].y*.58+p.y*.42}));}else state.face=next;state.faceDetected=true;setLabel('● 얼굴 인식 중 · 1인');}else{state.face=null;state.faceDetected=false;setLabel('◌ 얼굴을 화면 중앙에 맞춰주세요');}}catch(e){console.warn('Tracking error:',e);state.face=null;setLabel('○ 얼굴 추적 일시 중단');}finally{trackerBusy=false;}}
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
function showCompare(on){state.compare=on;$('stageCompare').hidden=!on;$('compareBtn').classList.toggle('active',on);syncCompareDivider();}
function getCompareX(event){const b=getImageBounds();return clamp((event.clientX-b.left)/b.width,0,1);}
let dragging=false;stage.addEventListener('pointerdown',e=>{if(!state.compare||!state.ready)return;dragging=true;stage.setPointerCapture(e.pointerId);state.comparePosition=getCompareX(e);syncCompareDivider();});stage.addEventListener('pointermove',e=>{if(!dragging)return;state.comparePosition=getCompareX(e);syncCompareDivider();});stage.addEventListener('pointerup',()=>dragging=false);stage.addEventListener('pointercancel',()=>dragging=false);
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
$('resetBtn').addEventListener('click',()=>{state.values={...PRESETS[state.preset]};renderSliders();saveLocal();toast('프리셋 기본값으로 복원했습니다.');});
$('enabled').addEventListener('change',e=>{state.enabled=e.target.checked;saveLocal();});
$('savePresetBtn').addEventListener('click',()=>{saveLocal();toast('현재 설정을 이 브라우저에 저장했습니다.');});
$('exportBtn').addEventListener('click',exportPreset);
$('importBtn').addEventListener('click',()=>$('presetInput').click());
$('presetInput').addEventListener('change',e=>{loadPresetFile(e.target.files?.[0]);e.target.value='';});
for(const b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>selectTab(b.dataset.tab));
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
$('closeHelp').addEventListener('click',()=>$('helpDialog').close());
$('okHelp').addEventListener('click',()=>$('helpDialog').close());
window.addEventListener('pagehide',stopStream);
restore();$('enabled').checked=state.enabled;renderPresets();selectTab('skin');loadBundledSample();
