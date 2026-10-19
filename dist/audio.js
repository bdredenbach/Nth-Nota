/* Local-only audio decoding and PCM transfer. No cloud audio endpoint is used. */
(function(root){'use strict';
const LIMIT=120,RATE=16000,pending=new Map();
const abort=()=>new DOMException('Transcription stopped','AbortError');
function pcm16(buffer){if(buffer.sampleRate!==RATE||!buffer.numberOfChannels||!buffer.length||buffer.duration>LIMIT+.001)throw Error('Transcribe audio up to two minutes in this preview.');const bytes=new Uint8Array(buffer.length*2),view=new DataView(bytes.buffer),channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));for(let i=0;i<buffer.length;i++){let sample=channels.reduce((sum,c)=>sum+(Number.isFinite(c[i])?c[i]:0),0)/channels.length;sample=Math.max(-1,Math.min(1,sample));view.setInt16(i*2,Math.round(sample*(sample<0?32768:32767)),true);}return bytes;}
function recordingError(error,android=false){const name=error?.name||'';if(name==='NotAllowedError'||name==='SecurityError')return android?'Microphone access was denied. Check Nth Nota’s Microphone permission and Android’s microphone access switch.':'Microphone access was denied. Allow it in this browser’s site settings.';if(name==='NotReadableError'||name==='AbortError')return 'The microphone could not start. Close any other recording app, then try again.';if(name==='NotFoundError'||name==='OverconstrainedError')return 'No available microphone was found. Reconnect your microphone or try the phone’s built-in microphone.';if(name==='NotSupportedError')return 'This device could not create a recording. Try importing an audio file.';return 'Recording could not start. Please try again. '+(name?'('+name+')':'');}
if(root.addEventListener)root.addEventListener('nota-transcription',e=>{const d=e.detail,job=pending.get(d?.id);if(!job)return;if(d.event==='progress'){job.progress?.(d);return;}pending.delete(d.id);job.cleanup();if(d.error)job.reject(Object.assign(Error(d.message||'Transcription could not finish.'),{code:d.error}));else if(typeof d.text!=='string'||!d.text.trim())job.reject(Error('No speech was recognized. Your audio is still saved.'));else job.resolve(d);});
async function transcribe(data,{signal,onProgress=()=>{},locale=root.navigator?.language||'en-US'}={}){
 if(typeof data!=='string'||!/^data:audio\/[\w.+-]+(?:;[^,]*)?,/i.test(data))throw Error('Choose a saved audio recording to transcribe.');
 const native=root.NotaAndroid;
 if(!native?.beginTranscription)throw Error('On-device transcription is available in the updated Android app on supported phones.');
 if(signal?.aborted)throw abort();
 onProgress({phase:'decoding',message:'Preparing your audio on this phone…'});
 const Offline=root.OfflineAudioContext||root.webkitOfflineAudioContext;
 if(!Offline)throw Error('This device cannot decode audio for transcription.');
 let buffer;
 try{const response=await fetch(data);const blob=await response.blob();if(blob.size>12*1024*1024)throw Error('Use an audio file smaller than 12 MB.');const decoder=new Offline(1,1,RATE);buffer=await decoder.decodeAudioData(await blob.arrayBuffer());}
 catch(e){if(e.message?.includes('12 MB'))throw e;throw Error('This audio format could not be decoded. Try an MP3, M4A, WAV or WebM file supported by your phone.');}
 if(signal?.aborted)throw abort();
 const bytes=pcm16(buffer),id=crypto.randomUUID();
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);};
  const stop=()=>{pending.delete(id);cleanup();try{native.cancelTranscription(id);}catch{}reject(abort());};
  const timer=setTimeout(()=>{pending.delete(id);cleanup();try{native.cancelTranscription(id);}catch{}reject(Error('Transcription took too long. Your audio is still saved.'));},900000);
  pending.set(id,{resolve,reject,cleanup,progress:onProgress});signal?.addEventListener('abort',stop,{once:true});
  (async()=>{try{
   if(signal?.aborted)throw abort();if(!native.beginTranscription(id,bytes.length))throw Error('Another transcription is still finishing. Try again shortly.');
   for(let offset=0;offset<bytes.length;offset+=64000){if(signal?.aborted)throw abort();let binary='';const chunk=bytes.subarray(offset,offset+64000);for(let i=0;i<chunk.length;i+=8192)binary+=String.fromCharCode(...chunk.subarray(i,i+8192));if(!native.appendTranscription(id,btoa(binary)))throw Error('The audio could not be prepared. Please try again.');await new Promise(r=>setTimeout(r,0));}
   if(signal?.aborted)throw abort();if(!native.finishTranscription(id,locale))throw Error('Transcription could not start. Please try again.');
  }catch(e){pending.delete(id);cleanup();try{native.cancelTranscription(id);}catch{}reject(e);}})();
 });
}
const api={pcm16,recordingError,transcribe};if(typeof module!=='undefined')module.exports=api;else root.NotaAudio=api;
})(typeof window!=='undefined'?window:globalThis);
