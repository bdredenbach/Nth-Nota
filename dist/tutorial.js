/* Nth Experience: show the real control, then let people try it. Tour state stays on this device. */
(function(){
'use strict';
let collapsed=false,mover=null,follower=null;
const FULL_TOURS_ENABLED=false;
const KEY='nota-tour-v2', $=s=>document.querySelector(s);
const tip=(target,title,text,extra={})=>({target,title,text,...extra});
const areas={
 scanner:{label:'Scanner',tips:[tip('#scan-import','Turn paper into pages.','Scan a document or import pictures, then rotate, trim and export a PDF.',{tryLabel:'Let me scan'})]},
 index:{label:'Index Builder',tips:[tip('#index-tabs','A custom reference, in tabs.','Create entries with their own tags and fields. Link an entry to another tab to keep the relationships close.',{tryLabel:'Let me build an index'})]},
 snippets:{label:'Snippet Shelf',tips:[tip('#snippet-editor','Save it once, use it again.','Keep reusable text here. The Snippet Shelf button in a writing editor inserts a block at your cursor.',{tryLabel:'Let me make a block'})]},
 streak:{label:'Streak Board',tips:[tip('#habit-editor','A small record of showing up.','Set your own daily target and total goal. Each logged day updates the heat map and progress bar.',{tryLabel:'Let me log a routine'})]},
 flash:{label:'Flash Cards',tips:[tip('#flash-editor','A little practice, whenever you want.','Write a question and answer, add tags, then Study cards. Reveal before rating whether you knew it.',{tryLabel:'Let me make a card'})]},
 reminders:{label:'Reminders',tips:[tip('#rem-body,#reminders-new','A little help remembering.','Choose a schedule or create a persistent notification. A new reminder also becomes a canvas item.',{tryLabel:'Let me set it up'})]},

 budget:{label:'Budget planner',tips:[tip('#budget-rows','Give each amount a place.','Compare planned and actual income and expenses. Set aside protects a little room before the remaining amount is calculated.'),tip('#budget-summary','Check your room to spend.','Totals use the amounts you enter. Nothing connects to a bank. Choose the destination canvas above, then save or press ×.',{tryLabel:'Let me plan'})]},
 calendar:{label:'Calendar',tips:[tip('#calendar-days','A day with room for a thought.','Choose a day, then Add a plan. Entries save as you type; a time is optional.'),tip('#calendar-entries,#calendar-add','Let a plan become a next step.','Make an entry a task, then choose notification options with its bell. Journal for this day opens a dated page on the same canvas.',{tryLabel:'Let me plan a day'})]},
 desk:{label:'Your desk',tips:[
  tip('#desk-menu-toggle','A little room to think.','This is your Desk menu. It opens from the bottom, keeping your notes and tools within reach.'),
  tip('.launcher-tools button:first-child','Your tools live here.','Create a note, sketch, task list or voice note. Find a saved thought with search. The same creation tools also appear inside each note.',{menu:true}),
  tip('#workspace-tabs','Give each idea its own space.','Switch between workspaces here. The + beside the tabs creates another space for a project or collection.'),
  tip('#taskbar-layout','Your desk, two ways.','The app opens in Canvas. Use this switch to browse a list or return to freely movable notes. A toast confirms the view you choose.'),
  tip('#canvas-snap','A little order, whenever you need it.','Snap to grid arranges open notes in a left-aligned column on the canvas. You can still drag them wherever they belong.'),
  tip('#desk-menu-toggle','Start with one thought.','Open Desk, then choose New note. Notes save as you type. When you open a tool for the first time, a short tip will show you its controls.'),
  tip('.desk-taskbar [data-action=saved]','Your notes stay close.','Drag a note by its title bar to arrange it. Minimize puts it below the canvas. A canvas card’s × puts it away in Saved notes; this button brings it back.'),
  tip('.desk-taskbar [data-action=assistant]','Help, when you want it.','The writing companion can proofread, organize or explore an idea with you. Next, choose permissions. You can keep everything optional and change your choices later.')
 ]},
 note:{label:'Writing a note',tips:[
  tip('#note-title','Make this thought yours.','Give your note a title, then write below. Your changes save as you type. Bold, lists, highlighting and readback are just above the page.'),
  tip('.editor-ribbon','More than a page.','Desk opens your creation menu. Sketch, Ink, Handwrite, Task, Import and Voice create another item on this workspace. Your current note stays saved.'),
  tip('#note-done','Keep it open on your desk.','Save to workspace returns to the canvas with this note open. Minimize keeps it in the dock. The editor’s × also saves it to the canvas. Choose its destination with the Canvas picker above.',{tryLabel:'Let me write'})
 ]},
 tasks:{label:'Tasks & reminders',tips:[
  tip('#add-task','Turn a thought into a next step.','Add a task, type what needs doing, and tick it when complete. Each task has its own bell for notification choices.'),
  tip('#add-task','Choose which tasks notify you.','A task’s bell can set a timed reminder or an ongoing notification. Allowing notifications does not create an alert; you choose the tasks and timing.',{permission:'notifications',tryLabel:'Let me try a task'})
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
  tip('#ai-message','Choose how AI can help.','Local AI is tried first. With your consent, Cloudflare or configured Groq can receive your request, selected text or current note context, and recent chat when local AI is unavailable. No message is sent by taking this tour.',{permission:'cloud',tryLabel:'Let me try the companion'})
 ]},
 audio:{label:'Audio & transcript',tips:[tip('#audio-player','Keep the sound and the words together.','Play your recording here. Convert to text creates a transcript inside this same note on supported phones. You can review and edit the words below.',{tryLabel:'Explore this audio note'})]},
 photo:{label:'Photo to text',tips:[tip('#photo-pick','Keep the source close.','Choose a clear photo of printed text. Extract text reads it on this device. The original photo stays with the note.'),tip('#photo-text','Make the words yours.','Check and edit the text. Choose text blocks to use only part of the photo, then Save to workspace.',{tryLabel:'Let me try'})]},
 journal:{label:'Daily journal',tips:[tip('#journal-date','A page for this day.','Opening Daily journal returns to this workspace’s page for the chosen date. Morning, evening and free writing stay together.'),tip('#journal-fields','Start wherever you are.','Write a little, or a lot. Mood is optional. One small step can become a task when you choose.',{tryLabel:'Let me write'})]},
 mindmap:{label:'Mind map',tips:[tip('#map-stage .map-node:first-child','Follow a connected thought.','Select a thought and add a branch. Drag its grip, or use arrow keys on a focused thought, to move it.'),tip('.map-detail','Give the connection a name.','Describe how one thought leads to another. Open as note or Make it a task keeps the map and creates a linked item.',{tryLabel:'Let me explore'})]},
 math:{label:'Math sheet · a worked example',tips:[
  tip('#math-rows .math-line:first-child [data-math-field=expression]','Start with a value.','Click the highlighted Expression and try 8. The answer updates as you type. You can work in the sheet while these tips are open.'),
  tip('#math-rows .math-line:first-child [data-math-field=name]','Give it a useful name.','Name this value guests. Other lines can refer to that name. Use a short name with letters, digits, or underscores; begin with a letter.'),
  tip('#math-rows .math-line:nth-child(2) [data-math-field=expression],#math-add','Give the next value a purpose.','In the second line, use the name cost and an expression such as 12.5. Add a calculation if your sheet needs another line. Labels and units explain your numbers.'),
  tip('#math-rows .math-line:nth-child(3) [data-math-field=expression],#math-add','Let one line build on another.','A third line can use guests * cost. With 8 guests and a cost of 12.5, the result is 100. Changing guests updates the dependent line too.'),
  tip('#math-scenario','Explore a different possibility.','Press What if? and enter an alternative for guests, such as 10. The original values stay in place. Follow the alternative total to see the difference.'),
  tip('#math-rows .math-line:nth-child(3) .math-result details,#math-rows .math-line:first-child .math-result details','Check how the answer was reached.','Open Show working to inspect the substituted numbers. Mistyped names, circular references, and invalid equations show an error instead of an invented answer. Hide this explanation whenever you need more room.',{tryLabel:'Keep working in my sheet'})
 ]},
 calculator:{label:'Calculator',tips:[tip('#calc-expression','Work out a number.','Use the keypad or type an expression. Press = or Enter to calculate. Recent calculations stay in this calculator note.'),tip('#calc-box','A little room for the working.','Write an equation on its own line and finish with =. Keep this calculation saves the selected keypad result as a separate note.',{tryLabel:'Let me calculate'})]},
 choice:{label:'Choice Weaver',tips:[tip('#choice-options','Start with the tradeoffs.','Name your options. What does each give you, and what does each ask of you? Your notes stay attached to each option.'),tip('[data-choice-view=weighted]','Make your priorities visible.','Weighted view compares 1–5 ratings with your own weights. Lower can be preferable for cost or effort. Missing ratings pause comparisons.',{tryLabel:'Let me weigh the choices'})]},
 reference:{label:'Reference Lab',tips:[tip('#reference-browser','A small answer within reach.','Keep reference cards with tags and custom fields. Search across their titles and details, or switch to a table.'),tip('#reference-editor','Connect what belongs together.','Link related references, or keep an entry as a linked note. Removing a reference keeps notes you already made from it.',{tryLabel:'Let me make a reference'})]},

 handwriting:{label:'Handwrite to text',tips:[
  tip('#handwrite-pad','A word from your fingertips.','Write one word or a short line. Convert to text downloads a language pack on first use and reads your strokes on this device.'),
  tip('#handwrite-result','Check the words.','Choose a reading or correct it, then Add words. Clear the pad for the next word. Your note and unfinished strokes save automatically.',{tryLabel:'Let me write'})
 ]},
 saved:{label:'Saved notes',tips:[
  tip('#saved-list,#saved-search','Closed does not mean gone.','Search your saved notes here. Restore brings a note back to its workspace. The trash button moves it to Recently deleted, where you can recover it.',{tryLabel:'Browse my notes'})
 ]},
 settings:{label:'Make it yours',tips:[
  tip('.theme-picker','A desk that feels like yours.','Choose Paper, Dark paper, Blue or Rosy pink. Below, choose Canvas or List and your navigation style.'),
  tip('#open-permissions','Your choices stay within reach.','Change microphone, notification and cloud AI choices here. Privacy & data includes your policy, backups, AI reports and local data controls. Short tips appear when you first open a tool.',{tryLabel:'Explore settings'})
 ]},
 backup:{label:'Backup & restore',tips:[
  tip('#save-backup','Keep a copy outside the app.','Download backup includes your workspaces, notes and attachments. Keep it privately. Restore previews a confirmation before replacing this device’s desk.',{tryLabel:'Choose my backup'})
 ]}
};
let seen=new Set(),enabled=true,area=null,index=0,intro=false,busy=false,remembered=true,timer,dialog,anchor;
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){seen=new Set((s.seen||[]).filter(id=>Object.hasOwn(areas,id)));enabled=s.enabled!==false;}}catch{}
try{if(localStorage.getItem('nota-math-guide-revision')!=='2'){seen.delete('math');localStorage.setItem('nota-math-guide-revision','2');}}catch{}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({enabled,seen:[...seen]}));remembered=true;}catch{remembered=false;}}
function currentArea(){
 if($('#scan-notes'))return 'scanner';if($('#index-tabs'))return 'index';if($('#snippet-browser'))return 'snippets';if($('#habit-tabs'))return 'streak';if($('#flash-editor'))return 'flash';if($('#rem-title')||$('#reminders-list'))return 'reminders';
 if($('#permissions-done')||$('#privacy-policy')||$('#report-send')||$('#report-consent')||$('#transcript-text'))return null;
 if($('#calc-expression'))return 'calculator';if($('#choice-options'))return 'choice';if($('#reference-browser'))return 'reference';if($('#budget-rows'))return 'budget';if($('#calendar-days'))return 'calendar';if($('#photo-text'))return 'photo';if($('#journal-date'))return 'journal';if($('#map-stage'))return 'mindmap';if($('#math-rows'))return 'math';if($('#handwrite-pad'))return 'handwriting';if($('#audio-transcript'))return 'audio';if($('#task-alert-save'))return 'alerts';if($('#task-title'))return 'tasks';if($('#note-editor'))return 'note';if($('#draw-canvas'))return 'drawing';if($('#record-start'))return 'voice';if($('#ai-message'))return 'assistant';if($('#saved-search'))return 'saved';if($('#layout-setting'))return 'settings';if($('#save-backup'))return 'backup';return null;
}
function blocked(){return !!window.NotaTourDemo?.active||!!$('#photo-stop:not([hidden])')||!!$('#handwrite-stop:not([hidden])')||!!$('.choice-overlay')||!!$('#ai-progress-dialog:not([hidden])')||!!$('#record-stop:not(:disabled)')||!!$('#record-start:disabled')||!!$('#ai-stop:not(:disabled)')||document.hidden;}
function target(selector){return NotaTourPanel.find(selector);}
function currentTarget(){let el=area?target(areas[area].tips[index].target):null;if($('.choice-overlay')||NotaDeskMenu.isOpen()&&el?.id!=='desk-menu-toggle'&&!el?.closest('#desk-launcher'))el=null;return el;}
function position(scroll=false){
 if(!area||!dialog.open)return;anchor=currentTarget();
 if(scroll&&anchor)anchor.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
 const card=$('#tour-card'),scrollTop=card.scrollTop,spot=$('#tour-spot'),viewport=window.visualViewport,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight,ox=viewport?.offsetLeft||0,oy=viewport?.offsetTop||0,gap=12,pad=14;
 card.style.maxHeight=Math.max(90,h-pad*2)+'px';card.style.maxWidth=Math.max(100,w-pad*2)+'px';let cw=card.offsetWidth,ch=card.offsetHeight;const rect=anchor?.getBoundingClientRect();if(rect&&rect.height<h/2&&ox+w-rect.right<cw+gap+pad&&rect.left-ox<cw+gap+pad){const available=Math.max(rect.top-oy,oy+h-rect.bottom)-gap-pad;if(available>=100&&available<ch){card.style.maxHeight=available+'px';ch=card.offsetHeight;}}let left=ox+(w-cw)/2,top=oy+h-ch-pad;
 if(rect){
  if(ox+w-rect.right>=cw+gap+pad){left=rect.right+gap;top=rect.top;}else if(rect.left-ox>=cw+gap+pad){left=rect.left-cw-gap;top=rect.top;}else if(oy+h-rect.bottom>=ch+gap+pad)top=rect.bottom+gap;else if(rect.top-oy>=ch+gap+pad)top=rect.top-ch-gap;
 }
 NotaTourPanel.outline(spot,anchor,5);
 left=Math.max(ox+pad,Math.min(ox+w-cw-pad,left));top=Math.max(oy+pad,Math.min(oy+h-ch-pad,top));const focused=document.activeElement,control=anchor?.contains(focused)&&!dialog.contains(focused)?focused:anchor?.matches('input,textarea,button,select,[contenteditable=true]')?anchor:anchor?.querySelector('input:not([type=hidden]),textarea,button,select,[contenteditable=true]')||anchor;({left,top}=NotaTourPanel.avoid(card,control,mover,left,top));mover.place(left,top);NotaTourPanel.point($('#tour-pointer'),control);const example=NotaTourPanel.suggestion(control);$('#tour-input-hint').textContent=example?'Try typing: '+example:'';if(card.scrollTop!==scrollTop)card.scrollTop=scrollTop;
}
function permissionState(kind){const p=NotaPlatform.permissions(),c=NotaPlatform.cloudState();return kind==='cloud'?(!c.configured?'Cloud AI is unavailable in this build.':c.allowed?'Cloud AI is allowed.':c.decided?'Cloud AI is off.':'Cloud AI has not been chosen.'):kind==='microphone'?(p.microphone?'Microphone is allowed.':'Microphone is optional.'):p.notifications?'Notifications are allowed.':'Notifications are optional.';}
function render(scroll=true){
 if(!area)return;$('#tour-fold').textContent=collapsed?'Show explanation':'Hide explanation';$('#tour-fold').setAttribute('aria-expanded',String(!collapsed));const page=areas[area],t=page.tips[index];
 if(area==='desk'){if(t.menu)NotaDeskMenu.open();else NotaDeskMenu.close(false);}
 $('#tour-area').textContent=page.label;$('#tour-count').textContent=(index+1)+' of '+page.tips.length;$('#tour-title').textContent=t.title;$('#tour-copy').textContent=t.text+(index===0?' Drag the three lines above to move this see-through tutor out of your way.':'');$('#tour-back').hidden=index===0;$('#tour-next').textContent=index+1<page.tips.length?'Next tip':intro?'Permission choices':'Got it';$('#tour-try').hidden=!t.tryLabel;$('#tour-try').textContent=t.tryLabel||'Try it';$('#tour-allow').hidden=!t.permission;$('#tour-allow').textContent={microphone:'Allow microphone',notifications:'Allow notifications',cloud:NotaPlatform.cloudState().allowed?'Cloud AI allowed':'Choose cloud AI'}[t.permission]||'';$('#tour-allow').disabled=busy||(t.permission==='cloud'&&(!NotaPlatform.cloudState().configured||NotaPlatform.cloudState().allowed));$('#tour-status').textContent=t.permission?permissionState(t.permission):'';$('#tour-close').setAttribute('aria-label',intro?'Skip tour and review permission choices':'Close these tips');$('#tour-skip').textContent=intro?'Skip tour · review choices':'Close these tips';$('#tour-storage').hidden=remembered;$('#tour-demo').hidden=!window.NotaTourDemo?.has(area);$('#tour-demo').textContent=area==='desk'?'Explore the tour':'Show me';$('#tour-demo').disabled=busy;
 for(const id of ['tour-back','tour-next','tour-try','tour-skip','tour-close'])$('#'+id).disabled=busy;
 applyModality();requestAnimationFrame(()=>{position(scroll);(collapsed?$('#tour-fold'):$('#tour-title')).focus({preventScroll:true});});
}
function applyModality(){if(dialog.open&&dialog.matches(':modal'))dialog.close();if(!dialog.open)dialog.show();follower.start();}
function hide(){follower?.stop();dialog?.close();anchor=null;}
function finish({skip=false,tryIt=false}={}){
 if(!area||busy)return;seen.add(area);const wasIntro=intro;if(skip&&wasIntro)enabled=false;persist();area=null;intro=false;hide();NotaDeskMenu.close(false);
 if(wasIntro){closeModal();permissionsModal(true);return;}
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
async function launchDemo(){if(!FULL_TOURS_ENABLED||!area||busy)return;const saved={area,index,intro,collapsed};const id=area;hide();area=null;intro=false;let finished=false;const started=await NotaTourDemo.start({chapter:id,onFinish:()=>{finished=true;seen.add(id);persist();if(saved.intro)permissionsModal(true);}});if(!started&&!finished){area=saved.area;index=saved.index;intro=saved.intro;collapsed=saved.collapsed;render(false);}}
function open(id,{first=false,force=false}={}){if(area||!areas[id]||!force&&(!enabled||seen.has(id))||blocked())return false;area=id;index=0;collapsed=false;mover?.reset();dialog?.classList.remove('tour-collapsed');intro=first;render();return true;}
function queue(){clearTimeout(timer);timer=setTimeout(()=>{if(!area&&enabled&&!blocked()&&localStorage.getItem('nota-tour-version')==='2'){const id=currentArea();if(id)open(id);}},160);}
function wire(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.id='nota-tour';dialog.className='nota-coach';dialog.setAttribute('aria-labelledby','tour-title');dialog.setAttribute('aria-describedby','tour-copy');dialog.innerHTML=`<div id="tour-spot" class="tour-spot" aria-hidden="true"></div><span id="tour-pointer" class="tutor-target" aria-hidden="true" hidden></span><section id="tour-card" class="tour-card"><header><span id="tour-area"></span><button id="tour-grip" class="tutor-grip" aria-label="Move tutorial. Use arrow keys to reposition; Home resets position.">${NotaTourPanel.grip}</button><span id="tour-count"></span><button id="tour-fold" aria-expanded="true">Hide explanation</button><button id="tour-close" class="icon-button" aria-label="Skip tour and review permission choices">×</button></header><h2 id="tour-title" tabindex="-1"></h2><p id="tour-copy"></p><p id="tour-input-hint" class="tutor-example"></p><p id="tour-status" role="status" aria-live="polite"></p><p id="tour-storage" class="hint" hidden>These tips could not be remembered on this device.</p><div class="tour-actions"><button id="tour-demo" class="primary">Explore the tour</button><button id="tour-back" class="secondary">Back</button><button id="tour-allow" class="secondary" hidden></button><button id="tour-next" class="primary">Next tip</button><button id="tour-try" class="secondary" hidden>Try it</button></div><button id="tour-skip" class="tour-skip">Skip tour · review choices</button></section>`;document.body.append(dialog);follower=NotaTourPanel.follow(()=>!!area&&dialog.open,()=>[currentTarget(),$('#tour-card'),document.activeElement],()=>position());mover=NotaTourPanel.movable($('#tour-card'),$('#tour-grip'),{onMove:()=>position()});
 $('#tour-fold').onclick=()=>{collapsed=!collapsed;dialog.classList.toggle('tour-collapsed',collapsed);$('#tour-fold').textContent=collapsed?'Show explanation':'Hide explanation';$('#tour-fold').setAttribute('aria-expanded',String(!collapsed));applyModality();position(!collapsed);};$('#tour-back').onclick=()=>{if(index>0&&!busy){index--;render();}};$('#tour-next').onclick=()=>{if(busy)return;if(index+1<areas[area].tips.length){index++;render();}else finish();};$('#tour-try').onclick=()=>finish({tryIt:true});$('#tour-skip').onclick=$('#tour-close').onclick=()=>finish({skip:true});$('#tour-allow').onclick=allow;$('#tour-demo').onclick=launchDemo;
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish({skip:true});});dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish({skip:true});}});
 document.addEventListener('keydown',e=>{if(area&&dialog.open&&!busy&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish({skip:true});}},true);
 document.addEventListener('click',queue);new MutationObserver(queue).observe($('#modal-root'),{childList:true,subtree:true});window.addEventListener('resize',()=>position());window.visualViewport?.addEventListener('resize',()=>position());document.addEventListener('scroll',e=>{if(!e.target.closest?.('#nota-tour'))position();},true);document.addEventListener('focusin',()=>{if(area)position();});window.addEventListener('nota-permissions',()=>{if(area&&!busy)render(false);});
}
window.NotaTour={
 start(replay=false){if(!FULL_TOURS_ENABLED)return false;if(window.NotaTourDemo?.active)NotaTourDemo.stop({notify:false});wire();if(busy)return;if(area){area=null;hide();}closeModal();dismissMenu();enabled=true;if(replay)seen.clear();persist();open('desk',{first:true,force:true});},
 guide(id){if(id==='desk'&&!FULL_TOURS_ENABLED)return false;if(window.NotaTourDemo?.active)return;wire();if(area){area=null;hide();}open(id,{force:true});},
 queue,wire,skip:()=>finish({skip:true}),get fullToursEnabled(){return FULL_TOURS_ENABLED;},get active(){return !!area;},get enabled(){return enabled;},setEnabled(value){enabled=!!value;persist();if(!enabled&&area)finish();},
 dismiss(){area=null;intro=false;hide();},get state(){return {area,index,enabled,seen:[...seen]};}
};
})();
