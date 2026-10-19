/* One bounded history for ink and image transforms. Original attachments are immutable. */
(function(root){'use strict';
class EditHistory {
 constructor(limit=20,maxBytes=16*1024*1024){this.limit=limit;this.maxBytes=maxBytes;this.past=[];this.future=[];}
 trim(stack){let bytes=stack.reduce((sum,s)=>sum+JSON.stringify(s).length*2,0);while(stack.length>1&&(stack.length>this.limit||bytes>this.maxBytes)){bytes-=JSON.stringify(stack.shift()).length*2;}}
 record(value){this.past.push(structuredClone(value));this.trim(this.past);this.future=[];}
 undo(current){if(!this.past.length)return null;this.future.push(structuredClone(current));this.trim(this.future);return this.past.pop();}
 redo(current){if(!this.future.length)return null;this.past.push(structuredClone(current));this.trim(this.past);return this.future.pop();}
}
if(typeof module!=='undefined')module.exports=EditHistory;else root.NotaEditHistory=EditHistory;
})(typeof window!=='undefined'?window:globalThis);
