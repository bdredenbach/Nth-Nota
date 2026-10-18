const assert=require('node:assert/strict');
const {calculate,validateBackup}=require('../dist/core.js');
for(const [expression,expected]of [['24 * 7',168],['(120 + 80) / 4',50],['2+3*4',14],['2^3^2',512],['-2^2',-4],['(-2)^2',4],['50%',.5],['200*15%',30],['1e3 + .5',1000.5],['12 × 3 ÷ 2',18],['0.1+0.2',.3]])assert.equal(calculate(expression),expected,expression);
for(const expression of ['','hello','1/0','2+','2(3)','alert(1)','1;global.x=1','1..2','(2+3','2**3'])assert.throws(()=>calculate(expression),expression);
const backup={format:'nth-nota',version:1,workspaces:[{id:'everyday',name:'Everyday'}],items:[{id:'note-1',workspace:'everyday',type:'note',title:'Hello',html:'<p>Hello</p>',x:40,y:40,w:300,h:200}]};
assert.equal(validateBackup(structuredClone(backup)).items[0].title,'Hello');
for(const mutate of [x=>x.version=20,x=>x.workspaces=[],x=>x.items[0].workspace='missing',x=>x.items[0].id='" onload="evil',x=>x.items[0].preview='https://example.com/tracker',x=>x.items[0].data='javascript:evil()',x=>x.items.push({...x.items[0]}),x=>x.items[0].drawing={strokes:[{points:[[null,3]]}]}]){const b=structuredClone(backup);mutate(b);assert.throws(()=>validateBackup(b));}
console.log('Core checks passed: arithmetic, invalid expressions, backup roundtrip, and malformed backup rejection.');
const {rememberVersion,restoreItem}=require('../dist/core.js');
const note={title:'First',html:'<p>Original</p>'};for(let i=0;i<20;i++){rememberVersion(note,1000+i);note.title='Edit '+i;}
assert.equal(note.history.length,15);assert.equal(note.history[0].at,1005);assert.equal(note.history.at(-1).title,'Edit 18');
const deleted={deletedAt:1000,reminder:{when:1100,fired:false}};restoreItem(deleted,2000);assert.equal(deleted.deletedAt,undefined);assert.equal(deleted.reminder.fired,true);
const withHistory=structuredClone(backup);withHistory.items[0].history=[{at:1000,title:'Old title',html:'<p>Old text</p>'}];withHistory.items[0].deletedAt=2000;assert.equal(validateBackup(withHistory).items[0].history[0].title,'Old title');
console.log('Recovery checks passed: bounded note history, trash restore, and backup preservation.');
