/* Finger ink estimates pressure from speed; pen ink uses the reported sensor value. */
(function(root){
'use strict';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function sensorPressure(value){return Number.isFinite(value)?clamp(value,0,1):.5;}
function createSampler(pointerType,start){
 let previous=start,pressure=.55;
 return point=>{
  if(pointerType==='pen')return sensorPressure(point.pressure);
  if(pointerType!=='touch')return .5;
  if(previous){
   const distance=Math.hypot(point.x-previous.x,point.y-previous.y);
   const elapsed=point.time-previous.time;
   if(distance>0&&Number.isFinite(elapsed)&&elapsed>0){
    const speed=distance/elapsed;
    const target=.2+.7/(1+speed/1.1);
    pressure+=(target-pressure)*(1-Math.exp(-Math.min(elapsed,100)/28));
   }
  }
  previous=point;
  return clamp(pressure,.2,.9);
 };
}
function widthFactor(pressure){return .45+sensorPressure(pressure)*1.3;}
const api={createSampler,widthFactor};
if(typeof module!=='undefined')module.exports=api;else root.NotaInk=api;
})(typeof window!=='undefined'?window:globalThis);
