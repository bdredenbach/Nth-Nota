const test=require('node:test'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const DB=require('./fixtures/gateway-db.cjs'),providers=import('../cloud/free-providers.mjs');
const environment=()=>({FREE_ONLY_CONFIRMED:'yes',IP_HASH_SALT:'test-salt',DB:new DB(),GROQ_API_KEY:'test-only-groq',TAVILY_API_KEY:'test-only-tavily',AI:{run:async()=>({response:'Cloudflare reply'})}});
const groq=(text='Groq reply',finish='stop')=>Response.json({choices:[{message:{content:text},finish_reason:finish}]});
const searchResult=()=>Response.json({results:[{title:'A source',url:'https://source.example/article',content:'A verified public excerpt.',text:'A verified public excerpt.'}],usage:{credits:1}});
const write={task:'proofread',prompt:'Fix my short text.'};
const chat={task:'conversation',chatMessages:[{role:'system',content:'Be helpful.'},{role:'user',content:'Explain rainbows.'}]};

test('task preferences cover writing, conversations, research, creative work and launcher help',async()=>{
 const {providerOrder}=await providers,e=environment();
 for(const task of ['proofread','polish','summarize','launcher'])assert.deepEqual(providerOrder(task,e),['cloudflare','groq']);
 for(const task of ['conversation','research','brainstorm','generate'])assert.deepEqual(providerOrder(task,e),['groq','cloudflare']);
 delete e.GROQ_API_KEY;assert.deepEqual(providerOrder('conversation',e),['cloudflare']);
 e.GROQ_API_KEY='test-only';delete e.AI;assert.deepEqual(providerOrder('proofread',e),['groq']);
});
test('Groq conversation outage switches to Cloudflare and other requests share its cooldown',async()=>{
 const {createFreeServices}=await providers,e=environment();let cf=0,g=0;e.AI.run=async()=>{cf++;return{response:'Cloudflare takeover'};};
 const service=createFreeServices(e,async()=>{g++;return new Response('unavailable',{status:503});});
 for(let i=0;i<2;i++)assert.equal((await service.generate(chat)).provider,'cloudflare');
 assert.equal(g,1);assert.equal(cf,2);
});
test('Cloudflare writing outage switches to Groq and requests never enable built-in paid tools',async()=>{
 const {createFreeServices}=await providers,e=environment();let cf=0,g=0;e.AI.run=async()=>{cf++;throw Error('offline');};
 const service=createFreeServices(e,async(url,options)=>{g++;const payload=JSON.parse(options.body);assert.equal(payload.model,'openai/gpt-oss-20b');assert.equal(payload.reasoning_effort,'low');assert.equal(payload.tool_choice,'none');assert.deepEqual(payload.tools,[]);assert.equal(options.redirect,'error');return groq();});
 for(let i=0;i<2;i++)assert.equal((await service.generate(write)).provider,'groq');assert.equal(cf,1);assert.equal(g,2);
});
test('a provider recovers after its shared cooldown without an owner reset',async()=>{
 const {createFreeServices}=await providers,e=environment();let time=Date.now(),attempts=0;e.AI.run=async()=>{if(++attempts===1)throw{status:429,message:'rate limited'};return{response:'Recovered'};};
 const service=()=>createFreeServices(e,async()=>groq(),{now:()=>time});
 assert.equal((await service().generate(write)).provider,'groq');assert.equal((await service().generate(write)).provider,'groq');
 time+=61000;assert.equal((await service().generate(write)).text,'Recovered');assert.equal(attempts,2);
});
test('timeouts attempt the other provider and discard a late model result',async()=>{
 const {createFreeServices}=await providers,e=environment();let complete;
 e.AI.run=()=>new Promise(resolve=>{complete=resolve;});
 const result=await createFreeServices(e,async()=>groq('Fallback after timeout'),{attemptMs:8}).generate(write);
 assert.equal(result.text,'Fallback after timeout');complete({response:'Late original reply'});assert(e.DB.cooldowns.has('cloudflare'));
});
test('bad credentials and truncated/invalid model output can use the other model',async()=>{
 const {createFreeServices}=await providers;
 for(const fixture of [()=>new Response('',{status:401}),()=>groq('', 'length'),()=>groq('invalid JSON')]){
  const e=environment();e.AI.run=async()=>({response:'{"action":"answer","text":"A valid reply"}'});
  const result=await createFreeServices(e,async()=>fixture()).generate({...chat,accept:text=>{try{return JSON.parse(text).action==='answer';}catch{return false;}}});
  assert.equal(result.provider,'cloudflare');assert.equal(JSON.parse(result.text).text,'A valid reply');
 }
});
test('a safety refusal never tries a second model, even when it is healthy',async()=>{
 const {createFreeServices}=await providers,e=environment();let cf=0;e.AI.run=async()=>{cf++;return{response:'must not use'};};
 await assert.rejects(createFreeServices(e,async()=>Response.json({choices:[{message:{refusal:'Refused'},finish_reason:'stop'}]})).generate(chat),error=>error.code==='SAFETY');
 assert.equal(cf,0);
});
test('provider 429 honors Retry-After and repeated requests skip the resting provider',async()=>{
 const {createFreeServices}=await providers,e=environment();let attempts=0;
 const service=createFreeServices(e,async()=>{attempts++;return new Response('',{status:429,headers:{'Retry-After':'120'}});});
 assert.equal((await service.generate(chat)).provider,'cloudflare');assert.equal((await service.generate(chat)).provider,'cloudflare');assert.equal(attempts,1);
 assert(e.DB.cooldowns.get('groq')>=Date.now()+119000);
});
test('an unavailable AI binding still allows the configured Groq provider at the HTTP entry point',async()=>{
 const {handle}=await import('../cloud/worker.mjs'),e=environment();delete e.AI;
 const req=new Request('https://gateway.test/v1/write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...write,consentAccepted:true})});
 assert.equal((await(await handle(req,e,async()=>groq())).json()).provider,'groq');
});
test('search configuration is free-only and never routes through Cloudflare billing',async()=>{
 const {searchProviders,searchConfigured}=await providers,e=environment();e.EXA_API_KEY='test-only-exa';
 assert.deepEqual(searchProviders(e),['tavily','exa']);assert.equal(searchConfigured({...e,FREE_ONLY_CONFIRMED:'no'}),false);
 for(const mode of ['off','cloudflare','paid','unknown'])assert.equal(searchConfigured({...e,NOTA_WEB_SEARCH:mode}),false);
 assert.deepEqual(searchProviders({...e,NOTA_WEB_SEARCH:'tavily'}),['tavily']);
});
test('Tavily uses one-credit basic search with all automatic upgrades and answer generation disabled',async()=>{
 const {createFreeServices}=await providers,e=environment();let searches=0;
 const result=await createFreeServices(e,async(url,options)=>{
  searches++;assert.equal(url,'https://api.tavily.com/search');assert.equal(options.headers.Authorization,'Bearer test-only-tavily');assert.equal(options.redirect,'error');
  const p=JSON.parse(options.body);assert.equal(p.search_depth,'basic');assert.equal(p.auto_parameters,false);assert.equal(p.include_answer,false);assert.equal(p.include_raw_content,false);assert.equal(p.max_results,3);assert.equal(p.query.length,400);
  return searchResult();
 }).search('q'.repeat(500));assert.equal(result.provider,'tavily');assert.equal(searches,1);assert.equal(result.sources[0].url,'https://source.example/article');
});
test('Tavily outage uses an optional Exa search key and skips Tavily during cooldown',async()=>{
 const {createFreeServices}=await providers,e=environment();e.EXA_API_KEY='test-only-exa';let t=0,x=0;
 const service=createFreeServices(e,async(url,options)=>{
  if(url==='https://api.tavily.com/search'){t++;return new Response('',{status:503});}
  assert.equal(url,'https://api.exa.ai/search');assert.equal(options.headers['x-api-key'],'test-only-exa');
  const p=JSON.parse(options.body);assert.equal(p.type,'auto');assert.equal(p.numResults,3);assert.deepEqual(p.contents,{text:{maxCharacters:1000}});x++;return searchResult();
 });
 for(let i=0;i<2;i++)assert.equal((await service.search('current question')).provider,'exa');assert.equal(t,1);assert.equal(x,2);
});
test('a search quota error rests until next month, and missing backup keys never create hidden requests',async()=>{
 const {createFreeServices}=await providers,e=environment();let requests=0;
 const service=createFreeServices(e,async()=>{requests++;return new Response('',{status:432});});
 await assert.rejects(service.search('latest news'),error=>error.code==='RATE_LIMIT');
 await assert.rejects(service.search('latest news'),error=>error.code==='RATE_LIMIT');assert.equal(requests,1);
 const d=new Date();assert.equal(e.DB.cooldowns.get('tavily'),Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1));
});
test('search strips unsafe links, deduplicates and bounds excerpts before passing them to a model',async()=>{
 const {createFreeServices}=await providers,e=environment();
 const result=await createFreeServices(e,async()=>Response.json({results:[
  {title:'bad',url:'javascript:alert(1)',content:'bad'}, {title:'bad',url:'https://user:secret@host.example/a',content:'bad'},
  {title:'bad',url:'https://127.0.0.1/a',content:'bad'},
  ...Array.from({length:5},(_,i)=>({title:'Source '+i,url:'https://source.example/'+i,content:'x'.repeat(3000)})),
  {title:'Duplicate',url:'https://source.example/0#part',content:'same'},
 ]})).search('find facts');
 assert.equal(result.sources.length,3);assert.equal(result.sources[0].text.length,1000);assert(result.sources.every(s=>s.url.startsWith('https://source.example/')));
});
test('unexpected search pricing stops that provider rather than silently escalating cost',async()=>{
 const {createFreeServices}=await providers,e=environment();let calls=0;
 const service=createFreeServices(e,async()=>{calls++;return Response.json({results:[],usage:{credits:2}});});
 await assert.rejects(service.search('question'),error=>error.code==='RATE_LIMIT');await assert.rejects(service.search('question'),error=>error.code==='RATE_LIMIT');assert.equal(calls,1);
});
test('an empty search does not disable the service for everyone else',async()=>{
 const {createFreeServices}=await providers,e=environment();let calls=0;
 const service=createFreeServices(e,async()=>++calls===1?Response.json({results:[]}):searchResult());
 assert.equal((await service.search('obscure question')).sources.length,0);assert.equal((await service.search('different question')).sources.length,1);assert.equal(e.DB.cooldowns.size,0);
});
test('concurrent search attempts stop at the shared monthly budget across service instances',async()=>{
 const {createFreeServices,FREE_LIMITS}=await providers,e=environment(),d=new Date();
 const expiry=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10);
 const key=expiry+'|budget:tavily:searches';e.DB.quota.set(key,FREE_LIMITS.tavilySearchesMonthly-2);let calls=0;
 const outcomes=await Promise.allSettled(Array.from({length:8},()=>createFreeServices(e,async()=>{calls++;return searchResult();}).search('a question')));
 assert.equal(calls,2);assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,2);assert.equal(e.DB.quota.get(key),FREE_LIMITS.tavilySearchesMonthly);
});
test('daily cleanup cannot erase a current monthly budget and new month has a separate allowance',async()=>{
 const {createFreeServices,FREE_LIMITS}=await providers,e=environment();let time=Date.UTC(2026,10,17);
 e.DB.quota.set('2026-11-30|budget:tavily:searches',FREE_LIMITS.tavilySearchesMonthly);
 await e.DB.prepare('DELETE FROM quota WHERE day < ?').bind('2026-11-15').run();assert.equal(e.DB.quota.size,1);
 await assert.rejects(createFreeServices(e,async()=>searchResult(),{now:()=>time}).search('question'),error=>error.code==='RATE_LIMIT');
 time=Date.UTC(2026,11,1);const result=await createFreeServices(e,async()=>searchResult(),{now:()=>time}).search('question');assert.equal(result.provider,'tavily');assert.equal(e.DB.quota.get('2026-12-31|budget:tavily:searches'),1);
});
test('local model budgets route to the other provider without exceeding the configured allowance',async()=>{
 const {createFreeServices,FREE_LIMITS}=await providers,e=environment(),day=new Date().toISOString().slice(0,10);let cf=0;
 e.DB.quota.set(day+'|budget:cloudflare:neurons',FREE_LIMITS.cloudflareNeuronsDaily);e.AI.run=async()=>{cf++;return{response:'must not run'};};
 assert.equal((await createFreeServices(e,async()=>groq()).generate(write)).provider,'groq');assert.equal(cf,0);
});
test('long context uses Cloudflare without taking Groq down for subsequent small questions',async()=>{
 const {createFreeServices}=await providers,e=environment();let groqCalls=0;
 const service=createFreeServices(e,async()=>{groqCalls++;return groq();});
 assert.equal((await service.generate({...chat,chatMessages:[{role:'user',content:'x'.repeat(8000)}]})).provider,'cloudflare');
 assert.equal((await service.generate(chat)).provider,'groq');assert.equal(groqCalls,1);
});
test('quota database failure stops inference and search before either upstream is contacted',async()=>{
 const {createFreeServices}=await providers,e=environment();e.DB.fail=true;let calls=0;e.AI.run=async()=>{calls++;};
 const service=createFreeServices(e,async()=>{calls++;return searchResult();});
 await assert.rejects(service.generate(write),error=>error.code==='STORAGE');await assert.rejects(service.search('question'),error=>error.code==='STORAGE');assert.equal(calls,0);
});
test('the actual weighted SQL is atomic in SQLite when concurrent clients reserve the same budget',async()=>{
 const {BUDGET_SQL}=await providers,dir=fs.mkdtempSync(path.join(os.tmpdir(),'nota-budget-'));
 try{
  const result=JSON.parse(execFileSync('python3',['-c',`import sqlite3,concurrent.futures,json,sys
file,sql=sys.argv[1:]
c=sqlite3.connect(file);c.execute('CREATE TABLE quota(day TEXT,bucket TEXT,used INTEGER,PRIMARY KEY(day,bucket))');c.commit();c.close()
def reserve(_):
 c=sqlite3.connect(file,timeout=10)
 row=c.execute(sql,('2026-11-30','budget:tavily:searches',3,10)).fetchone();c.commit();c.close();return row is not None
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool: results=list(pool.map(reserve,range(20)))
c=sqlite3.connect(file);used=c.execute('SELECT used FROM quota').fetchone()[0];print(json.dumps({'accepted':sum(results),'used':used}))`,path.join(dir,'budget.sqlite'),BUDGET_SQL],{encoding:'utf8'}));
  assert.deepEqual(result,{accepted:3,used:9});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('dashboard bundle is self-contained and runs the same chat/search/failover behavior',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nota-bundle-')),destination=path.join(dir,'worker.mjs');
 try{
  execFileSync(process.execPath,['tools/package-chat-worker.cjs',destination]);execFileSync(process.execPath,['--check',destination]);const bundled=await import('file://'+destination);
  const e=environment();delete e.GROQ_API_KEY;delete e.TAVILY_API_KEY;e.AI.run=async()=>({response:'{"action":"answer","text":"Fallback worked"}'});
  const response=await bundled.default.fetch(new Request('https://gateway.test/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Explain rainbows.',messages:[],mode:'auto',timezone:'UTC',consentAccepted:true})}),e);
  assert.equal(response.status,200);assert.equal((await response.json()).text,'Fallback worked');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
