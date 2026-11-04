/** v0.9.0 — reject segmentation mattes stale under yaw, roll or scale.
 * Conservative fail-closed alignment checks. Image data is never stored here.
 */
const finite=x=>Number.isFinite(x);
export function measureFaceAlignment(points){
  const nose=points?.[1],left=points?.[33],right=points?.[263];
  if(!nose||!left||!right||![nose.x,nose.y,left.x,left.y,right.x,right.y].every(finite))return null;
  const eyeDx=right.x-left.x,eyeDy=right.y-left.y,width=Math.hypot(eyeDx,eyeDy);
  if(width<.055||width>1)return null;
  return {noseX:nose.x,noseY:nose.y,eyeX:(left.x+right.x)*.5,eyeY:(left.y+right.y)*.5,eyeWidth:width,eyeRoll:Math.atan2(eyeDy,eyeDx)};
}
export function isMatteAligned(frame,landmarks,{maxNoseDelta=.026,maxEyeShift=.020,maxRollDeg=11,maxScaleDelta=.16}={}){
  const current=measureFaceAlignment(landmarks);
  if(!frame||!current)return false;
  for(const key of ['noseX','noseY','eyeX','eyeY','eyeWidth','eyeRoll'])if(!finite(frame[key]))return false;
  if(Math.hypot(current.noseX-frame.noseX,current.noseY-frame.noseY)>maxNoseDelta)return false;
  if(Math.hypot(current.eyeX-frame.eyeX,current.eyeY-frame.eyeY)>maxEyeShift)return false;
  const ratio=current.eyeWidth/frame.eyeWidth;
  if(!finite(ratio)||Math.abs(ratio-1)>maxScaleDelta)return false;
  const diff=current.eyeRoll-frame.eyeRoll;
  const roll=Math.abs(Math.atan2(Math.sin(diff),Math.cos(diff)))*180/Math.PI;
  return roll<=maxRollDeg;
}
