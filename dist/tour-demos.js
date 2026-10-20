/* A manual practice tutor: the person writes and operates the real controls. */
(function(){'use strict';
const $=s=>document.querySelector(s),abortError=()=>new DOMException('Walkthrough stopped','AbortError');
let phase='idle',source=null,dialog=null,chapter=0,step=0,trying=false,ready=false,complete=false,intro=false,error='',generation=0,controller=null,onFinish=null,methods=[],pace=1,exampleClick=false,pending=null,mover=null,actionIndex=-1,actionCount=0;
const answers=new Map(),totals=new Map(),finished=new Set(),edited=new WeakSet();
const resolve=id=>({audio:'voice',alerts:'tasks'})[id]||id;
const chapters=()=>window.NotaTourScenes||[],active=()=>phase!=='idle',sandboxed=()=>phase==='running';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function wait(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(abortError());return;}const done=()=>{signal.removeEventListener('abort',cancel);resolve();},id=setTimeout(done,ms),cancel=()=>{clearTimeout(id);signal.removeEventListener('abort',cancel);reject(abortError());};signal.addEventListener('abort',cancel,{once:true});});}
function check(signal){if(signal.aborted||!sandboxed())throw abortError();}
const valueOf=el=>el?.isContentEditable?el.innerText:el?.value??'';
function write(selector,value){const el=$(selector);if(!el)throw Error('The practice field is not available.');if(el.isContentEditable)el.textContent=value;else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return $(selector)||el;}
function label(el){return (el?.getAttribute('aria-label')||el?.labels?.[0]?.textContent||el?.closest('label')?.textContent||el?.innerText||'the highlighted field').trim().replace(/\s+/g,' ').slice(0,100);}
function requestAction(signal,{kind,selector,suggestion='',key,index,choiceValue=''}){
 check(signal);return new Promise((resolve,reject)=>{
  const el=$(selector);if(!el){reject(Error('The highlighted control is not available.'));return;}
  const p={kind,selector,suggestion,key,index,choiceValue,el,points:[],resolve,reject,signal,abort:null};
  p.abort=()=>{if(pending===p)pending=null;reject(abortError());};signal.addEventListener('abort',p.abort,{once:true});pending=p;actionIndex=index;actionCount=index+1;ready=true;
  if(kind==='type'&&suggestion){el.setAttribute(el.isContentEditable?'data-placeholder':'placeholder',suggestion);}
  renderCoach();position(true);
 });
}
function finishAction(p){
 if(!p||pending!==p||p.signal.aborted)return;
 const el=$(p.selector)||p.el,entry={kind:p.kind,selector:p.selector,value:valueOf(el),points:p.points};
 if(p.kind==='choose')entry.label=el.selectedOptions?.[0]?.textContent||'';
 answers.set(p.key,entry);pending=null;p.signal.removeEventListener('abort',p.abort);ready=false;p.resolve();renderCoach();
}
function context(signal,instant=false,interactive=false,startAt=0,stepNumber=step){
 let count=0;const chapterId=current().id,own=()=>chapterId+':'+stepNumber+':',keyFor=i=>own()+i;
 const fields={signal,instant,$,check:()=>check(signal),wait:ms=>wait(instant||reduced()?0:ms/pace,signal),
  async until(test){for(let i=0;i<250;i++){check(signal);if(test())return;await wait(40,signal);}throw Error('This example took too long. Choose Retry step.');},
  set(selector,value){check(signal);return write(selector,value);},
  async type(selector,suggestion){
   check(signal);const i=count++,key=keyFor(i),saved=answers.get(key);let el=$(selector);if(!el)throw Error('The writing field is not available.');
   if(!interactive||i<startAt){write(selector,saved?.value??'');return;}
   if(saved)el=write(selector,saved.value);
   else if(!edited.has(el)&&![...answers].some(([k,a])=>k.startsWith(current().id+':')&&a.selector===selector))el=write(selector,'');
   await requestAction(signal,{kind:'type',selector,suggestion,key,index:i});
  },
  async choose(selector,choiceValue){
   check(signal);const i=count++,key=keyFor(i),saved=answers.get(key),el=$(selector);if(!el)throw Error('The choices are not available.');
   const option=[...el.options].find(o=>saved?.label&&o.textContent===saved.label)||[...el.options].find(o=>o.value===choiceValue),value=option?.value||'';
   if(!interactive||i<startAt){write(selector,value);return;}
   if(saved)write(selector,value);await requestAction(signal,{kind:'choose',selector,suggestion:option?.textContent||'Choose an entry',choiceValue:value,key,index:i});
  },
  async click(selector){
   check(signal);const i=count++,key=keyFor(i),el=$(selector);if(!el)throw Error('The practice control is not available.');
   if(!interactive||i<startAt){if(!answers.has(key))return;if(el.disabled)throw Error('Finish the earlier fields first.');exampleClick=true;try{el.click();}finally{exampleClick=false;}await wait(0,signal);check(signal);return;}
   await requestAction(signal,{kind:'click',selector,key,index:i});check(signal);
  },
  async stroke(selector){
   check(signal);const i=count++,key=keyFor(i);
   if(interactive&&i>=startAt){await requestAction(signal,{kind:'stroke',selector,suggestion:'Draw a line or write a word here. Choose Next when you’re finished.',key,index:i});return;}
   const canvas=$(selector),points=answers.get(key)?.points||[];if(!canvas)return;
   for(let j=0;j<points.length;j++){const r=canvas.getBoundingClientRect(),type=j===0?'pointerdown':j===points.length-1?'pointerup':'pointermove';canvas.dispatchEvent(new PointerEvent(type,{pointerId:718,pointerType:'pen',isPrimary:true,pressure:.55,buttons:type==='pointerup'?0:1,clientX:r.left+r.width*points[j][0],clientY:r.top+r.height*points[j][1],bubbles:true,cancelable:true}));}
  },
  open(action){check(signal);NotaDeskMenu.close(false);actions[action]?.();},
  item(){return editorItem||state.items.at(-1);},
  get count(){return count;}
 };return fields;
}
function makeDesk(){const workspace={id:'tour-practice',name:'Practice desk',description:'A place to try the examples',icon:'sparkles',color:'#9dad7e'};const fresh={format:'nth-nota',version:1,active:workspace.id,workspaces:[workspace],items:[],settings:structuredClone(source.state.settings||{}),assistantConversations:{},aiReports:[]};state=fresh;currentView='all';listView=false;zoom=1;selected=new Set();$('#search').value='';$('.desk')?.classList.remove('fullscreen');render();addItem('note',{title:'A little room to begin',html:'<p>A few ideas for a quiet weekend.</p>',x:16,y:16});addItem('task',{title:'Weekend plans',tasks:[{id:uid(),text:'Pack a notebook',done:false},{id:uid(),text:'Find a new walking route',done:false}],x:397,y:16});addItem('note',{title:'One small thought',html:'<p>A note can grow into a plan, a drawing, or a connected idea.</p>',x:778,y:16});$('#board-scroll').scrollTo(0,0);}
function capture(){const before=editorItem&&JSON.stringify({...editorItem,updated:undefined}),updated=editorItem?.updated;activeEditor?.();if(editorItem&&before===JSON.stringify({...editorItem,updated:undefined}))editorItem.updated=updated;const fragment=document.createDocumentFragment(),s={state,currentView,zoom,listView,selected,activeEditor,mediaCleanup,editorItem,editorField,suspendedEditor,fragment,focus:document.activeElement,search:$('#search').value,deskClass:$('.desk').className,boardStyle:$('#board').getAttribute('style'),scroll:[$('#board-scroll').scrollLeft,$('#board-scroll').scrollTop],saveHTML:$('#save-state').innerHTML,menu:NotaDeskMenu.isOpen(),inert:[]};document.querySelectorAll('audio,video').forEach(el=>el.pause());fragment.append(...$('#modal-root').childNodes);suspendedEditor?.fragment.remove();activeEditor=null;mediaCleanup=null;editorItem=null;editorField=null;suspendedEditor=null;NotaDeskMenu.close(false);for(const el of document.body.children){if(el===dialog||el.tagName==='SCRIPT'||el.tagName==='DIALOG')continue;s.inert.push([el,el.inert]);el.inert=true;}return s;}
function releaseInert(){for(const [el,value]of source?.inert||[])el.inert=value;}
function containServices(){const reject=()=>Promise.reject(Error('Finish the practice tour to use this with your own work.')),quiet=()=>{};for(const key of ['syncReminders','mergeNativeReminders','microphone','alerts','permissionSettings','allowCloud','read','stopRead','localRequest','cloudRequest','reportAI','exportBlob']){methods.push([key,NotaPlatform[key]]);NotaPlatform[key]=['localRequest','cloudRequest','reportAI','exportBlob'].includes(key)?reject:quiet;}}
function stop({notify=true}={}){if(!active())return;generation++;controller?.abort();controller=null;const s=source,callback=onFinish;onFinish=null;if(sandboxed()){document.querySelectorAll('.choice-overlay').forEach(el=>el.remove());closeModal();}for(const [key,value]of methods)NotaPlatform[key]=value;methods=[];NotaDeskMenu.close(false);if(s){state=s.state;currentView=s.currentView;zoom=s.zoom;listView=s.listView;selected=s.selected;$('#search').value=s.search;$('.desk').className=s.deskClass;releaseInert();render();if(s.boardStyle===null)$('#board').removeAttribute('style');else $('#board').setAttribute('style',s.boardStyle);$('#modal-root').append(s.fragment);activeEditor=s.activeEditor;mediaCleanup=s.mediaCleanup;editorItem=s.editorItem;editorField=s.editorField;suspendedEditor=s.suspendedEditor;if(suspendedEditor)document.body.append(suspendedEditor.fragment);$('#save-state').innerHTML=s.saveHTML;$('#board-scroll').scrollTo(...s.scroll);s.focus?.isConnected&&s.focus.focus({preventScroll:true});}source=null;phase='idle';trying=false;ready=false;complete=false;intro=false;pending=null;mover?.reset();dialog?.close();document.body.classList.remove('tour-demo-active');if(notify)callback?.();}

