import {measureFaceAlignment} from './matte-alignment.v0.9.0.mjs';
/**
 * v0.9.0 optional MediaPipe multiclass segmentation controller.
 * Initializes only after explicit opt-in; no image data is transmitted by this JS.
 * External model and wasm files are downloaded from Google's / jsDelivr's servers.
 * Not a true hidden-face reconstruction or a perfect hand/occlusion detector.
 */
import {categoriesToProtection,faceBoundsFromLandmarks,faceMaskQuality,segmentationInterval,createSemanticMatteState} from './semantic-occlusion.v0.9.0.mjs';
import {createOcclusionTemporalFilter,conservativeOccluderEdge} from './semantic-temporal.v0.9.0.mjs';
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0';
const MODEL='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const stateNames=Object.freeze({idle:'꺼짐',loading:'모델 다운로드 중',ready:'활성화',unavailable:'기기 미지원',error:'실행 오류'});
export function createSemanticOcclusionController({onStatus=()=>{},onMatte=()=>{},onFailure=()=>{},onInferenceCost=()=>{},taskFactory=null}={}){
  const matte=createSemanticMatteState();
  const temporal=createOcclusionTemporalFilter();
  let task=null,enabled=false,loading=null,mode='',lastRun=-Infinity,epoch=0,disposed=false,busy=false,failures=0;
  let latest=null,smallCanvas=null,smallCtx=null;
  function inputForSegmentation(source,profile){
    // Avoid allocating a multi-megapixel category map for a full-HD webcam.
    const sw=source.videoWidth||source.naturalWidth||source.width||0;
    const sh=source.videoHeight||source.naturalHeight||source.height||0;
    if(!sw||!sh||typeof document==='undefined')return source;
    const maxSide=profile?.maxSide<=512?256:320;
    const scale=Math.min(1,maxSide/Math.max(sw,sh));
    const w=Math.max(2,Math.round(sw*scale)),h=Math.max(2,Math.round(sh*scale));
    if(!smallCanvas){smallCanvas=document.createElement('canvas');smallCtx=smallCanvas.getContext('2d',{alpha:false});}
    if(!smallCtx)return source;
    if(smallCanvas.width!==w||smallCanvas.height!==h){smallCanvas.width=w;smallCanvas.height=h;}
    smallCtx.drawImage(source,0,0,w,h);return smallCanvas;
  }
  function status(text){onStatus(text);}
  function reset(){epoch++;matte.reset();temporal.reset();latest=null;lastRun=-Infinity;onMatte(null);}
  function setEnabled(v){enabled=Boolean(v)&&!disposed;reset();status(enabled?'모델 준비 중':'꺼짐');return enabled;}
  function resetSource(){reset();}
  async function initialize(){
    if(task)return true;
    if(!enabled||disposed)return false;
    if(loading)return loading;
    const token=epoch;
    loading=(async()=>{
      try{
        status(stateNames.loading);
        let newTask;
        if(taskFactory)newTask=await taskFactory();
        else{
          const {ImageSegmenter,FilesetResolver}=await import(`${CDN}/+esm`);
          const vision=await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
          // CPU avoids a known iOS Safari GPU delegate category scrambling risk.
          newTask=await ImageSegmenter.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'IMAGE',outputCategoryMask:true,outputConfidenceMasks:false});
        }
        if(disposed){newTask.close?.();return false;}
        task=newTask;mode='IMAGE';
        if(enabled)status(stateNames.ready);
        return true;
      }catch(error){
        console.warn('Optional semantic occlusion unavailable:',error);
        status(stateNames.unavailable);onFailure(error);enabled=false;reset();return false;
      }finally{loading=null;}
    })();
    return loading;
  }
  // Inference with ImageSegmenter is synchronous on the UI thread and therefore throttled.
  // Callback APIs are mandatory on some MediaPipe JS builds; tolerate sync result variants.
  async function process(source,{now,sourceMode='camera',landmarks,profile}={}){
    if(!enabled||disposed||busy||!source||!Number.isFinite(now))return false;
    if(sourceMode==='camera'&&now-lastRun<segmentationInterval(profile))return false;
    if(sourceMode!=='camera'&&latest)return true;
    const token=epoch;busy=true;
    try{
      if(!await initialize()||!enabled||disposed||token!==epoch)return false;
      const nextMode=sourceMode==='camera'?'VIDEO':'IMAGE';
      if(nextMode!==mode){await task.setOptions({runningMode:nextMode});mode=nextMode;}
      if(!enabled||token!==epoch)return false;
      let didConsume=false;
      const accept=result=>{
        if(didConsume||!enabled||disposed||token!==epoch)return;
        didConsume=true;
        const mask=result?.categoryMask;
        try{
          if(!mask||!Number.isInteger(mask.width)||!Number.isInteger(mask.height))return;
          // Copy data before a callback's lifetime ends; no pointer to owned WASM memory escapes.
          const labels=new Uint8Array(mask.getAsUint8Array());
          const bounds=faceBoundsFromLandmarks(landmarks);
          const validity=faceMaskQuality(labels,mask.width,mask.height,bounds);
          if(!validity.valid){latest=null;matte.reset();temporal.reset();onMatte(null);status(`얼굴 분할 대기 · ${validity.reason}`);return;}
          const part=categoriesToProtection(labels,mask.width,mask.height);
          const protectedEdge=conservativeOccluderEdge(part.protection,part.width,part.height);
          const anchors=measureFaceAlignment(landmarks);
          // A valid eye baseline + nose must be present for any pose-dependent mask.
          if(!anchors)return;
          const stabilized=temporal.update(protectedEdge,part.width,part.height,{now:performance.now(),noseX:anchors.noseX,noseY:anchors.noseY,mode:nextMode});
          const next={rgba:stabilized.rgba,width:part.width,height:part.height,valid:true,coverage:validity.fraction,...anchors};
          if(matte.commit(next,performance.now(),matte.generation)){
            failures=0;latest=next;onMatte(next);status('가림 보호 활성화');
          }
        }catch(error){console.warn('Segmentation mask invalid:',error);status('분할 결과 오류');}
        finally{try{mask?.close?.();}catch{}}
      };
      lastRun=now;
      // In supported builds this invokes the callback synchronously.
      const started=performance.now();
      const input=inputForSegmentation(source,profile);
      const result=nextMode==='VIDEO'?task.segmentForVideo(input,now,accept):task.segment(input,accept);
      if(nextMode==='VIDEO')onInferenceCost(performance.now()-started);
      if(result?.categoryMask)accept(result);
      return !!latest;
    }catch(error){
      console.warn('Segmentation inference failed:',error);status('가림 보호 오류 · 안전 모드');reset();
      if(++failures>=2){enabled=false;onFailure(error);status('모델 오류 · 기능 해제');}
      return false;
    }finally{busy=false;}
  }
  function getMatte(now,sourceMode){return enabled?matte.current(now,sourceMode):null;}
  function dispose(){disposed=true;enabled=false;reset();task?.close?.();task=null;}
  return {setEnabled,initialize,process,resetSource,getMatte,dispose,get enabled(){return enabled;},get status(){return enabled?stateNames.ready:stateNames.idle;}};
}
