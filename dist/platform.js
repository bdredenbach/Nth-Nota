/* Same interface for the browser prototype and the packaged Android app. */
(function(){'use strict';const native=window.NotaAndroid;
window.NotaPlatform={isAndroid:!!native,
 read(text,rate){if(!native)return false;native.speak(String(text),Number(rate)||1);return true;},
 stopRead(){native?.stopSpeaking();window.speechSynthesis?.cancel();},
 syncReminders(items){if(!native)return;native.syncReminders(JSON.stringify(items.filter(n=>!n.deletedAt&&n.reminder).map(n=>({id:n.id,...n.reminder}))));},
 mergeNativeReminders(items){if(!native)return;try{const saved=JSON.parse(native.getReminders());for(const n of items){const r=saved.find(r=>r.id===n.id);if(r&&n.reminder&&(n.reminder.when===r.sourceWhen||n.reminder.when===r.when)){n.reminder.when=r.when;n.reminder.fired=r.fired;}}}catch{}},
 alerts(){native?.requestNotifications();},
 async exportBlob(blob,name){if(!native)return false;const id=native.beginExport(String(name),blob.type||'application/octet-stream',blob.size);if(!id)throw Error('Another file is being saved. Finish that export first.');try{for(let offset=0;offset<blob.size;offset+=192*1024){const bytes=new Uint8Array(await blob.slice(offset,offset+192*1024).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));if(!native.appendExport(id,btoa(binary)))throw Error('Could not prepare the file.');}if(!native.finishExport(id))throw Error('Export size did not match.');return true;}catch(e){native.cancelExport(id);throw e;}}
};
})();
