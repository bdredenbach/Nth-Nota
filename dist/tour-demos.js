/* A manual practice tutor: the person writes and operates the real controls. */
(function(){'use strict';
const $=s=>document.querySelector(s),abortError=()=>new DOMException('Walkthrough stopped','AbortError');
let phase='idle',source=null,dialog=null,chapter=0,step=0,trying=false,ready=false,complete=false,intro=false,error='',generation=0,controller=null,onFinish=null,methods=[],pace=1,exampleClick=false,pending=null,mover=null,actionIndex=-1,actionCount=0,follower=null,recoveryMode='',instructionKey='',freeTarget=null;
const answers=new Map(),totals=new Map(),finished=new Set(),edited=new WeakSet();
const resolve=id=>({audio:'voice',alerts:'tasks'})[id]||id;
const chapters=()=>window.NotaTourScenes||[],active=()=>phase!=='idle',sandboxed=()=>phase==='running';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function wait(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(abortError());return;}const done=()=>{signal.removeEventListener('abort',cancel);resolve();},id=setTimeout(done,ms),cancel=()=>{clearTimeout(id);signal.removeEventListener('abort',cancel);reject(abortError());};signal.addEventListener('abort',cancel,{once:true});});}
function check(signal){if(signal.aborted||!sandboxed())throw abortError();}
const valueOf=el=>el?.isContentEditable?el.innerText:el?.value??'';
function write(selector,value){const el=$(selector);if(!el)throw Error('The practice field is not available.');if(el.isContentEditable)el.textContent=value;else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return $(selector)||el;}
function label(el){const named=el?.getAttribute('aria-label')||el?.labels?.[0]?.textContent||el?.closest('label')?.textContent;const writing=el?.matches('input,textarea,[contenteditable=true]');return (named||(writing?(el.id==='note-editor'?'the note body':'the highlighted field'):el?.innerText)||'the highlighted control').trim().replace(/\s+/g,' ').slice(0,100);}
function requestAction(signal,{kind,selector,suggestion='',key,index,choiceValue='',points=[],moved=false,color=''}){
 check(signal);return new Promise((resolve,reject)=>{
  const el=$(selector);if(!el){reject(Error('The highlighted control is not available.'));return;}
  const p={kind,selector,suggestion,key,index,choiceValue,el,points:points.map(point=>[...point]),moved,color,resolve,reject,signal,abort:null};
  p.abort=()=>{if(pending===p)pending=null;reject(abortError());};signal.addEventListener('abort',p.abort,{once:true});pending=p;actionIndex=index;actionCount=index+1;ready=true;
  renderCoach();position(true);
 });
}
function rememberAction(p,el=$(p?.selector)||p?.el){
 if(!p||p.signal.aborted)return;const entry={kind:p.kind,selector:p.selector,value:valueOf(el),points:p.points.map(point=>[...point])};
 if(p.kind==='choose')entry.label=el?.selectedOptions?.[0]?.textContent||'';
 if(p.kind==='color')entry.value=p.color;
 if(p.kind==='drag'){const n=state.items.find(n=>n.id===el?.closest('.card')?.dataset.id);if(n)entry.position={x:n.x,y:n.y};entry.moved=p.moved;}
 answers.set(p.key,entry);
}
function rememberDraft(){if(pending&&pending.kind!=='click')rememberAction(pending);}
function finishAction(p){
 if(!p||pending!==p||p.signal.aborted)return;rememberAction(p);pending=null;p.signal.removeEventListener('abort',p.abort);ready=false;p.resolve();renderCoach();
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
   else if(el.type!=='number'&&!edited.has(el)&&![...answers].some(([k,a])=>k.startsWith(current().id+':')&&a.selector===selector))el=write(selector,'');
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
   check(signal);const i=count++,key=keyFor(i),canvas=$(selector),points=answers.get(key)?.points||[];if(!canvas)throw Error('The drawing surface is not available.');
   for(let j=0;j<points.length;j++){const p=points[j],r=canvas.getBoundingClientRect(),type=p[2]||(j===0?'pointerdown':j===points.length-1?'pointerup':'pointermove');canvas.dispatchEvent(new PointerEvent(type,{pointerId:718,pointerType:p[3]||'pen',isPrimary:true,pressure:p[4]??.55,buttons:type==='pointerup'||type==='pointercancel'?0:1,clientX:r.left+r.width*p[0],clientY:r.top+r.height*p[1],bubbles:true,cancelable:true}));}
   if(interactive&&i>=startAt)await requestAction(signal,{kind:'stroke',selector,suggestion:'Draw a line or write a word here. Choose Next when you’re finished.',key,index:i,points});
  },
  async move(selector){
   check(signal);const i=count++,key=keyFor(i),saved=answers.get(key),el=$(selector),n=state.items.find(n=>n.id===el?.closest('.card')?.dataset.id);if(!n)throw Error('The practice card is not available.');
   if(saved?.position){Object.assign(n,saved.position);renderBoard();}
   if(interactive&&i>=startAt)await requestAction(signal,{kind:'drag',selector,key,index:i,moved:!!saved?.moved});
  },
  async color(){
   check(signal);const i=count++,key=keyFor(i),saved=answers.get(key),selector=saved?.value?'.swatches [data-color="'+saved.value+'"]':'.swatches [data-color="blue"]';
   if(saved?.value){const el=$(selector);if(!el)throw Error('The paper colors are not available.');el.click();}
   if(interactive&&i>=startAt)await requestAction(signal,{kind:'color',selector,key,index:i,color:saved?.value||''});
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
function clearChoices(){document.querySelectorAll('.choice-overlay').forEach(el=>{el.querySelector('[data-choice-cancel]')?.click();if(el.isConnected)el.remove();});}
function stop({notify=true}={}){if(!active())return;generation++;controller?.abort();controller=null;const s=source,callback=onFinish;onFinish=null;if(sandboxed()){clearChoices();closeModal();}for(const [key,value]of methods)NotaPlatform[key]=value;methods=[];NotaDeskMenu.close(false);if(s){state=s.state;currentView=s.currentView;zoom=s.zoom;listView=s.listView;selected=s.selected;$('#search').value=s.search;$('.desk').className=s.deskClass;releaseInert();render();if(s.boardStyle===null)$('#board').removeAttribute('style');else $('#board').setAttribute('style',s.boardStyle);$('#modal-root').append(s.fragment);activeEditor=s.activeEditor;mediaCleanup=s.mediaCleanup;editorItem=s.editorItem;editorField=s.editorField;suspendedEditor=s.suspendedEditor;if(suspendedEditor)document.body.append(suspendedEditor.fragment);$('#save-state').innerHTML=s.saveHTML;$('#board-scroll').scrollTo(...s.scroll);s.focus?.isConnected&&s.focus.focus({preventScroll:true});}source=null;phase='idle';trying=false;ready=false;complete=false;intro=false;pending=null;freeTarget=null;follower?.stop();recoveryMode='';mover?.reset();dialog?.close();document.body.classList.remove('tour-demo-active');if(notify)callback?.();}

function current(){return chapters()[chapter];}
function guidance(){
 const found=NotaTourPanel.find,choice=found('.choice-overlay [data-choice-cancel]'),menu=NotaDeskMenu.isOpen(),modal=$('.modal');
 if(intro)return {anchor:$('#demo-grip'),mode:''};if(complete)return {anchor:$('#demo-exit'),mode:''};if(error)return {anchor:$('#demo-next'),mode:''};
 if(pending){
  if(pending.activating)return {anchor:null,mode:''};
  const raw=$(pending.selector),anchor=found(pending.selector),inMenu=raw?.closest('#desk-launcher');
  if(choice){if(anchor?.closest('.choice-overlay'))return {anchor,mode:''};return {anchor:choice,mode:'choice'};}
  if(menu&&!inMenu&&raw?.id!=='desk-menu-toggle')return {anchor:found('#desk-menu-toggle'),mode:'close-menu'};
  if(modal&&!raw?.closest('.modal')&&!(menu&&(inMenu||raw?.id==='desk-menu-toggle')))return {anchor:found('#close-modal'),mode:'close-editor'};
  if(inMenu&&!menu)return {anchor:found('#desk-menu-toggle'),mode:'open-menu'};
  if(anchor)return {anchor,mode:''};return {anchor:$('#demo-next'),mode:'return-step'};
 }
 let anchor=ready?(NotaTourPanel.available(freeTarget)?freeTarget:found(current()?.steps[step]?.target)):null;
 if(choice||menu&&anchor?.id!=='desk-menu-toggle'&&!anchor?.closest('#desk-launcher')||modal&&anchor&&!anchor.closest('.modal'))anchor=null;
 return {anchor:anchor|| (ready?$('#demo-next'):null),mode:''};
}
function target(){return guidance().anchor;}
const recoveryText={
 'open-menu':'Open Desk again to continue this search. Your wording is kept.',
 'close-menu':'Close Desk to return to the highlighted control.',
 'close-editor':'Close this editor to return to the current instruction.',
 choice:'Finish this choice, or cancel it to return to the current instruction.',
 'return-step':'This control was closed or changed. Return to this instruction to continue with your wording.'
};
const recoveryLabel={'open-menu':'Open Desk','close-menu':'Close Desk','close-editor':'Close editor',choice:'Cancel choice','return-step':'Return to step'};
function position(scroll=false){
 if(!active()||!dialog?.open)return;
 const view=guidance();if(view.mode!==recoveryMode)renderCoach();const explanation=$('#demo-scroll'),explanationTop=explanation.scrollTop,card=$('#demo-card'),spot=$('#demo-spot'),anchor=view.anchor,v=NotaTourPanel.viewport(),pad=10,selfTarget=anchor&&card.contains(anchor);
 card.style.maxHeight=Math.max(130,v.h-pad*2)+'px';
 if(scroll&&anchor&&!intro&&!selfTarget)anchor.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
 let r=anchor?.getBoundingClientRect(),floor=v.y+v.h;const inMenu=anchor?.closest('#desk-launcher');
 // Keep the menu header, its close button and the Desk bar clear as search
 // changes the sheet's height. The marker still follows the actual field.
 if(r&&inMenu){const head=$('.launcher-head')?.getBoundingClientRect();if(head)r={top:Math.min(r.top,head.top),bottom:Math.max(r.bottom,head.bottom)};floor=Math.min(floor,$('.desk-taskbar').getBoundingClientRect().top);}
 let ch=card.offsetHeight,left=v.x+(v.w-card.offsetWidth)/2,top=v.y+v.h-ch-pad;
 if(r&&!intro&&!selfTarget){const above=r.top-v.y-pad*2,below=floor-r.bottom-pad*2,available=Math.max(above,below);if(available>=(inMenu?130:160)&&available<ch){card.style.maxHeight=available+'px';ch=card.offsetHeight;}if(above>=ch)top=r.top-ch-pad;else if(below>=ch)top=r.bottom+pad;
 }
 NotaTourPanel.outline(spot,anchor);
 ({left,top}=NotaTourPanel.avoid(card,anchor,mover,left,top));mover.place(left,top);NotaTourPanel.point($('#demo-pointer'),anchor);if(explanation.scrollTop!==explanationTop)explanation.scrollTop=explanationTop;
}
function renderCoach(){
 wire();const scene=current(),page=scene?.steps[step],p=pending,view=guidance();recoveryMode=view.mode;
 $('#demo-area').textContent=scene?.label||'Guided walkthrough';$('#demo-chapter').value=scene?.id||'';
 $('#demo-progress').textContent=intro?'Start here':(chapter+1)+' / '+chapters().length+' · Step '+(step+1)+' / '+(scene?.steps.length||1);
 $('#demo-title').textContent=phase==='preparing'?'Preparing your practice desk…':intro?'Move this tutor wherever it helps.':complete?'Ready for your own ideas.':page?.title||'A guided walkthrough';
 $('#demo-copy').textContent=error||(intro?'Drag the three lines at the top to move this see-through panel. Keep the writing and buttons in view. The green double circle shows where to interact.':complete?'Revisit a chapter, or finish the tour to return to your own work.':page?.copy||'');
 $('#demo-task').textContent=recoveryText[view.mode]||(!p?'':p.kind==='type'?'Write in '+label($(p.selector)||p.el)+', then choose Next.':p.kind==='choose'?'Choose an option in '+label($(p.selector)||p.el)+', then choose Next.':p.kind==='stroke'?'Make your own mark, then choose Next.':p.kind==='drag'?(p.moved?'Card moved. Choose Next when you’re ready.':'Drag this card by the three lines in its title bar.'):p.kind==='color'?(p.color?'Your color is selected. Choose Next when you’re ready.':'Choose any paper color in the row, then choose Next.'):'Tap '+label($(p.selector)||p.el)+'.');
 $('#demo-example').textContent=!view.mode&&p?.suggestion?(p.kind==='type'?'Try typing: ':p.kind==='choose'?'Try choosing: ':'')+p.suggestion:'';
 $('#demo-state').textContent=phase==='preparing'?'Keeping your current work in place.':error?'Choose Retry step to try again.':intro?'Move the tutor, then choose Next to begin.':trying?'Practice freely · Back to tour restores these instructions.':p?'':ready?'Take your time · choose Next when you’re ready':'Preparing the next interaction…';
 const nextInstruction=[chapter,step,intro,complete,error,p?.key||'',view.mode].join('|');if(nextInstruction!==instructionKey){$('#demo-scroll').scrollTop=0;instructionKey=nextInstruction;}
 $('#demo-next').textContent=error?'Retry step':recoveryLabel[view.mode]||'Next';$('#demo-next').disabled=phase==='preparing'||!ready||complete||!view.mode&&!!p&&(p.kind==='drag'&&!p.moved||p.kind==='color'&&!p.color);
 $('#demo-back').disabled=phase==='preparing'||intro||chapter===0&&step===0&&actionIndex<=0;
 $('#demo-try').disabled=phase==='preparing'||intro;$('#demo-try').textContent=trying?'Back to tour':'Try it';$('#demo-exit').textContent=complete?'Finish tour':'Exit tour';$('#demo-pace').textContent=pace+'×';
 dialog.style.setProperty('--tutor-pulse',(1.8/pace)+'s');dialog.classList.toggle('demo-trying',trying);if(!dialog.open)dialog.show();follower.start();requestAnimationFrame(()=>position());
}
async function run({rebuild=false,startAt=0}={}){
 rememberDraft();const token=++generation;controller?.abort();controller=new AbortController();const signal=controller.signal;ready=false;error='';complete=false;pending=null;freeTarget=null;actionIndex=-1;actionCount=0;
 try{
  if(rebuild){clearChoices();closeModal();makeDesk();await current().enter(context(signal,true));for(let i=0;i<step;i++){check(signal);await current().steps[i].run?.(context(signal,true,false,0,i));}}
  check(signal);renderCoach();position(true);const ctx=context(signal,false,true,startAt);await current().steps[step].run?.(ctx);check(signal);if(token!==generation)return;
  actionCount=ctx.count;actionIndex=actionCount-1;totals.set(current().id+':'+step,actionCount);finished.add(current().id+':'+step);ready=true;pending=null;renderCoach();position(true);
 }catch(e){if(e.name==='AbortError'||token!==generation)return;ready=true;pending=null;error='This step could not finish. Choose Retry step, go Back, or choose another chapter.';console.warn('Tour example:',current()?.id,step,e.message);renderCoach();}
}
function pause({tryIt=false}={}){if(!sandboxed())return;trying=tryIt;renderCoach();position(false);}
async function next(){
 if(!sandboxed()||!ready||complete)return;
 if(intro){intro=false;trying=false;run({rebuild:true});return;}
 if(error){run({rebuild:true});return;}
 const view=guidance();if(view.mode){if(view.mode==='return-step')run({rebuild:true,startAt:Math.max(0,actionIndex)});else view.anchor?.click();return;}
 if(pending){const p=pending;if(p.kind==='drag'&&!p.moved||p.kind==='color'&&!p.color)return;if(p.kind==='click'){const el=$(p.selector);if(!el||el.disabled){toast('Complete the fields for this control first, or use Back.');return;}p.activating=true;ready=false;renderCoach();exampleClick=true;try{el.click();}finally{exampleClick=false;}queueMicrotask(()=>finishAction(p));}else finishAction(p);return;}
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
 if(!window.NotaTour?.fullToursEnabled)return false;
 id=resolve(id);if(active()||!chapters().some(c=>c.id===id))return false;
 if(document.hidden||document.querySelector('.choice-overlay')||editorLoading||$('#record-start:disabled')||$('#record-stop:not(:disabled)')||$('#ai-stop:not(:disabled)')||$('#photo-stop:not([hidden])')||$('#handwrite-stop:not([hidden])')||$('#scan-cancel:not([hidden])')||$('#mode-done:disabled')){toast('Finish the current recording, reply or document preparation, then open the tutor.');return false;}
 wire();mover.reset();instructionKey='';answers.clear();totals.clear();finished.clear();phase='preparing';chapter=chapters().findIndex(c=>c.id===id);step=0;trying=false;complete=false;intro=true;error='';onFinish=finishedCallback;const token=++generation;source=capture();document.body.classList.add('tour-demo-active');renderCoach();
 try{await persistDesk();if(token!==generation||!active())return false;source.saveHTML=$('#save-state').innerHTML;releaseInert();containServices();phase='running';makeDesk();ready=true;renderCoach();position();return true;}catch(e){stop({notify:false});toast('The tutor could not start. Your work is still here.');return false;}
}
function wire(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.id='nota-demo';dialog.className='nota-demo';dialog.setAttribute('aria-label','Practice tutor');
 dialog.innerHTML='<div id="demo-spot" class="demo-spot" aria-hidden="true" hidden></div><span id="demo-pointer" class="tutor-target" aria-hidden="true" hidden></span><section id="demo-card" class="demo-card"><header><span id="demo-area"></span><button id="demo-grip" class="tutor-grip" aria-label="Move tutorial. Use arrow keys to reposition; Home resets position.">'+NotaTourPanel.grip+'</button><span id="demo-progress"></span><button id="demo-pace" aria-label="Change target highlight speed">1×</button></header><div id="demo-scroll" class="demo-scroll"><label class="demo-chapter-label">Jump to a tool<select id="demo-chapter" aria-label="Walkthrough chapter"></select></label><h2 id="demo-title"></h2><p id="demo-copy"></p><p id="demo-task" aria-live="polite"></p><p id="demo-example" class="tutor-example"></p><p id="demo-state" role="status"></p></div><div class="demo-actions"><button id="demo-back" class="secondary">Back</button><button id="demo-next" class="primary">Next</button><button id="demo-try" class="secondary">Try it</button><button id="demo-exit" class="secondary">Exit tour</button></div><small class="demo-practice-label">Practice Only - Does not save</small></section>';
 document.body.append(dialog);follower=NotaTourPanel.follow(()=>active()&&dialog.open,()=>[target(),$('#demo-card'),guidance().mode],()=>position());mover=NotaTourPanel.movable($('#demo-card'),$('#demo-grip'),{onMove:()=>position()});
 $('#demo-chapter').innerHTML=chapters().map(c=>'<option value="'+c.id+'">'+c.label+'</option>').join('');$('#demo-chapter').onchange=e=>seek(e.target.value);$('#demo-back').onclick=previous;$('#demo-next').onclick=next;$('#demo-try').onclick=()=>pause({tryIt:!trying});$('#demo-exit').onclick=()=>stop();$('#demo-pace').onclick=()=>{pace=pace===1?1.5:pace===1.5?.75:1;renderCoach();};
 dialog.addEventListener('cancel',e=>{e.preventDefault();stop();});dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();stop();}});
 const forbidden='#scan-camera,#scan-import,#scan-browser-camera,#photo-pick,#photo-extract,#audio-transcribe,[data-card-action=transcribe],#handwrite-convert,#handwrite-auto,#transcript-start,#record-start,#cloud-setting,#context-tips,#permission-mic,#permission-cloud,#permission-notifications,#permission-system,#rem-permission,#pin-permission,#task-alert-permission-button,#open-permissions,#open-privacy,#permission-privacy,#privacy-backup,#privacy-delete,#delete-local-go,#delete-local-data-go,#restore-confirm,#restore-backup,#save-backup,#restore-input,#file-input,#photo-export-source,[data-action=import],[data-action=backup],[data-action=privacy],[data-action=settings],a[href^="http"]';
 document.addEventListener('click',e=>{
  if(!sandboxed()||dialog.contains(e.target))return;
  if(e.target.closest(forbidden)){e.preventDefault();e.stopImmediatePropagation();toast('Finish the practice tour to use this with your own work.');return;}
  const p=pending;if(p?.kind==='color'){const button=e.target.closest('.swatches [data-color]');if(button){p.color=button.dataset.color;p.selector='.swatches [data-color="'+p.color+'"]';setTimeout(()=>{if(pending===p){rememberAction(p);renderCoach();position();}},0);}}
  if(!exampleClick&&p?.kind==='click'&&e.composedPath().some(el=>el.matches?.(p.selector))){p.activating=true;ready=false;renderCoach();setTimeout(()=>finishAction(p),0);}
 },true);
 document.addEventListener('input',e=>{if(e.isTrusted&&sandboxed()&&!dialog.contains(e.target)){edited.add(e.target);if(pending&&pending.kind!=='click'&&e.target.matches(pending.selector))rememberAction(pending,e.target);position();}},true);
 // After an instruction finishes, make room for the control the person explores.
 // Keep that anchor when focus returns to the guide so Next stays still.
 document.addEventListener('focusin',e=>{if(sandboxed()&&ready&&!pending&&!intro&&!complete&&!dialog.contains(e.target)&&e.target.matches('input,textarea,select,[contenteditable=true]')){freeTarget=e.target;position();}},true);
 document.addEventListener('nota-desk-menu-change',e=>{if(!sandboxed()||pending?.selector!=='#launcher-search')return;if(!e.detail.open)rememberDraft();else{const saved=answers.get(pending.key);if(saved)write(pending.selector,saved.value);}renderCoach();position();});
 const strokePoint=e=>{const p=pending;if(p?.kind!=='stroke')return;const el=$(p.selector);if(!el)return;const r=el.getBoundingClientRect();p.points.push([Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)),e.type,e.pointerType,e.pressure]);};
 let drawingPointer=null;document.addEventListener('pointerdown',e=>{if(pending?.kind==='stroke'&&e.target.matches(pending.selector)){drawingPointer=e.pointerId;strokePoint(e);}},true);document.addEventListener('pointermove',e=>{if(e.pointerId===drawingPointer)strokePoint(e);},true);document.addEventListener('pointerup',e=>{if(e.pointerId===drawingPointer){strokePoint(e);drawingPointer=null;}},true);document.addEventListener('pointercancel',e=>{if(e.pointerId===drawingPointer){strokePoint(e);drawingPointer=null;}},true);
 let movingCard=null;document.addEventListener('pointerdown',e=>{const p=pending,el=p?.kind==='drag'?$(p.selector):null;if(el?.contains(e.target)&&!listView){const n=state.items.find(n=>n.id===el.closest('.card')?.dataset.id);if(n)movingCard={p,id:e.pointerId,n,x:n.x,y:n.y};}},true);
 const cardMoved=e=>{if(!movingCard||movingCard.id!==e.pointerId)return;const move=movingCard;movingCard=null;setTimeout(()=>{if(pending!==move.p)return;if(Math.hypot(move.n.x-move.x,move.n.y-move.y)>8)move.p.moved=true;rememberAction(move.p);renderCoach();position();},0);};document.addEventListener('pointerup',cardMoved,true);document.addEventListener('pointercancel',cardMoved,true);
 document.addEventListener('keydown',e=>{if(active()&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stop();}},true);
 window.addEventListener('resize',()=>position());window.visualViewport?.addEventListener('resize',()=>position());window.visualViewport?.addEventListener('scroll',()=>position());document.addEventListener('scroll',e=>{if(!e.target.closest?.('#nota-demo'))position();},true);
 let queued=false;const refresh=()=>{if(queued||!active())return;queued=true;requestAnimationFrame(()=>{queued=false;position();});};const observer=new MutationObserver(refresh);observer.observe($('#modal-root'),{childList:true,subtree:true});observer.observe($('#board'),{childList:true,subtree:true});
}
window.NotaTourDemo={start,stop,pause,next,previous,seek,has:id=>!!window.NotaTour?.fullToursEnabled&&chapters().some(c=>c.id===resolve(id)),get active(){return active();},get sandboxed(){return sandboxed();},get state(){return {phase,active:active(),chapter:current()?.id,chapterIndex:chapter,step,intro,trying,ready,complete,error,recovery:recoveryMode,interaction:pending?{kind:pending.kind,selector:pending.selector,suggestion:pending.suggestion,choiceValue:pending.choiceValue,index:pending.index}:null};}};
})();
