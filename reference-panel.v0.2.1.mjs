/**
 * maxVFX Beauty Engine — in-browser dual-photo reference analysis v0.2.1.
 * MediaPipe IMAGE task is independent of the existing VIDEO/live beauty tracker.
 * No face photographs, facial coordinates or measurements are persisted/uploaded.
 */
import {analyzeFaceGeometry,compareFaceGeometry} from './reference-metrics.v0.2.1.mjs';

const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0';
const MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MAX_BYTES=15*1024*1024;
const $=id=>document.getElementById(id);
const cap=(x,min,max)=>Math.max(min,Math.min(max,x));

export function initReferencePanel({getCurrentSource,notify=()=>{}}){
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
  function resetRole(role){release(role);status(role,'사진을 선택해 주세요.');presentMetrics();}
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
      status(role,`분석 완료 · ${width}×${height}${analysis.warnings.length?' · 촬영 각도 확인':''}`,'success');
      presentMetrics();
    }catch(error){
      if(closed||store[role].generation!==generation)return;
      store[role].analysis=null;
      const message=error instanceof Error?error.message:String(error);
      status(role,`분석 실패 · ${message}`,'error');presentMetrics();
      console.warn('Reference face analysis:',error);
    }
  }
  function schedule(role){
    const generation=store[role].generation;
    queue=queue.catch(()=>{}).then(()=>analyzeSlot(role,generation));
  }
  async function useFile(role,file){
    if(!file)return;
    release(role);presentMetrics();
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
      store[role].name=file.name;status(role,'분석 대기…','busy');schedule(role);
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
  presentMetrics();
  window.addEventListener('pagehide',()=>{
    closed=true;release('source');release('reference');
    if(analyzer?.close)analyzer.close();
  },{once:true});
  return {reset:()=>{resetRole('source');resetRole('reference');}};
}
