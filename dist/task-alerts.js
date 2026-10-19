(function(root){'use strict';
function entries(items){return items.filter(n=>!n.deletedAt&&n.type==='task').flatMap(n=>(n.tasks||[]).filter(t=>!t.done&&t.id&&t.notification&&(t.notification.ongoing||t.notification.when>0)).map(t=>({id:n.id+':'+t.id,itemId:n.id,rev:t.notification.rev,when:t.notification.when||0,ongoing:!!t.notification.ongoing,title:n.title.slice(0,120),body:t.text.slice(0,1000)})));}
function merge(items,actions){for(const n of items){if(n.deletedAt||n.type!=='task')continue;for(const t of n.tasks||[]){const a=actions.find(a=>a.id===n.id+':'+t.id&&a.rev===t.notification?.rev);if(!a)continue;if(a.action==='complete')t.done=true;if(['complete','stop'].includes(a.action))delete t.notification;}}}
const api={entries,merge};if(typeof module!=='undefined')module.exports=api;else root.NotaTasks=api;
})(typeof window!=='undefined'?window:globalThis);
