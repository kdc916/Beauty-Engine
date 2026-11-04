/**
 * maxVFX Beauty Engine — reference photo facial geometry v0.2.1.
 * Pure calculations: 2D reference measurements normalized by eye-center distance.
 * NOT identity recognition, surgery prediction, or measurements of 3D anatomy.
 */
const LABELS = Object.freeze({
  eyeWidth:'눈 가로폭', eyeOpening:'눈 뜨임', browHeight:'눈썹 높이',
  noseWidth:'콧방울 폭', lipWidth:'입술 가로폭', lipHeight:'입술 두께',
  jawWidth:'얼굴 아래 폭', chinLength:'턱 길이'
});
export const FEATURE_LABELS = LABELS;
export const FEATURE_KEYS = Object.freeze(Object.keys(LABELS));
const EPS=1e-6;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const avg=(...points)=>({x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function analyzeFaceGeometry(landmarks,width,height){
  if(!Array.isArray(landmarks)||landmarks.length<468)throw Error('얼굴 특징점 데이터가 충분하지 않습니다.');
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('이미지 크기가 올바르지 않습니다.');
  const point=i=>{
    const p=landmarks[i];
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('얼굴 특징점 좌표가 올바르지 않습니다.');
    return {x:p.x*width,y:p.y*height};
  };
  // 2D roll normalization; image-space distances are physically aspect-correct.
  const eyeL=avg(point(33),point(133),point(159),point(145));
  const eyeR=avg(point(362),point(263),point(386),point(374));
  const center=avg(eyeL,eyeR),dx=eyeR.x-eyeL.x,dy=eyeR.y-eyeL.y;
  const ipd=Math.hypot(dx,dy);
  if(ipd<12)throw Error('눈 사이 거리가 너무 작습니다. 얼굴이 더 크게 보이는 사진을 선택하세요.');
  const cos=dx/ipd,sin=dy/ipd;
  const n=i=>{const p=point(i);const x=p.x-center.x,y=p.y-center.y;return {x:(x*cos+y*sin)/ipd,y:(-x*sin+y*cos)/ipd};};
  const d=(i,j)=>dist(n(i),n(j));
  const a=(...ids)=>avg(...ids.map(n));
  const leftEyeWidth=d(33,133),rightEyeWidth=d(362,263);
  const leftOpening=d(159,145)/Math.max(leftEyeWidth,EPS),rightOpening=d(386,374)/Math.max(rightEyeWidth,EPS);
  const browL=a(70,63,105), browR=a(336,296,334);
  const nose=n(1),faceLeft=n(234),faceRight=n(454);
  const features={
    eyeWidth:(leftEyeWidth+rightEyeWidth)*.5,
    eyeOpening:(leftOpening+rightOpening)*.5,
    browHeight:((n(159).y-browL.y)+(n(386).y-browR.y))*.5,
    noseWidth:d(98,327),
    lipWidth:d(61,291),
    lipHeight:d(0,17),
    jawWidth:dist(faceLeft,faceRight),
    chinLength:n(152).y-(n(1).y+n(168).y)*.5
  };
  // These are capture-quality warnings, not validated 3D pose estimates.
  const rollDeg=Math.atan2(dy,dx)*180/Math.PI;
  const noseDeviation=Math.abs(nose.x);
  const jawSpanPx=dist(faceLeft,faceRight)*ipd;
  const warnings=[];
  if(Math.abs(rollDeg)>18)warnings.push('고개가 기울어진 사진입니다. 정면 사진을 권장합니다.');
  if(noseDeviation>.22)warnings.push('얼굴이 옆으로 돌아간 것으로 보입니다. 정면을 권장합니다.');
  if(Math.min(leftOpening,rightOpening)<.09)warnings.push('눈이 감겼거나 일부 가려져 눈 뜨임 비교가 어려울 수 있습니다.');
  if(d(13,14)/Math.max(features.lipWidth,EPS)>.27)warnings.push('입을 벌린 표정이므로 입술 비율 비교에 오차가 있을 수 있습니다.');
  if(jawSpanPx<115)warnings.push('얼굴 크기가 작아 세부 측정 오차가 커질 수 있습니다.');
  const all=Object.values(features);
  if(all.some(x=>!Number.isFinite(x)||x<0||x>6))throw Error('얼굴 특징값을 안정적으로 계산할 수 없습니다.');
  return {features,rollDeg,noseDeviation,ipdPx:ipd,warnings,image:{width,height}};
}

export function compareFaceGeometry(own,reference){
  if(!own?.features||!reference?.features)return [];
  return FEATURE_KEYS.map(key=>{
    const source=own.features[key],target=reference.features[key];
    const deltaPercent=clamp(((target-source)/Math.max(source,EPS))*100,-999,999);
    return {key,label:LABELS[key],source,target,deltaPercent};
  });
}
