/* Nth Experience: show the real control, then let people try it. Tour state stays on this device. */
(function(){
'use strict';
const KEY='nota-tour-v2', $=s=>document.querySelector(s);
const tip=(target,title,text,extra={})=>({target,title,text,...extra});
const areas={
 desk:{label:'Your desk',tips:[
  tip('#desk-menu-toggle','A little room to think.','This is your Desk menu. It opens from the bottom, keeping your notes and tools within reach.'),
  tip('.launcher-tools','Your tools live here.','Create a note, sketch, task list or voice note. Find a saved thought with search. The same creation tools also appear inside each note.',{menu:true}),
  tip('#workspace-tabs','Give each idea its own space.','Switch between workspaces here. The + beside the tabs creates another space for a project or collection.'),
  tip('#taskbar-layout','Your desk, two ways.','The app opens in Canvas. Use this switch to browse a list or return to freely movable notes. A toast confirms the view you choose.'),
  tip('#canvas-snap','A little order, whenever you need it.','Snap to grid arranges open notes in a left-aligned column on the canvas. You can still drag them wherever they belong.'),
  tip('.page-heading [data-action=note]','Start with one thought.','New note opens your writing space. Notes save as you type. When you open a tool for the first time, a short tip will show you its controls.'),
  tip('#window-dock','Your notes stay close.','Drag a note by its title bar to arrange it. Minimize puts it in this dock. Close saves it in Saved notes, where Restore brings it back.'),
  tip('.desk-taskbar [data-action=assistant]','Help, when you want it.','The writing companion can proofread, organize or explore an idea with you. Next, choose permissions. You can keep everything optional and change your choices later.')
 ]},
 note:{label:'Writing a note',tips:[
  tip('#note-title','Make this thought yours.','Give your note a title, then write below. Your changes save as you type. Bold, lists, highlighting and readback are just above the page.'),
  tip('.editor-ribbon','More than a page.','Type, Sketch, Ink, Task, Import and Voice create another item on this workspace. Your current note stays saved.'),
  tip('#note-done','Keep it open on your desk.','Save to workspace returns to the canvas with this note open. Minimize keeps it in the dock. The × saves and closes it in Saved notes.',{tryLabel:'Let me write'})
 ]},
 tasks:{label:'Tasks & reminders',tips:[
  tip('#add-task','Turn a thought into a next step.','Add a task, type what needs doing, and tick it when complete. Each task has its own bell for notification choices.'),
  tip('#task-rows,#add-task','Choose which tasks notify you.','A task’s bell can set a timed reminder or an ongoing notification. Allowing notifications does not create an alert; you choose the tasks and timing.',{permission:'notifications',tryLabel:'Let me try a task'})
 ]},
 alerts:{label:'Task notification',tips:[
  tip('.task-alert-options','A reminder that fits this task.','Choose a time, an ongoing notification, or both, then Save. Without a time, an ongoing notification appears now. Android controls delivery and may allow dismissal.',{permission:'notifications',tryLabel:'Choose my reminder'})
 ]},
 voice:{label:'Voice notes',tips:[
  tip('#record-start','Catch a thought out loud.','Allow the microphone if you want voice notes. Recording starts only when you press Start recording. You can record up to two minutes.',{permission:'microphone'}),
  tip('#record-save','Stop, then save to your desk.','After recording, press Stop and Save voice note. The recording appears open on the canvas. Open it to play it, or use Convert to text on supported phones. Your transcript stays inside the same audio note.',{tryLabel:'Let me record'})
 ]},
 drawing:{label:'Drawing & markup',tips:[
  tip('.ink-tools','Make your mark.','Choose a pen, highlighter or eraser. Digital ink varies with finger speed and uses stylus pressure when available. Imported images also offer Rotate, Crop square and B&W.'),
  tip('.drawing-history','Try it. You can step back.','Undo and Redo move through pen strokes and image edits together. Save to workspace returns your drawing to the canvas.',{tryLabel:'Let me draw'})
 ]},
 assistant:{label:'Writing companion',tips:[
  tip('.ai-task-tabs','Choose a helping hand.','Proofread, Polish, Chat & ideas, Draft, Summarize and Organize shape the help you receive. Write a message below, then Send. A reply is a suggestion; your note stays unchanged.'),
  tip('#ai-message','Your words, your choice.','Local AI is tried first. With your consent, Cloudflare or configured Groq can receive your request, selected text or current note context, and recent chat when local AI is unavailable. No message is sent by taking this tour.',{permission:'cloud',tryLabel:'Let me try the companion'})
 ]},
 audio:{label:'Audio & transcript',tips:[tip('#audio-player','Keep the sound and the words together.','Play your recording here. Convert to text creates a transcript inside this same note on supported phones. You can review and edit the words below.',{tryLabel:'Explore this audio note'})]},
 saved:{label:'Saved notes',tips:[
  tip('#saved-list,#saved-search','Closed does not mean gone.','Search your saved notes here. Restore brings a note back to its workspace. The trash button moves it to Recently deleted, where you can recover it.',{tryLabel:'Browse my notes'})
 ]},
 settings:{label:'Make it yours',tips:[
  tip('.theme-picker','A desk that feels like yours.','Choose Paper, Dark paper, Blue or Rosy pink. Below, choose Canvas or List and your navigation style.'),
  tip('#open-permissions','Your choices stay within reach.','Change microphone, notification and cloud AI choices here. Privacy & data includes your policy, backups, AI reports and local data controls. Replay the tour whenever you need it.',{tryLabel:'Explore settings'})
 ]},
 backup:{label:'Backup & restore',tips:[
  tip('#save-backup','Keep a copy outside the app.','Download backup includes your workspaces, notes and attachments. Keep it privately. Restore previews a confirmation before replacing this device’s desk.',{tryLabel:'Choose my backup'})
 ]}
};
let seen=new Set(),enabled=true,area=null,index=0,intro=false,busy=false,remembered=true,timer,dialog,anchor;
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){seen=new Set((s.seen||[]).filter(id=>Object.hasOwn(areas,id)));enabled=s.enabled!==false;}}catch{}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({enabled,seen:[...seen]}));remembered=true;}catch{remembered=false;}}
function currentArea(){
 if($('#permissions-done')||$('#privacy-policy')||$('#report-send')||$('#report-consent')||$('#transcript-text'))return null;
 if($('#audio-transcript'))return 'audio';if($('#task-alert-save'))return 'alerts';if($('#task-title'))return 'tasks';if($('#note-editor'))return 'note';if($('#draw-canvas'))return 'drawing';if($('#record-start'))return 'voice';if($('#ai-message'))return 'assistant';if($('#saved-search'))return 'saved';if($('#layout-setting'))return 'settings';if($('#save-backup'))return 'backup';return null;
}
function blocked(){return !!$('.choice-overlay')||!!$('#ai-progress-dialog:not([hidden])')||!!$('#record-stop:not(:disabled)')||!!$('#record-start:disabled')||!!$('#ai-stop:not(:disabled)')||document.hidden;}
function visible(el){if(!el||!el.getClientRects().length||el.closest('[hidden]')||getComputedStyle(el).visibility==='hidden')return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}
function target(selector){return [...document.querySelectorAll(selector)].find(visible)||null;}
function position(scroll=false){
 if(!area||!dialog.open)return;anchor=target(areas[area].tips[index].target);
 if(scroll&&anchor)anchor.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 const card=$('#tour-card'),spot=$('#tour-spot'),viewport=window.visualViewport,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight,ox=viewport?.offsetLeft||0,oy=viewport?.offsetTop||0,gap=12,pad=14;
 card.style.maxHeight=Math.max(90,h-pad*2)+'px';card.style.maxWidth=Math.max(100,w-pad*2)+'px';const cw=card.offsetWidth,ch=card.offsetHeight,rect=anchor?.getBoundingClientRect();let left=ox+(w-cw)/2,top=oy+h-ch-pad;
 if(rect){const x=Math.max(ox+3,rect.left-5),y=Math.max(oy+3,rect.top-5),right=Math.min(ox+w-3,rect.right+5),bottom=Math.min(oy+h-3,rect.bottom+5);spot.hidden=right<=x||bottom<=y;Object.assign(spot.style,{left:x+'px',top:y+'px',width:Math.max(0,right-x)+'px',height:Math.max(0,bottom-y)+'px'});
  if(ox+w-rect.right>=cw+gap+pad){left=rect.right+gap;top=rect.top;}else if(rect.left-ox>=cw+gap+pad){left=rect.left-cw-gap;top=rect.top;}else if(oy+h-rect.bottom>=ch+gap+pad)top=rect.bottom+gap;else if(rect.top-oy>=ch+gap+pad)top=rect.top-ch-gap;
 }else spot.hidden=true;
 left=Math.max(ox+pad,Math.min(ox+w-cw-pad,left));top=Math.max(oy+pad,Math.min(oy+h-ch-pad,top));Object.assign(card.style,{left:left+'px',top:top+'px'});
}
function permissionState(kind){const p=NotaPlatform.permissions(),c=NotaPlatform.cloudState();return kind==='cloud'?(!c.configured?'Cloud AI is unavailable in this build.':c.allowed?'Cloud AI is allowed.':c.decided?'Cloud AI is off.':'Cloud AI has not been chosen.'):kind==='microphone'?(p.microphone?'Microphone is allowed.':'Microphone is optional.'):p.notifications?'Notifications are allowed.':'Notifications are optional.';}
function render(scroll=true){
 if(!area)return;const page=areas[area],t=page.tips[index];
 if(area==='desk'){if(t.menu)NotaDeskMenu.open();else NotaDeskMenu.close(false);}
 $('#tour-area').textContent=page.label;$('#tour-count').textContent=(index+1)+' of '+page.tips.length;$('#tour-title').textContent=t.title;$('#tour-copy').textContent=t.text;$('#tour-back').hidden=index===0;$('#tour-next').textContent=index+1<page.tips.length?'Next tip':intro?'Permission choices':'Got it';$('#tour-try').hidden=!t.tryLabel;$('#tour-try').textContent=t.tryLabel||'Try it';$('#tour-allow').hidden=!t.permission;$('#tour-allow').textContent={microphone:'Allow microphone',notifications:'Allow notifications',cloud:NotaPlatform.cloudState().allowed?'Cloud AI allowed':'Choose cloud AI'}[t.permission]||'';$('#tour-allow').disabled=busy||(t.permission==='cloud'&&(!NotaPlatform.cloudState().configured||NotaPlatform.cloudState().allowed));$('#tour-status').textContent=t.permission?permissionState(t.permission):'';$('#tour-storage').hidden=remembered;
 for(const id of ['tour-back','tour-next','tour-try','tour-skip','tour-close'])$('#'+id).disabled=busy;
 if(!dialog.open)dialog.showModal();requestAnimationFrame(()=>{position(scroll);$('#tour-title').focus({preventScroll:true});});
}
function hide(){dialog?.close();anchor=null;}
function finish({skip=false,tryIt=false}={}){
 if(!area||busy)return;seen.add(area);if(skip)enabled=false;persist();const wasIntro=intro;area=null;intro=false;hide();NotaDeskMenu.close(false);
 if(wasIntro||skip){closeModal();permissionsModal(true);return;}
 const focus=target('#note-editor,#add-task,#record-start,#ai-message,#draw-title,#saved-search,#layout-setting,#save-backup')||$('#desk-menu-toggle');focus?.focus();
}
async function allow(){
 const kind=areas[area]?.tips[index].permission;if(!kind||busy)return;busy=true;render(false);
 try{
  if(kind==='cloud'){hide();await cloudConsent();}
  else if(NotaPlatform.isAndroid){kind==='microphone'?NotaPlatform.microphone():NotaPlatform.alerts();}
  else if(kind==='microphone'){const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop());}
  else if('Notification'in window)await Notification.requestPermission();else toast('Notifications require a supported browser or the Android app.');
 }catch{toast('Access was not granted. You can change this later in Settings.');}
 finally{busy=false;if(area)render(false);}
}
function open(id,{first=false,force=false}={}){if(area||!areas[id]||!force&&(!enabled||seen.has(id))||blocked())return false;area=id;index=0;intro=first;render();return true;}
function queue(){clearTimeout(timer);timer=setTimeout(()=>{if(!area&&enabled&&!blocked()&&localStorage.getItem('nota-tour-version')==='2'){const id=currentArea();if(id)open(id);}},160);}
function wire(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.id='nota-tour';dialog.className='nota-coach';dialog.setAttribute('aria-labelledby','tour-title');dialog.setAttribute('aria-describedby','tour-copy');dialog.innerHTML=`<div id="tour-spot" class="tour-spot" aria-hidden="true"></div><section id="tour-card" class="tour-card"><header><span id="tour-area"></span><span id="tour-count"></span><button id="tour-close" class="icon-button" aria-label="Skip tour and review permission choices">×</button></header><h2 id="tour-title" tabindex="-1"></h2><p id="tour-copy"></p><p id="tour-status" role="status" aria-live="polite"></p><p id="tour-storage" class="hint" hidden>These tips could not be remembered on this device.</p><div class="tour-actions"><button id="tour-back" class="secondary">Back</button><button id="tour-allow" class="secondary" hidden></button><button id="tour-next" class="primary">Next tip</button><button id="tour-try" class="secondary" hidden>Try it</button></div><button id="tour-skip" class="tour-skip">Skip tour · review choices</button></section>`;document.body.append(dialog);
 $('#tour-back').onclick=()=>{if(index>0&&!busy){index--;render();}};$('#tour-next').onclick=()=>{if(busy)return;if(index+1<areas[area].tips.length){index++;render();}else finish();};$('#tour-try').onclick=()=>finish({tryIt:true});$('#tour-skip').onclick=$('#tour-close').onclick=()=>finish({skip:true});$('#tour-allow').onclick=allow;
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish({skip:true});});dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Tab'){const controls=[...dialog.querySelectorAll('button:not(:disabled)')].filter(visible),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'){e.preventDefault();finish({skip:true});}});
 document.addEventListener('click',queue);new MutationObserver(queue).observe($('#modal-root'),{childList:true,subtree:true});window.addEventListener('resize',()=>position());window.visualViewport?.addEventListener('resize',()=>position());document.addEventListener('scroll',()=>position(),true);window.addEventListener('nota-permissions',()=>{if(area&&!busy)render(false);});
}
window.NotaTour={
 start(replay=false){wire();if(busy)return;if(area){area=null;hide();}closeModal();dismissMenu();enabled=true;if(replay)seen.clear();persist();open('desk',{first:true,force:true});},
 queue,wire,skip:()=>finish({skip:true}),get active(){return !!area;},get enabled(){return enabled;},setEnabled(value){enabled=!!value;persist();if(!enabled&&area)finish();},
 get state(){return {area,index,enabled,seen:[...seen]};}
};
})();
