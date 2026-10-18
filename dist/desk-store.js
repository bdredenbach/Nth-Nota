(function(root){'use strict';
class ConflictError extends Error{constructor(){super('Another window has saved a newer desk. Export your current changes before reloading.');this.name='ConflictError';}}
function write(db,snapshot,expectedRevision){return new Promise((resolve,reject)=>{const tx=db.transaction('desk','readwrite'),store=tx.objectStore('desk');let conflict=false;const next=expectedRevision+1;const read=store.get('current');read.onsuccess=()=>{const current=Number(read.result?._revision)||0;if(current!==expectedRevision){conflict=true;tx.abort();return;}store.put({...snapshot,_revision:next},'current');};tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(conflict?new ConflictError():tx.error||Error('Storage write was interrupted.'));tx.onerror=()=>{};});}
const api={write,ConflictError};if(typeof module!=='undefined')module.exports=api;else root.NotaStorage=api;
})(typeof window!=='undefined'?window:globalThis);
