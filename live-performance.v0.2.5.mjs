/**
 * maxVFX Beauty Engine v0.2.5 — adaptive, fail-safe live rendering scheduler.
 * This module is deterministic and has no browser/MediaPipe/WebGL dependencies.
 * Measurements describe actual elapsed time; the profile never claims a device FPS.
 */
export const LIVE_PROFILES = Object.freeze({
  battery: Object.freeze({label:'배터리', maxSide:512, renderFPS:20, detectIntervalMs:240, maskIntervalMs:280}),
  performance: Object.freeze({label:'절전', maxSide:640, renderFPS:24, detectIntervalMs:190, maskIntervalMs:230}),
  balanced: Object.freeze({label:'균형', maxSide:768, renderFPS:30, detectIntervalMs:140, maskIntervalMs:180}),
  quality: Object.freeze({label:'고화질', maxSide:960, renderFPS:30, detectIntervalMs:110, maskIntervalMs:130})
});
export const LIVE_PROFILE_ORDER = Object.freeze(['battery','performance','balanced','quality']);
export const LIVE_MODES = Object.freeze(['auto', ...LIVE_PROFILE_ORDER]);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function getLiveResolution(width, height, profile) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<2||height<2)
    return [720, 900];
  const maxSide=profile?.maxSide??LIVE_PROFILES.balanced.maxSide;
  const scale=Math.min(1, maxSide/Math.max(width,height));
  return [Math.max(2, Math.round(width*scale)),Math.max(2,Math.round(height*scale))];
}

/** Auto starts balanced and only changes one tier after repeated real observations. */
export function createLivePerformanceController(initialMode='auto') {
  let mode='auto', tier='balanced', lastRendered=-Infinity, lastFrame=null;
  let windowStart=null, renderSamples=0, intervalTotal=0, renderCostTotal=0;
  let detectorCost=0, detectorSamples=0, badWindows=0, goodWindows=0;
  let lastChange=-Infinity, transitions=0, suspended=false;

  function resetTiming() {
    lastRendered=-Infinity;lastFrame=null;windowStart=null;
    renderSamples=0;intervalTotal=0;renderCostTotal=0;
    detectorCost=0;detectorSamples=0;badWindows=0;goodWindows=0;
  }
  function setMode(next) {
    if(!LIVE_MODES.includes(next))return false;
    if(mode===next)return true;
    mode=next;tier=next==='auto'?'balanced':next;
    lastChange=-Infinity;resetTiming();return true;
  }
  function setSuspended(value) { suspended=Boolean(value);resetTiming(); }
  function shouldRender(ts) {
    if(suspended||!Number.isFinite(ts))return false;
    return ts-lastRendered>=1000/LIVE_PROFILES[tier].renderFPS-1.3;
  }
  function shouldDetect(ts,lastDetectTime) {
    return !suspended&&Number.isFinite(ts)&&ts-lastDetectTime>=LIVE_PROFILES[tier].detectIntervalMs;
  }
  function recordDetection(costMs) {
    if(!Number.isFinite(costMs)||costMs<0||costMs>2000)return;
    detectorSamples++;detectorCost+=costMs;
  }
  function recordRendered(ts,costMs=0) {
    if(suspended||!Number.isFinite(ts))return;
    if(lastFrame!==null&&ts-lastFrame>1000){resetTiming();}
    if(windowStart===null)windowStart=ts;
    if(Number.isFinite(lastRendered)){
      const gap=ts-lastRendered;
      if(gap>0&&gap<700){intervalTotal+=gap;renderSamples++;}
    }
    lastRendered=ts;lastFrame=ts;
    if(Number.isFinite(costMs)&&costMs>=0&&costMs<2000)renderCostTotal+=costMs;
    const elapsed=ts-windowStart;
    if(elapsed<3600||renderSamples<10)return;
    const avgInterval=intervalTotal/Math.max(1,renderSamples);
    const avgCost=renderCostTotal/Math.max(1,renderSamples);
    const detectAvg=detectorCost/Math.max(1,detectorSamples);
    const expected=1000/LIVE_PROFILES[tier].renderFPS;
    // Frame pacing, render cost and CPU inference must all fit the budget.
    const overloaded=avgInterval>expected*1.42 || avgCost>expected*.85 ||
                     (detectorSamples>=4&&detectAvg>65);
    const comfortable=avgInterval<expected*1.14&&avgCost<expected*.48&&
                      (!detectorSamples||detectAvg<30);
    badWindows=overloaded?badWindows+1:0;
    goodWindows=comfortable?goodWindows+1:0;
    if(mode==='auto'&&ts-lastChange>=6500){
      const idx=LIVE_PROFILE_ORDER.indexOf(tier);
      if(badWindows>=2&&idx>0){tier=LIVE_PROFILE_ORDER[idx-1];transitions++;lastChange=ts;badWindows=0;goodWindows=0;}
      else if(goodWindows>=3&&idx<2){ // Auto caps at balanced until explicit High Quality.
        tier=LIVE_PROFILE_ORDER[idx+1];transitions++;lastChange=ts;badWindows=0;goodWindows=0;
      }
    }
    windowStart=ts;renderSamples=0;intervalTotal=0;renderCostTotal=0;
    detectorCost=0;detectorSamples=0;
  }
  setMode(initialMode);
  return {
    get mode(){return mode;}, get tier(){return tier;},
    get profile(){return LIVE_PROFILES[tier];},
    get transitions(){return transitions;},
    setMode,setSuspended,shouldRender,shouldDetect,recordDetection,recordRendered,resetTiming
  };
}
