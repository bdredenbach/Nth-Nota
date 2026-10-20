/* Shared positioning for the two manual tutors. No content or preferences are saved. */
(function(){'use strict';
const viewport=()=>{const v=window.visualViewport;return {x:v?.offsetLeft||0,y:v?.offsetTop||0,w:v?.width||innerWidth,h:v?.height||innerHeight};};
function available(el){if(!el?.isConnected||el.closest('[hidden],[inert],dialog:not([open])')||!el.getClientRects().length)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.visibility!=='hidden'&&s.visibility!=='collapse'&&r.width>0&&r.height>0;}
function find(selector){if(!selector)return null;for(const part of selector.split(',')){const el=[...document.querySelectorAll(part)].find(available);if(el)return el;}return null;}
function bounds(el){
 if(!available(el))return null;const r=el.getBoundingClientRect(),v=viewport();let left=Math.max(v.x,r.left),top=Math.max(v.y,r.top),right=Math.min(v.x+v.w,r.right),bottom=Math.min(v.y+v.h,r.bottom);
 for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(Number(s.opacity)===0)return null;if(p===el)continue;const b=p.getBoundingClientRect(),sx=b.width/(p.offsetWidth||b.width||1),sy=b.height/(p.offsetHeight||b.height||1);if(/hidden|clip|scroll|auto/.test(s.overflowX)){left=Math.max(left,b.left+p.clientLeft*sx);right=Math.min(right,b.left+(p.clientLeft+p.clientWidth)*sx);}if(/hidden|clip|scroll|auto/.test(s.overflowY)){top=Math.max(top,b.top+p.clientTop*sy);bottom=Math.min(bottom,b.top+(p.clientTop+p.clientHeight)*sy);}}
 return right>left&&bottom>top?{left,top,right,bottom,width:right-left,height:bottom-top,rect:r}:null;
}
function outline(spot,anchor,pad=3){const b=bounds(anchor),v=viewport();spot.hidden=!b;if(!b)return;const left=Math.max(v.x+2,b.left-pad),top=Math.max(v.y+2,b.top-pad),right=Math.min(v.x+v.w-2,b.right+pad),bottom=Math.min(v.y+v.h-2,b.bottom+pad);Object.assign(spot.style,{left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});}
// Watch actual geometry before paint, including CSS animations and hidden ancestors.
// Only reposition when geometry changes; the ring's own pulse does not trigger work.
function follow(active,read,update){let frame=0,previous=[],signature='';const tick=()=>{frame=0;if(!active())return;const nodes=read(),v=viewport(),next=[v.x,v.y,v.w,v.h,...nodes.map(n=>{if(typeof n==='string')return n;const b=bounds(n);return b?[b.left,b.top,b.right,b.bottom,b.rect.left,b.rect.top,b.rect.width,b.rect.height].map(x=>Math.round(x*100)/100).join(','):'hidden';})].join('|');if(next!==signature||nodes.some((n,i)=>n!==previous[i])){signature=next;previous=nodes;update();}frame=requestAnimationFrame(tick);};return {start(){if(!frame){signature='';frame=requestAnimationFrame(tick);}},stop(){cancelAnimationFrame(frame);frame=0;previous=[];signature='';}};}
function movable(card,grip,{onMove=()=>{}}={}){
 let placed=null,drag=null;
 const clamp=(x,y)=>{const v=viewport(),r=card.getBoundingClientRect(),pad=8;return {x:Math.max(v.x+pad,Math.min(v.x+v.w-r.width-pad,x)),y:Math.max(v.y+pad,Math.min(v.y+v.h-r.height-pad,y))};};
 const apply=p=>{card.style.left=p.x+'px';card.style.top=p.y+'px';};
 const place=(x,y)=>{const p=clamp(placed?.x??x,placed?.y??y);if(placed)placed=p;apply(p);return p;};
 grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();grip.focus({preventScroll:true});const r=card.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};grip.setPointerCapture(e.pointerId);card.classList.add('tutor-dragging');});
 grip.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;placed=clamp(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);apply(placed);onMove();});
 const finish=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;card.classList.remove('tutor-dragging');if(grip.hasPointerCapture(e.pointerId))grip.releasePointerCapture(e.pointerId);onMove();};
 grip.addEventListener('pointerup',finish);grip.addEventListener('pointercancel',finish);grip.addEventListener('lostpointercapture',()=>{drag=null;card.classList.remove('tutor-dragging');});
 grip.addEventListener('keydown',e=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(e.key==='Home'){e.preventDefault();placed=null;onMove();return;}if(!moves[e.key])return;e.preventDefault();e.stopPropagation();const r=card.getBoundingClientRect(),d=e.shiftKey?40:16;placed=clamp(r.left+moves[e.key][0]*d,r.top+moves[e.key][1]*d);apply(placed);onMove();});
 return {place,reset(){placed=null;drag=null;},get moved(){return !!placed;}};
}
function aim(anchor){
 const b=bounds(anchor);if(!b||b.width<6||b.height<6)return null;const r=b.rect,writing=anchor.matches('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable=true]');
 const x=writing?r.left+Math.min(26,r.width/2):r.left+r.width/2,y=writing?r.top+Math.min(24,r.height/2):r.top+Math.min(r.height/2,70),px=Math.min(10,b.width/2),py=Math.min(10,b.height/2);
 return {x:Math.max(b.left+px,Math.min(b.right-px,x)),y:Math.max(b.top+py,Math.min(b.bottom-py,y))};
}
function point(marker,anchor){const p=aim(anchor);marker.hidden=!p;if(p)Object.assign(marker.style,{left:p.x+'px',top:p.y+'px'});}
function avoid(card,anchor,mover,left,top){
 const p=aim(anchor),v=viewport(),gap=26,pad=10;if(!p||mover.moved||card.contains(anchor))return {left,top};let h=card.offsetHeight;const w=card.offsetWidth;
 if(p.x<left-gap||p.x>left+w+gap||p.y<top-gap||p.y>top+h+gap)return {left,top};
 const above=p.y-v.y-gap-pad,below=v.y+v.h-p.y-gap-pad,room=Math.max(above,below);if(room>=120){card.style.maxHeight=Math.min(parseFloat(card.style.maxHeight)||v.h,room)+'px';h=card.offsetHeight;top=above>=below?p.y-gap-h:p.y+gap;}return {left,top};
}
const examples={
 'note-title':'A weekend with room to think','note-editor':'Pack a notebook. Take a quiet walk. Keep one small thought from the day.',
 'task-title':'Weekend plans','voice-title':'A thought from the walk','draw-title':'A walk in the hills','handwrite-title':'A thought written by hand','handwrite-text':'Remember to bring the notebook.',
 'rem-title':'Keep a thought nearby','rem-body':'Take the notebook on the next walk.','ai-message':'Could you make this sentence clearer?',
 'map-label':'A weekend outside','map-body':'Bring a notebook and notice one new thing.','map-relation':'A simple place to start',
 'calc-expression':'8 * 12.5','calc-box':'8 * 12.5 =','budget-reserve':'100','reference-title':'A useful packing list','reference-tags':'weekend, outdoors','reference-body':'Notebook, pen, water.',
 'index-title':'The careful scout','index-tags':'characters, woodland','index-body':'Roll against the observer’s perception.','index-new-tab':'Rules',
 'snippet-title':'A friendly sign-off','snippet-text':'Thanks for your time.\nI look forward to hearing your thoughts.',
 'habit-name':'Read a chapter','habit-unit':'pages','habit-goal':'7','habit-amount':'3','flash-front':'What is the capital of France?','flash-back':'Paris','flash-tags':'geography',
 'photo-text':'Pack a notebook. Keep one small thought. Bring a pen, too.','journal-focus':'A quiet walk and a small idea worth keeping.','journal-space':'Make a little time for reading.','journal-next':'Take the notebook on tomorrow’s walk.'
};
function suggestion(el){if(!el)return '';if(examples[el.id])return examples[el.id];if(el.id==='mode-title')return 'A thought worth keeping';if(el.matches('[data-ttext]'))return 'Bring a notebook';if(el.matches('[data-index-value]'))return 'Dexterity 17 · Perception 14';if(el.dataset.mathField)return {label:'Number of guests',name:'guests',expression:'8',unit:'people',whatIf:'10'}[el.dataset.mathField]||'';if(el.dataset.budgetField)return el.dataset.budgetField==='label'?'Income':'1200';if(el.dataset.optionField)return {label:'A walk outside',pros:'A little time to think',cons:'An hour of my afternoon'}[el.dataset.optionField]||'';if(el.dataset.criterionField)return el.dataset.criterionField==='label'?'Effort':'1';return '';}
const grip='<span class="tutor-grip-lines" aria-hidden="true"><i></i><i></i><i></i></span>';
window.NotaTourPanel={movable,point,viewport,suggestion,grip,available,find,bounds,outline,follow,aim,avoid};
})();
