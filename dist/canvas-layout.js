(function(root){'use strict';
function startup(settings={}){settings.layout='canvas';settings.menuCollapsed=true;return settings;}
function alignLeft(items,{workspace,ids=null,grid=16,gap=16}={}){
 const allowed=ids?new Set(ids):null;
 const open=items.filter(n=>n.workspace===workspace&&!n.deletedAt&&!['closed','minimized'].includes(n.deskState)&&(!allowed||allowed.has(n.id))).sort((a,b)=>(a.y||0)-(b.y||0)||(a.x||0)-(b.x||0));
 let y=grid;
 for(const n of open){n.x=grid;n.y=y;y+=Math.ceil((Math.max(180,Number(n.h)||320)+gap)/grid)*grid;}
 return open;
}
const api={startup,alignLeft};if(typeof module!=='undefined')module.exports=api;else root.NotaCanvas=api;
})(typeof window!=='undefined'?window:globalThis);
