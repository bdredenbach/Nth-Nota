/* Creation templates and recoverable workspace removal. No content leaves the device. */
(function(root){'use strict';
function removeWorkspace(desk,id,{uid,at=Date.now()}={}){
 const workspace=desk.workspaces.find(w=>w.id===id);if(!workspace)throw Error('This workspace no longer exists.');
 const remaining=desk.workspaces.filter(w=>w.id!==id);
 if(!remaining.length)remaining.push({id:uid(),name:'Everyday',description:'Your notes, ideas, and everyday plans.',color:'#9dad7e'});
 let count=0;for(const n of desk.items){if(n.workspace!==id)continue;n.workspace=remaining[0].id;if(!n.deletedAt){n.deletedAt=at;n.updated=new Date(at).toISOString();count++;}}
 desk.workspaces=remaining;if(desk.active===id)desk.active=remaining[0].id;
 return {count,name:workspace.name,destination:remaining[0].name};
}
const iconChoices=[['sun','Sun'],['folder','Folder'],['lightbulb','Idea'],['notebook-pen','Notebook'],['briefcase-business','Work'],['house','Home'],['heart','Heart'],['leaf','Leaf'],['coffee','Coffee'],['graduation-cap','Study'],['palette','Art'],['music','Music'],['book-open','Reading'],['code','Code'],['plane','Travel'],['shopping-bag','Shopping'],['wallet','Budget'],['calendar-days','Calendar'],['dumbbell','Fitness'],['star','Star'],['sparkles','Sparkles'],['layout-grid','Grid']];
function workspaceIcon(w){return iconChoices.some(([id])=>id===w.icon)?w.icon:({everyday:'sun',projects:'folder',ideas:'lightbulb'}[w.id]||'layout-grid');}
function raiseItem(desk,item){const ordered=desk.items.map((n,index)=>({n,index,rank:Number.isInteger(n.stack)?n.stack:index+1})).filter(({n})=>n!==item&&!n.deletedAt&&n.workspace===item.workspace).sort((a,b)=>a.rank-b.rank||a.index-b.index);ordered.forEach(({n},index)=>n.stack=index+1);item.stack=ordered.length+1;return item;}
function moveItem(desk,n,id,{width=500,list=false}={}){if(!desk.workspaces.some(w=>w.id===id))throw Error('Choose an existing canvas.');if(n.workspace===id)return n;if(n.inputMode==='journal'&&desk.items.some(other=>other!==n&&!other.deletedAt&&other.workspace===id&&other.inputMode==='journal'&&other.journal?.date===n.journal.date))throw Error('This canvas already has a journal for that day. Keep this page here or choose another canvas.');const Canvas=typeof module!=='undefined'?require('./canvas-layout.js'):root.NotaCanvas;n.workspace=id;n.w=Math.max(240,Math.min(n.w||340,Math.max(240,width-36)));Object.assign(n,Canvas.nextPosition(desk.items.filter(other=>other!==n),{workspace:id,list,width:n.w,height:n.h||320}));return n;}
const templates={
 meeting:{title:'Meeting note',tag:'Meeting',html:'<h2>Purpose</h2><p><br></p><h2>Notes</h2><p><br></p><h2>Decisions</h2><ul><li><br></li></ul><h2>Next steps</h2><ul><li><br></li></ul>'},
 idea:{title:'An idea to explore',tag:'Idea starter',html:'<h2>The idea</h2><p><br></p><h2>Who it helps</h2><p><br></p><h2>Three possibilities</h2><ul><li><br></li><li><br></li><li><br></li></ul><h2>The smallest next step</h2><p><br></p>'}
};
const api={removeWorkspace,templates,iconChoices,workspaceIcon,moveItem,raiseItem};if(typeof module!=='undefined')module.exports=api;else root.NotaCreation=api;
})(typeof window!=='undefined'?window:globalThis);
