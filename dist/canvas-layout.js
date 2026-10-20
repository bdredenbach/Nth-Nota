(function(root){'use strict';
function startup(settings={}){settings.layout='canvas';settings.menuCollapsed=true;return settings;}
function alignLeft(items,{workspace,ids=null,grid=16,gap=16}={}){
 const allowed=ids?new Set(ids):null;
 const open=items.filter(n=>n.workspace===workspace&&!n.deletedAt&&!['closed','minimized'].includes(n.deskState)&&(!allowed||allowed.has(n.id))).sort((a,b)=>(a.y||0)-(b.y||0)||(a.x||0)-(b.x||0));
 let y=grid;
 for(const n of open){n.x=grid;n.y=y;y+=Math.ceil((Math.max(180,Number(n.h)||320)+gap)/grid)*grid;}
 return open;
}
function nextPosition(items,{workspace,list=false,width=340,height=320,gap=16}={}){const open=items.filter(n=>n.workspace===workspace&&!n.deletedAt&&!['closed','minimized'].includes(n.deskState)),previous=open.at(-1);if(!previous)return {x:16,y:16};if(list)return {x:16,y:Math.min(3900000,Math.max(...open.map(n=>(n.y||0)+(n.h||320)))+gap)};let x=(previous.x||0)+(previous.w||340)+gap;const y=previous.y||16;for(const other of [...open].sort((a,b)=>(a.x||0)-(b.x||0))){if(x<(other.x||0)+(other.w||340)+gap&&x+width+gap>(other.x||0)&&y<(other.y||0)+(other.h||320)+gap&&y+height+gap>(other.y||0))x=(other.x||0)+(other.w||340)+gap;}if(x+width<=5000)return {x,y};return {x:16,y:Math.min(3900000,Math.max(...open.map(n=>(n.y||0)+(n.h||320)))+gap)};}
const api={startup,alignLeft,nextPosition};if(typeof module!=='undefined')module.exports=api;else root.NotaCanvas=api;
})(typeof window!=='undefined'?window:globalThis);
