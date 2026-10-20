const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../dist/desk-tools.js'),Dates=require('../dist/date-memory.js'),Core=require('../dist/core.js');
let serial=0;const uid=()=>`id-${++serial}`;
const entry=(title,values={})=>({id:uid(),title,tags:'rules, fantasy',body:'A useful detail',values,links:[]});
const desk=items=>({format:'nth-nota',version:1,workspaces:[{id:'desk',name:'Everyday'}],items:items.map(n=>({id:uid(),workspace:'desk',type:'note',title:'My tool',html:'',x:0,y:0,w:340,h:280,...n}))});
test('Index Builder searches titles, tags, custom fields and tabs, and prunes links on deletion',()=>{
 const b=T.index(uid),a=b.tabs[0],c=entry('Archer',{[a.fields[0].id]:'Dexterity 17'});a.cards.push(c);const z={id:uid(),name:'Rulebook',fields:[],cards:[entry('Ranged attacks')]};b.tabs.push(z);c.links.push({tabId:z.id,cardId:z.cards[0].id});
 assert.equal(T.indexMatches(b,{query:'dexterity 17',tabId:a.id}).length,1);assert.equal(T.indexMatches(b,{tag:'FANTASY'}).length,2);assert.equal(T.indexMatches(b,{query:'rulebook',tabId:a.id}).length,0);assert.equal(T.indexMatches(b,{query:'rulebook'}).length,1);T.validateNote({index:b});
 T.removeIndexCard(b,z.cards[0].id);assert.deepEqual(c.links,[]);assert.equal(a.cards[0],c);assert.equal(b.tabs.length,2);
});
test('Index Builder rejects invented links, duplicate identifiers and invalid field values',()=>{
 const b=T.index(uid),t=b.tabs[0];t.cards.push(entry('First'));for(const mutate of [v=>v.tabs[0].cards[0].links.push({tabId:t.id,cardId:'missing'}),v=>v.tabs.push(structuredClone(v.tabs[0])),v=>v.tabs[0].cards[0].values.unknown='Bad',v=>v.selectedCard='missing']){const bad=structuredClone(b);mutate(bad);assert.throws(()=>T.validateNote({index:bad}));}
});
test('Reusable text and index content export as escaped text without executing HTML',()=>{
 const s=T.shelf(uid);s.entries[0].text='<script>alert(1)</script>\n**Markdown**';assert(T.shelfHTML(s).includes('&lt;script&gt;'));assert(!T.shelfHTML(s).includes('<script>'));const b=T.index(uid);b.tabs[0].cards.push(entry('<img onerror=bad>'));assert(!T.indexHTML(b).includes('<img'));
});
test('Progress bars clamp at 100 percent while preserving the actual totals',()=>{
 const h=T.streak(uid).habits[0];h.goal=5;h.logs={'2026-10-19':3,'2026-10-20':4};assert.deepEqual(T.progress(h),{total:7,percent:100});assert.equal(h.goal,5);h.logs={};assert.equal(T.progress(h).percent,0);
});
test('Streaks require a daily target, count yesterday through today, and handle date boundaries',()=>{
 const h=T.streak(uid).habits[0];h.dailyTarget=2;h.logs={'2026-10-17':2,'2026-10-18':2,'2026-10-19':2,'2026-10-20':1};assert.deepEqual(T.streaks(h,'2026-10-20'),{current:3,best:3});h.logs['2026-10-20']=2;assert.deepEqual(T.streaks(h,'2026-10-20'),{current:4,best:4});assert.equal(T.shiftDate('2024-02-28',1),'2024-02-29');assert.equal(T.shiftDate('2025-12-31',1),'2026-01-01');assert(!T.validDate('2026-02-29'));const days=T.heatDays('2026-10-20');assert.equal(days.length,364);assert.equal(new Set(days).size,364);assert.equal(days.at(-1),'2026-10-20');
});
test('A study session filters tags, skips unfinished cards and requires a revealed answer',()=>{
 const d=T.flash(uid);d.cards[0].front='Question';d.cards[0].back='Answer';d.cards[0].tags='rules';d.cards.push({...d.cards[0],id:uid(),tags:'history'},{...d.cards[0],id:uid(),back:''});assert.deepEqual(T.studyOrder(d,'RULES'),[d.cards[0].id]);d.study={active:true,flipped:false,cursor:0,order:[d.cards[0].id]};assert.throws(()=>T.rateCard(d,true));d.study.flipped=true;T.rateCard(d,true,123);assert.equal(d.cards[0].reviews,1);assert.equal(d.cards[0].known,true);assert.equal(d.cards[0].lastReview,123);assert.equal(d.study.active,false);assert.throws(()=>T.rateCard(d,false));T.validateNote({flash:d});
});
test('The five Desk tools survive complete backup validation and round trips',()=>{
 const d=desk([{inputMode:'index',index:T.index(uid)},{inputMode:'snippets',snippets:T.shelf(uid)},{inputMode:'streak',streak:T.streak(uid)},{inputMode:'flash',flash:T.flash(uid)},{inputMode:'scanner',scanner:T.scanner()}]);assert.deepEqual(Core.validateBackup(JSON.parse(JSON.stringify(d))),d);
});
test('Desk model limits reject malformed data instead of importing corrupted content',()=>{
 const cases=[{snippets:{entries:[{id:'a',title:'x',tags:'',text:'x'.repeat(20001)}],selected:'a'}},{streak:{habits:[{id:'a',name:'Habit',unit:'pages',goal:0,dailyTarget:1,logs:{}}],selected:'a'}},{streak:{habits:[{id:'a',name:'Habit',unit:'pages',goal:30,dailyTarget:1,logs:{'2026-02-31':1}}],selected:'a'}},{flash:{cards:[],selected:null,study:{active:true,flipped:false,cursor:0,order:['missing']}}},{inputMode:'scanner'},{scanner:{pages:[],pdfPages:21,notes:''}},{scanner:{pages:[{id:'a',data:'data:image/jpeg;base64,aGVsbG8=',rotation:45,filter:'clean',margin:0}],pdfPages:0,notes:''}}];for(const n of cases)assert.throws(()=>T.validateNote(n));
});
test('Date suggestions recognize the birthday example, ordinals, abbreviations and explicit years',()=>{
 assert.deepEqual(Dates.detect("Calendar Note: October 12th - Mykayla's Birthday",{year:2026}).map(c=>[c.date,c.title]),[['2026-10-12',"Mykayla's Birthday"]]);for(const text of ['October 12th, 2027','12th of October 2027','2027-10-12','Oct. 12 2027'])assert.equal(Dates.detect(text)[0].date,'2027-10-12');for(const month of ['September','Sept','Sep'])assert.equal(Dates.detect(month+' 2nd',{year:2026})[0].date,'2026-09-02');
});
test('Date suggestions reject invalid and ambiguous dates and deduplicate the same event',()=>{
 for(const text of ['February 29 2026','April 31 2026','2026-02-31','10/12','next week','October 12 2200'])assert.deepEqual(Dates.detect(text,{year:2026}),[]);assert.equal(Dates.detect('February 29 2024')[0].date,'2024-02-29');assert.equal(Dates.detect('October 12: Birthday\nOctober 12: Birthday',{year:2026}).length,1);assert.equal(Dates.detect('October 12: Birthday\nOctober 12: Lunch',{year:2026}).length,2);
});
test('Remembered calendar entries retain their source and reject malformed source metadata',()=>{
 const Planning=require('../dist/planning.js'),calendar=Planning.calendar();calendar.events.push({id:'event',date:'2026-10-12',time:'',title:'Birthday',body:'October 12',sourceItemId:'source',sourceKey:'2026-10-12-abc'});const d=desk([{inputMode:'calendar',calendar}]);assert.deepEqual(Core.validateBackup(structuredClone(d)),d);d.items[0].calendar.events[0].sourceKey={};assert.throws(()=>Core.validateBackup(d));
});