function current(){return chapters()[chapter];}
function target(){if(intro)return $('#demo-grip');const selector=pending?.selector||current()?.steps[step]?.target;const el=selector?[...document.querySelectorAll(selector)].find(el=>el.getClientRects().length&&!el.closest('[hidden]')):null;return el;}
function position(scroll=false){
 if(!active()||!dialog?.open)return;
 const card=$('#demo-card'),spot=$('#demo-spot'),anchor=target(),v=NotaTourPanel.viewport(),pad=10;
 card.style.maxHeight=Math.max(130,v.h-pad*2)+'px';
 if(scroll&&anchor&&!intro)anchor.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
 const r=anchor?.getBoundingClientRect();let ch=card.offsetHeight,left=v.x+(v.w-card.offsetWidth)/2,top=v.y+v.h-ch-pad;
 if(r&&!intro){const above=r.top-v.y-pad*2,below=v.y+v.h-r.bottom-pad*2,available=Math.max(above,below);if(available>=160&&available<ch){card.style.maxHeight=available+'px';ch=card.offsetHeight;}if(above>=ch)top=r.top-ch-pad;else if(below>=ch)top=r.bottom+pad;
  const x=Math.max(v.x+3,r.left-3),y=Math.max(v.y+3,r.top-3),right=Math.min(v.x+v.w-3,r.right+3),bottom=Math.min(v.y+v.h-3,r.bottom+3);Object.assign(spot.style,{left:x+'px',top:y+'px',width:Math.max(0,right-x)+'px',height:Math.max(0,bottom-y)+'px'});spot.hidden=right<=x||bottom<=y;
 }else spot.hidden=true;
 mover.place(left,top);NotaTourPanel.point($('#demo-pointer'),anchor);
}
function renderCoach(){
 wire();const scene=current(),page=scene?.steps[step],p=pending;
 $('#demo-area').textContent=scene?.label||'Guided walkthrough';$('#demo-chapter').value=scene?.id||'';
 $('#demo-progress').textContent=intro?'Start here':(chapter+1)+' / '+chapters().length+' · Step '+(step+1)+' / '+(scene?.steps.length||1);
 $('#demo-title').textContent=phase==='preparing'?'Preparing your practice desk…':intro?'Move this tutor wherever it helps.':complete?'Ready for your own ideas.':page?.title||'A guided walkthrough';
 $('#demo-copy').textContent=error||(intro?'Drag the three lines at the top to move this see-through panel. Keep the writing and buttons in view. The green double circle shows where to interact.':complete?'Revisit a chapter, or finish the tour to return to your own work.':page?.copy||'');
 $('#demo-task').textContent=!p?'':p.kind==='type'?'Write in '+label($(p.selector)||p.el)+', then choose Next.':p.kind==='choose'?'Choose an option in '+label($(p.selector)||p.el)+', then choose Next.':p.kind==='stroke'?'Make your own mark, then choose Next.':'Tap '+label($(p.selector)||p.el)+'.';
 $('#demo-example').textContent=p?.suggestion?(p.kind==='type'?'Try typing: ':p.kind==='choose'?'Try choosing: ':'')+p.suggestion:'';
 $('#demo-state').textContent=phase==='preparing'?'Keeping your current work in place.':error?'Choose Retry step to try again.':intro?'Move the tutor, then choose Next to begin.':trying?'Practice freely · Back to tour restores these instructions.':p?'Your words and choices · no automatic typing.':ready?'Take your time · choose Next when you’re ready':'Preparing the next interaction…';
 $('#demo-next').textContent=error?'Retry step':'Next';$('#demo-next').disabled=phase==='preparing'||!ready||complete;
 $('#demo-back').disabled=phase==='preparing'||intro||chapter===0&&step===0&&actionIndex<=0;
 $('#demo-try').disabled=phase==='preparing'||intro;$('#demo-try').textContent=trying?'Back to tour':'Try it';$('#demo-exit').textContent=complete?'Finish tour':'Exit tour';$('#demo-pace').textContent=pace+'×';
 dialog.style.setProperty('--tutor-pulse',(1.8/pace)+'s');dialog.classList.toggle('demo-trying',trying);if(!dialog.open)dialog.show();requestAnimationFrame(()=>position());
}
async function run({rebuild=false,startAt=0}={}){
 const token=++generation;controller?.abort();controller=new AbortController();const signal=controller.signal;ready=false;error='';complete=false;pending=null;actionIndex=-1;actionCount=0;
 try{
  if(rebuild){closeModal();makeDesk();await current().enter(context(signal,true));for(let i=0;i<step;i++){check(signal);await current().steps[i].run?.(context(signal,true,false,0,i));}}
  check(signal);renderCoach();position(true);const ctx=context(signal,false,true,startAt);await current().steps[step].run?.(ctx);check(signal);if(token!==generation)return;
  actionCount=ctx.count;actionIndex=actionCount-1;totals.set(current().id+':'+step,actionCount);finished.add(current().id+':'+step);ready=true;pending=null;renderCoach();position(true);
 }catch(e){if(e.name==='AbortError'||token!==generation)return;ready=true;pending=null;error='This step could not finish. Choose Retry step, go Back, or choose another chapter.';console.warn('Tour example:',current()?.id,step,e.message);renderCoach();}
}
function pause({tryIt=false}={}){if(!sandboxed())return;trying=tryIt;renderCoach();position(false);}
async function next(){
 if(!sandboxed()||!ready||complete)return;
 if(intro){intro=false;trying=false;run({rebuild:true});return;}
 if(error){run({rebuild:true});return;}
 if(pending){const p=pending;if(p.kind==='click'){const el=$(p.selector);if(!el||el.disabled){toast('Complete the fields for this control first, or use Back.');return;}exampleClick=true;try{el.click();}finally{exampleClick=false;}queueMicrotask(()=>finishAction(p));}else finishAction(p);return;}
 trying=false;if(step+1<current().steps.length){step++;run();return;}if(chapter+1<chapters().length){chapter++;step=0;run({rebuild:true});return;}complete=true;renderCoach();
}
async function previous(){
 if(!sandboxed()||intro)return;trying=false;let at=pending?actionIndex-1:actionIndex;
 if(at>=0){run({rebuild:true,startAt:at});return;}
 if(step)step--;else if(chapter){chapter--;step=current().steps.length-1;}if(!finished.has(current().id+':'+step))step=0;
 run({rebuild:true,startAt:Math.max(0,(totals.get(current().id+':'+step)||1)-1)});
}
async function seek(id,index=0){
 const found=chapters().findIndex(c=>c.id===id);if(!sandboxed()||found<0)return false;intro=false;trying=false;chapter=found;step=Math.max(0,Math.min(current().steps.length-1,index));
 for(let i=0;i<step;i++)if(!finished.has(id+':'+i)){step=0;break;}run({rebuild:true});return true;
}
async function start({chapter:id='desk',onFinish:finishedCallback}={}){
 id=resolve(id);if(active()||!chapters().some(c=>c.id===id))return false;
 if(document.hidden||document.querySelector('.choice-overlay')||editorLoading||$('#record-start:disabled')||$('#record-stop:not(:disabled)')||$('#ai-stop:not(:disabled)')||$('#photo-stop:not([hidden])')||$('#handwrite-stop:not([hidden])')||$('#scan-cancel:not([hidden])')||$('#mode-done:disabled')){toast('Finish the current recording, reply or document preparation, then open the tutor.');return false;}
 wire();mover.reset();answers.clear();totals.clear();finished.clear();phase='preparing';chapter=chapters().findIndex(c=>c.id===id);step=0;trying=false;complete=false;intro=true;error='';onFinish=finishedCallback;const token=++generation;source=capture();document.body.classList.add('tour-demo-active');renderCoach();
 try{await persistDesk();if(token!==generation||!active())return false;source.saveHTML=$('#save-state').innerHTML;releaseInert();containServices();phase='running';makeDesk();ready=true;renderCoach();position();return true;}catch(e){stop({notify:false});toast('The tutor could not start. Your work is still here.');return false;}
}
function wire(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.id='nota-demo';dialog.className='nota-demo';dialog.setAttribute('aria-label','Practice tutor');
 dialog.innerHTML='<div id="demo-spot" class="demo-spot" aria-hidden="true" hidden></div><span id="demo-pointer" class="tutor-target" aria-hidden="true" hidden></span><section id="demo-card" class="demo-card"><header><span id="demo-area"></span><button id="demo-grip" class="tutor-grip" aria-label="Move tutorial. Use arrow keys to reposition; Home resets position.">'+NotaTourPanel.grip+'</button><span id="demo-progress"></span><button id="demo-pace" aria-label="Change target highlight speed">1×</button></header><label class="demo-chapter-label">Jump to a tool<select id="demo-chapter" aria-label="Walkthrough chapter"></select></label><h2 id="demo-title"></h2><p id="demo-copy"></p><p id="demo-task" aria-live="polite"></p><p id="demo-example" class="tutor-example"></p><p id="demo-state" role="status"></p><div class="demo-actions"><button id="demo-back" class="secondary">Back</button><button id="demo-next" class="primary">Next</button><button id="demo-try" class="secondary">Try it</button><button id="demo-exit" class="secondary">Exit tour</button></div><small class="demo-practice-label">Practice only · your own notes stay as they are</small></section>';
 document.body.append(dialog);mover=NotaTourPanel.movable($('#demo-card'),$('#demo-grip'),{onMove:()=>position()});
 $('#demo-chapter').innerHTML=chapters().map(c=>'<option value="'+c.id+'">'+c.label+'</option>').join('');$('#demo-chapter').onchange=e=>seek(e.target.value);$('#demo-back').onclick=previous;$('#demo-next').onclick=next;$('#demo-try').onclick=()=>pause({tryIt:!trying});$('#demo-exit').onclick=()=>stop();$('#demo-pace').onclick=()=>{pace=pace===1?1.5:pace===1.5?.75:1;renderCoach();};
 dialog.addEventListener('cancel',e=>{e.preventDefault();stop();});dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();stop();}});
 const forbidden='#scan-camera,#scan-import,#scan-browser-camera,#photo-pick,#photo-extract,#audio-transcribe,[data-card-action=transcribe],#handwrite-convert,#handwrite-auto,#transcript-start,#record-start,#cloud-setting,#context-tips,#permission-mic,#permission-cloud,#permission-notifications,#permission-system,#rem-permission,#pin-permission,#task-alert-permission-button,#open-permissions,#open-privacy,#permission-privacy,#privacy-backup,#privacy-delete,#delete-local-go,#delete-local-data-go,#restore-confirm,#restore-backup,#save-backup,#restore-input,#file-input,#photo-export-source,[data-action=import],[data-action=backup],[data-action=privacy],[data-action=settings],a[href^="http"]';
 document.addEventListener('click',e=>{
  if(!sandboxed()||dialog.contains(e.target))return;
  if(e.target.closest(forbidden)){e.preventDefault();e.stopImmediatePropagation();toast('Finish the practice tour to use this with your own work.');return;}
  const p=pending;if(!exampleClick&&p?.kind==='click'&&e.composedPath().some(el=>el.matches?.(p.selector)))setTimeout(()=>finishAction(p),0);
 },true);
 document.addEventListener('input',e=>{if(e.isTrusted&&sandboxed()&&!dialog.contains(e.target)){edited.add(e.target);position();}},true);
 const strokePoint=e=>{const p=pending;if(p?.kind!=='stroke')return;const el=$(p.selector);if(!el)return;const r=el.getBoundingClientRect();p.points.push([Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]);};
 let drawingPointer=null;document.addEventListener('pointerdown',e=>{if(pending?.kind==='stroke'&&e.target.matches(pending.selector)){drawingPointer=e.pointerId;strokePoint(e);}},true);document.addEventListener('pointermove',e=>{if(e.pointerId===drawingPointer)strokePoint(e);},true);document.addEventListener('pointerup',e=>{if(e.pointerId===drawingPointer){strokePoint(e);drawingPointer=null;}},true);
 document.addEventListener('keydown',e=>{if(active()&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stop();}},true);
 window.addEventListener('resize',()=>position());window.visualViewport?.addEventListener('resize',()=>position());window.visualViewport?.addEventListener('scroll',()=>position());document.addEventListener('scroll',()=>position(),true);
 let queued=false;const refresh=()=>{if(queued||!active())return;queued=true;requestAnimationFrame(()=>{queued=false;position();});};const observer=new MutationObserver(refresh);observer.observe($('#modal-root'),{childList:true,subtree:true});observer.observe($('#board'),{childList:true,subtree:true});
}
window.NotaTourDemo={start,stop,pause,next,previous,seek,has:id=>chapters().some(c=>c.id===resolve(id)),get active(){return active();},get sandboxed(){return sandboxed();},get state(){return {phase,active:active(),chapter:current()?.id,chapterIndex:chapter,step,intro,trying,ready,complete,error,interaction:pending?{kind:pending.kind,selector:pending.selector,suggestion:pending.suggestion,choiceValue:pending.choiceValue,index:pending.index}:null};}};
})();
