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
const templates={
 meeting:{title:'Meeting note',tag:'Meeting',html:'<h2>Purpose</h2><p>What do we need to decide?</p><h2>Notes</h2><p><br></p><h2>Decisions</h2><ul><li><br></li></ul><h2>Next steps</h2><ul><li>Action · owner · due date</li></ul>'},
 idea:{title:'An idea to explore',tag:'Idea starter',html:'<h2>The idea</h2><p>What could we make, change, or try?</p><h2>Who it helps</h2><p><br></p><h2>Three possibilities</h2><ul><li><br></li><li><br></li><li><br></li></ul><h2>The smallest next step</h2><p><br></p>'}
};
const api={removeWorkspace,templates};if(typeof module!=='undefined')module.exports=api;else root.NotaCreation=api;
})(typeof window!=='undefined'?window:globalThis);
