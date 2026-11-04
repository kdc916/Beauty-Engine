/**
 * maxVFX Beauty Engine — in-browser dual-photo reference analysis v0.9.0.
 * MediaPipe IMAGE task is independent of the existing VIDEO/live beauty tracker.
 * No face photographs, facial coordinates or measurements are persisted/uploaded.
 */
import {analyzeFaceGeometry,compareFaceGeometry} from './reference-metrics.v0.2.1.mjs';

const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0';
const MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MAX_BYTES=15*1024*1024;
const $=id=>document.getElementById(id);
const cap=(x,min,max)=>Math.max(min,Math.min(max,x));

export function initReferencePanel({getCurrentSource,notify=()=>{},onAnalysisChange=()=>{},onConfigChange=()=>{},onSourceSelected=()=>{},canWarp=()=>true}){
  const matchConfig={enabled:false,globalStrength:.35,regions:{eyes:.45,nose:.30,lips:.35,jaw:.25,brow:.30},maxDisplacementIPD:.06};
  const matchNames={globalStrength:'전체 유사도',eyes:'눈',nose:'코',lips:'입술',jaw:'얼굴형·턱',brow:'눈썹'};
  let triptychVisible=false;
  let available=false;
  const store={source:{generation:0},reference:{generation:0}};
  let analyzer=null,analyzerPending=null,queue=Promise.resolve(),closed=false;
  const roles={source:'내 사진',reference:'참고 사진'};
  const el={
    source: {image:$('refOwnThumb'),status:$('refOwnStatus'),file:$('refOwnInput'),delete:$('refOwnClear')},
    reference:{image:$('refTargetThumb'),status:$('refTargetStatus'),file:$('refTargetInput'),delete:$('refTargetClear')}
  };
  function status(role,message,kind='idle'){
    el[role].status.textContent=message;
    el[role].status.dataset.state=kind;
  }
  function notifyMatch(){
    const own=store.source.analysis&&store.source.landmarks?{
      analysis:store.source.analysis,landmarks:store.source.landmarks,width:store.source.image.naturalWidth,height:store.source.image.naturalHeight,image:store.source.image
    }:null;
    const ref=store.reference.analysis&&store.reference.landmarks?{
      analysis:store.reference.analysis,landmarks:store.reference.landmarks,width:store.reference.image.naturalWidth,height:store.reference.image.naturalHeight,image:store.reference.image
    }:null;
    const ready=!!own&&!!ref;
    available=ready&&canWarp();
    $('refMatchEnabled').disabled=!available;
    if(!ready){matchConfig.enabled=false;$('refMatchEnabled').checked=false;}
    $('refMatchHint').textContent=!ready?'내 사진과 참고 인물 분석이 완료되면 사용할 수 있습니다.':available?'분석 완료 · 전체/부위별 유사도를 조절할 수 있습니다.':'얼굴 분석은 완료됐지만, 이 브라우저는 WebGL2 변형을 지원하지 않습니다.';
    $('refTriptychOwn').src=own?.image?.src||'';
    $('refTriptychReference').src=ref?.image?.src||'';
    syncInputs();onAnalysisChange({source:own,reference:ref});onConfigChange({...matchConfig,regions:{...matchConfig.regions}});
  }
  function release(role){
    const old=store[role];old.generation++;
    if(old.url)URL.revokeObjectURL(old.url);
    if(old.image)old.image.onload=old.image.onerror=null;
    store[role]={generation:old.generation};
    el[role].image.removeAttribute('src');el[role].image.hidden=true;
    el[role].delete.hidden=true;
  }
  function presentMetrics(){
    const root=$('refComparison');root.replaceChildren();
    const a=store.source.analysis,b=store.reference.analysis;
    if(!a||!b){
      $('refSummary').textContent='두 사진 모두 얼굴 분석이 완료되면 부위별 비율 차이를 보여줍니다.';
      return;
    }
    $('refSummary').textContent='눈간 거리로 정규화한 2D 비율입니다. 유사도 점수나 실제 수술 결과 예측이 아닙니다.';
    const header=document.createElement('div');header.className='ref-metric-head';header.textContent='부위 · 내 사진 → 참고 사진 · 비율 차이';root.append(header);
    for(const row of compareFaceGeometry(a,b)){
      const entry=document.createElement('div');entry.className='ref-metric';
      const label=document.createElement('span');label.textContent=row.label;
      const values=document.createElement('span');values.className='ref-metric-values';
      values.textContent=`${row.source.toFixed(2)} → ${row.target.toFixed(2)}`;
      const difference=document.createElement('b');difference.className='ref-metric-delta';
      difference.textContent=`${row.deltaPercent>0?'+':''}${row.deltaPercent.toFixed(1)}%`;
      entry.append(label,values,difference);root.append(entry);
    }
    const warnings=[...a.warnings.map(x=>'내 사진: '+x),...b.warnings.map(x=>'참고 사진: '+x)];
    if(warnings.length){
      const p=document.createElement('p');p.className='ref-warning';p.textContent=warnings.join(' · ');root.append(p);
    }
  }
  function resetRole(role){release(role);status(role,'사진을 선택해 주세요.');presentMetrics();notifyMatch();}
  async function acquireAnalyzer(){
    if(analyzer)return analyzer;
    if(analyzerPending)return analyzerPending;
    analyzerPending=(async()=>{
      const {FaceLandmarker,FilesetResolver}=await import(`${CDN}/+esm`);
      const vision=await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      // Dedicated IMAGE model prevents mode switches/races with the live camera tracker.
      return FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'IMAGE',numFaces:3,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5});
    })();
    try{analyzer=await analyzerPending;return analyzer;}
    finally{analyzerPending=null;}
  }
  async function analyzeSlot(role,generation){
    const current=store[role];if(!current.image||current.generation!==generation||closed)return;
    status(role,'얼굴 분석 모델 준비 중…','busy');
    try{
      const tracker=await acquireAnalyzer();
      if(closed||store[role].generation!==generation)return;
      status(role,'얼굴 특징 분석 중…','busy');
      // The IMAGE API is synchronous: perform it only on explicit photo selection.
      await new Promise(resolve=>setTimeout(resolve,0));
      if(closed||store[role].generation!==generation)return;
      const image=current.image;
      const sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
      const scale=Math.min(1,1024/Math.max(sourceWidth,sourceHeight));
      const width=Math.max(2,Math.round(sourceWidth*scale)),height=Math.max(2,Math.round(sourceHeight*scale));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      canvas.getContext('2d',{alpha:false}).drawImage(image,0,0,width,height);
      const result=tracker.detect(canvas);
      // Do not retain canvas or full-resolution image data in a persistent profile.
      if(closed||store[role].generation!==generation)return;
      const faces=result.faceLandmarks||[];
      if(faces.length!==1)throw Error(faces.length===0?'얼굴을 찾지 못했습니다. 밝은 정면 사진으로 다시 시도하세요.':'얼굴이 여러 개 보입니다. 한 명만 있는 사진을 선택하세요.');
      const analysis=analyzeFaceGeometry(faces[0],width,height);
      store[role].analysis=analysis;
      store[role].landmarks=faces[0].map(p=>({x:p.x,y:p.y}));
      status(role,`분석 완료 · ${width}×${height}${analysis.warnings.length?' · 촬영 각도 확인':''}`,'success');
      presentMetrics();notifyMatch();
    }catch(error){
      if(closed||store[role].generation!==generation)return;
      store[role].analysis=null;
      const message=error instanceof Error?error.message:String(error);
      status(role,`분석 실패 · ${message}`,'error');presentMetrics();notifyMatch();
      console.warn('Reference face analysis:',error);
    }
  }
  function schedule(role){
    const generation=store[role].generation;
    queue=queue.catch(()=>{}).then(()=>analyzeSlot(role,generation));
  }
  async function useFile(role,file){
    if(!file)return;
    release(role);presentMetrics();notifyMatch();
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>MAX_BYTES){
      status(role,'JPG·PNG·WebP, 15MB 이하 사진을 선택하세요.','error');return;
    }
    const generation=store[role].generation;
    const url=URL.createObjectURL(file);
    store[role].url=url;
    const image=new Image();image.decoding='async';
    store[role].image=image;
    status(role,'사진을 불러오는 중…','busy');
    image.onload=()=>{
      if(closed||store[role].generation!==generation)return;
      if(image.naturalWidth<256||image.naturalHeight<256){
        release(role);status(role,'256px 이상의 정면 사진을 선택해 주세요.','error');presentMetrics();return;
      }
      el[role].image.src=url;el[role].image.hidden=false;el[role].delete.hidden=false;
      store[role].name=file.name;status(role,'분석 대기…','busy');
      if(role==='source')onSourceSelected(file);
      schedule(role);
    };
    image.onerror=()=>{
      if(closed||store[role].generation!==generation)return;
      release(role);status(role,'사진을 읽지 못했습니다. 지원되는 이미지로 다시 시도하세요.','error');presentMetrics();
    };
    image.src=url;
  }
  async function usePreview(){
    const current=getCurrentSource();
    if(!current?.source){notify('먼저 샘플·카메라·사진을 실행해 주세요.');return;}
    const input=current.source;
    const isCamera=current.mode==='camera';
    const w=isCamera?input.videoWidth:input.naturalWidth;
    const h=isCamera?input.videoHeight:input.naturalHeight;
    if(!w||!h){notify('현재 프리뷰를 불러올 수 없습니다.');return;}
    const scale=Math.min(1,1400/Math.max(w,h));
    const canvas=document.createElement('canvas');canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
    const ctx=canvas.getContext('2d');
    if(current.mirror){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
    ctx.drawImage(input,0,0,canvas.width,canvas.height);
    // Convert to File so we use exactly the same validation/analysis lifecycle.
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.91));
    if(!blob){notify('사진 복사에 실패했습니다.');return;}
    await useFile('source',new File([blob],isCamera?'camera-capture.jpg':'preview-source.jpg',{type:'image/jpeg'}));
    $('referencePanel').open=true;
  }
  for(const role of ['source','reference']){
    el[role].file.addEventListener('change',event=>{void useFile(role,event.target.files?.[0]);event.target.value='';});
    el[role].delete.addEventListener('click',()=>resetRole(role));
  }
  $('refOwnPick').addEventListener('click',()=>el.source.file.click());
  $('refTargetPick').addEventListener('click',()=>el.reference.file.click());
  $('refUsePreview').addEventListener('click',()=>{void usePreview();});
  // New controls keep face photos and measurement state entirely in volatile memory.
  const sliders=$('refMatchSliders');
  for(const [key,label] of Object.entries(matchNames)){
    const row=document.createElement('div');row.className='ref-match-slider-row';
    const title=document.createElement('label');const id='ref_match_'+key;title.htmlFor=id;
    const caption=document.createElement('span');caption.textContent=label;const number=document.createElement('b');
    const value=key==='globalStrength'?matchConfig.globalStrength:matchConfig.regions[key];
    number.textContent=Math.round(value*100)+'%';title.append(caption,number);
    const input=document.createElement('input');input.type='range';input.min='0';input.max='100';input.step='1';input.id=id;input.value=String(Math.round(value*100));input.disabled=key!=='globalStrength';
    input.addEventListener('input',()=>{
      const val=Number(input.value)/100;if(key==='globalStrength')matchConfig.globalStrength=val;else matchConfig.regions[key]=val;
      number.textContent=input.value+'%';onConfigChange({...matchConfig,regions:{...matchConfig.regions}});
    });
    row.append(title,input);sliders.append(row);
  }
  function syncInputs(){
    const all=sliders.querySelectorAll('input');
    all.forEach(input=>{const k=input.id.replace('ref_match_','');const val=k==='globalStrength'?matchConfig.globalStrength:matchConfig.regions[k];input.value=String(Math.round(val*100));input.previousElementSibling.querySelector('b').textContent=input.value+'%';input.disabled=!available;});
  }
  $('refMatchEnabled').disabled=true;
  $('refMatchEnabled').addEventListener('change',event=>{matchConfig.enabled=available&&event.target.checked;onConfigChange({...matchConfig,regions:{...matchConfig.regions}});});
  $('refMatchReset').addEventListener('click',()=>{
    matchConfig.globalStrength=.35;Object.assign(matchConfig.regions,{eyes:.45,nose:.30,lips:.35,jaw:.25,brow:.30});
    syncInputs();onConfigChange({...matchConfig,regions:{...matchConfig.regions}});
  });
  $('refMatchCompare').addEventListener('click',()=>{
    triptychVisible=!triptychVisible;$('refMatchTriptych').hidden=!triptychVisible;
    $('refMatchCompare').textContent=triptychVisible?'3면 비교 닫기':'원본 · 참고 · 결과 3면 보기';
    if(triptychVisible)renderResultPreview(getCurrentSource()?.previewCanvas);
    onConfigChange({...matchConfig,regions:{...matchConfig.regions}});
  });
  function renderResultPreview(canvas){
    if(!triptychVisible||!canvas)return;
    const out=$('refTriptychResult');const w=canvas.width||1,h=canvas.height||1;
    if(out.width!==240||out.height!==Math.max(1,Math.round(240*h/w))){out.width=240;out.height=Math.max(1,Math.round(240*h/w));}
    try{const c=out.getContext('2d');c.clearRect(0,0,out.width,out.height);c.drawImage(canvas,0,0,out.width,out.height);}catch(error){console.warn('Result preview:',error);}
  }
  presentMetrics();syncInputs();
  window.addEventListener('pagehide',()=>{
    closed=true;release('source');release('reference');
    if(analyzer?.close)analyzer.close();
  },{once:true});
  function setConfig(saved){
    if(!saved||typeof saved!=='object')return;
    const clamp=(v)=>Math.max(0,Math.min(1,v));
    if(Number.isFinite(saved.globalStrength))matchConfig.globalStrength=clamp(saved.globalStrength);
    for(const k of ['eyes','nose','lips','jaw','brow']){
      if(Number.isFinite(saved.regions?.[k]))matchConfig.regions[k]=clamp(saved.regions[k]);
    }
    // A preset alone must never enable a face-specific match without source/reference photos.
    matchConfig.enabled=false;$('refMatchEnabled').checked=false;
    syncInputs();onConfigChange({...matchConfig,regions:{...matchConfig.regions}});
  }
  return {reset:()=>{resetRole('source');resetRole('reference');},renderResultPreview,isTriptychOpen:()=>triptychVisible,clearSource:()=>resetRole('source'),getConfig:()=>({...matchConfig,regions:{...matchConfig.regions}}),setConfig};
}