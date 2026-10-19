/* Calculate after text insertion, including Android IME commits with no '=' keydown. */
(function(root){'use strict';
function answer(line,calculate){
 if(typeof line!=='string'||line.length>400||/[\r\n]/.test(line))return null;
 const match=line.match(/^(?:[^:=\n]{1,100}:\s*)?([\d.(+\-−][\d.eE+*/^()%×÷−\s-]*)\s*=\s*$/);
 if(!match)return null;
 try{const value=calculate(match[1].trim());return Number.isFinite(value)?value:null;}catch{return null;}
}
function attach(editor,{enabled=()=>true,calculate=root.NotaCore.calculate,onChange=()=>{}}={}){
 const doc=editor.ownerDocument;let composing=false,updating=false,pasting=false,closed=false,timer;
 function apply(){
  if(closed||composing||updating||pasting||!enabled()||!editor.isConnected)return;
  const selection=doc.getSelection();if(!selection?.isCollapsed||!selection.rangeCount||!editor.contains(selection.anchorNode))return;
  const node=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement,block=node.closest('p,div,li,h1,h2,h3,pre')||editor;
  if(block!==editor&&!editor.contains(block))return;
  const before=doc.createRange();before.selectNodeContents(block);before.setEnd(selection.anchorNode,selection.anchorOffset);
  const fragment=before.cloneContents();for(const br of fragment.querySelectorAll('br'))br.replaceWith(doc.createTextNode('\n'));
  const line=fragment.textContent.split('\n').at(-1),value=answer(line,calculate);if(value===null)return;
  updating=true;
  try{if(doc.execCommand('insertText',false,' '+value))onChange();}finally{updating=false;}
 }
 const input=e=>{if(e.isComposing||composing||e.inputType&&(!e.inputType.startsWith('insert')||['insertFromPaste','insertFromDrop','insertParagraph','insertLineBreak'].includes(e.inputType)))return;apply();};
 const begin=()=>{composing=true;clearTimeout(timer);};
 const end=()=>{composing=false;clearTimeout(timer);timer=setTimeout(apply,0);};
 const paste=()=>{pasting=true;queueMicrotask(()=>{pasting=false;});};
 editor.addEventListener('input',input);editor.addEventListener('compositionstart',begin);editor.addEventListener('compositionend',end);editor.addEventListener('paste',paste,true);
 return ()=>{closed=true;clearTimeout(timer);editor.removeEventListener('input',input);editor.removeEventListener('compositionstart',begin);editor.removeEventListener('compositionend',end);editor.removeEventListener('paste',paste,true);};
}
const api={answer,attach};if(typeof module!=='undefined')module.exports=api;else root.NotaMath=api;
})(typeof window!=='undefined'?window:globalThis);
