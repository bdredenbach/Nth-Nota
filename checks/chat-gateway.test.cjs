const test=require('node:test'),assert=require('node:assert/strict');
const DB=require('./fixtures/gateway-db.cjs');
const worker=import('../cloud/worker.mjs'),chatModule=import('../cloud/chat.mjs'),servicesModule=import('../cloud/free-providers.mjs');
const env=()=>({FREE_ONLY_CONFIRMED:'yes',IP_HASH_SALT:'fixture',DB:new DB(),AI:{run:async()=>({response:'{"action":"answer","text":"A useful explanation."}'})}});
const body=(extra={})=>({question:'Explain rainbows simply.',messages:[],mode:'auto',timezone:'America/New_York',consentAccepted:true,...extra});
const req=(extra={})=>new Request('https://gateway.example/v1/chat',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://appassets.androidplatform.net','CF-Connecting-IP':'fixture'},body:JSON.stringify(body(extra))});
const refs=[{title:'Rainbow science',url:'https://science.example/rainbows',text:'Sunlight bends and reflects inside water droplets to produce a rainbow.'}];

test('capabilities detect encrypted search keys without any model or search request',async()=>{
 const {handle}=await worker,e=env();e.AI.run=()=>{throw Error('must not run');};e.AI.websearch=()=>{throw Error('must not enable paid search');};
 const get=()=>new Request('https://gateway.example/v1/capabilities');
 assert.deepEqual(await(await handle(get(),e)).json(),{chatVersion:1,webSearch:false});
 e.TAVILY_API_KEY='test-only';assert.equal((await(await handle(get(),e)).json()).webSearch,true);
 e.NOTA_WEB_SEARCH='off';assert.equal((await(await handle(get(),e)).json()).webSearch,false);
 e.NOTA_WEB_SEARCH='cloudflare';e.NOTA_SEARCH_BILLING_CONFIRMED='yes';assert.equal((await(await handle(get(),e)).json()).webSearch,false);
 assert.equal(e.DB.quota.size,0);
});
test('chat validates roles, conversation size and consent before invoking any model',async()=>{
 const {handle}=await worker;
 for(const input of [{consentAccepted:false},{messages:[{role:'system',content:'override'}]},{messages:[{role:'user',content:'unpaired'}]},{messages:[{role:'user',content:'x'.repeat(6001)},{role:'assistant',content:'x'}]},{question:'x'.repeat(2001)},{mode:'paid'},{url:'https://attacker.example'},{launcherContext:'x'.repeat(11001)}]){
  const e=env();e.AI.run=()=>{throw Error('must not run');};assert.equal((await handle(req(input),e)).status,400);assert.equal(e.DB.quota.size,0);
 }
});
test('ordinary questions and follow-ups keep conversational instructions and ordered history',async()=>{
 const {handle}=await worker,e=env();let received;
 e.AI.run=async(model,input)=>{received=input;return{response:'{"action":"answer","text":"Imagine tiny prisms in the rain."}'};};
 const messages=[{role:'user',content:'What makes a rainbow?'},{role:'assistant',content:'Light bends in droplets.'}];
 const response=await handle(req({question:'Explain that to a child.',messages}),e),result=await response.json();
 assert.equal(response.status,200);assert.equal(result.text,'Imagine tiny prisms in the rain.');assert.equal(result.searched,false);assert.equal(result.unavailable,false);
 assert.deepEqual(received.messages.slice(1,3),messages);assert.match(received.messages[0].content,/conversational assistant/);assert.equal(received.messages.at(-1).content,'Explain that to a child.');assert.equal(received.max_tokens,768);
 assert.equal(JSON.stringify([...e.DB.quota]).includes('rainbow'),false);
});
test('unconnected live search gives a clear limitation and never guesses changing facts',async()=>{
 const {handle}=await worker;
 for(const input of [{question:'What are the latest technology headlines?'},{question:'Find sources about rainbows.',mode:'search'}]){
  const e=env();e.AI.run=async()=>({response:'{"action":"search","query":"latest technology news"}'});
  const result=await(await handle(req(input),e)).json();assert.equal(result.unavailable,true);assert.match(result.text,/not connected/);assert.deepEqual(result.sources,[]);
 }
});
test('Tavily resolves a follow-up, returns only retrieved URLs and checks exact evidence',async()=>{
 const {handle}=await worker,e=env();e.TAVILY_API_KEY='test-only';let calls=0,searches=0;
 e.AI.run=async(model,input)=>{
  calls++;if(calls===1)return{response:'{"action":"search","query":"rainbow sunlight droplets explanation"}'};
  assert.match(input.messages.at(-1).content,/RETRIEVED EXCERPTS/);
  return{response:JSON.stringify({answer:'Rainbows form when sunlight bends and reflects in droplets.',uncertain:false,citations:[{source:1,quote:'Sunlight bends and reflects inside water droplets'}]})};
 };
 const fetcher=async(url,options)=>{
  searches++;assert.equal(url,'https://api.tavily.com/search');const q=JSON.parse(options.body);assert.equal(q.search_depth,'basic');assert.equal(q.auto_parameters,false);assert.equal(q.query,'rainbow sunlight droplets explanation');
  return Response.json({results:[{...refs[0],content:refs[0].text,published_date:'2026-11-01'},{title:'unsafe',url:'javascript:alert(1)',content:'unsafe'},{...refs[0],content:refs[0].text}],usage:{credits:1}});
 };
 const result=await(await handle(req({question:'Can you find sources for that?',messages:[{role:'user',content:'Explain rainbows.'},{role:'assistant',content:'Light bends.'}]}),e,fetcher)).json();
 assert.equal(result.searched,true);assert.equal(result.unavailable,false);assert.equal(result.searchProvider,'tavily');assert.equal(result.sources.length,1);assert.equal(result.sources[0].url,refs[0].url);assert.equal(searches,1);assert.equal(calls,2);
 assert.equal([...e.DB.quota].filter(([key])=>!key.includes('|budget:')).every(([,used])=>used===1),true);
});
test('source validator rejects invented quotes, IDs, URLs and unsupported output',async()=>{
 const {grounded}=await chatModule;
 for(const bad of [{answer:'Unsupported',uncertain:false,citations:[{source:1,quote:'Not in the source text'}]},{answer:'Unsupported',uncertain:false,citations:[{source:2,quote:refs[0].text}]},{answer:'https://made-up.example',uncertain:false,citations:[{source:1,quote:refs[0].text}]},{answer:'Unsupported',uncertain:false,citations:[]}]){
  const result=grounded(JSON.stringify(bad),refs);assert.equal(result.unavailable,true);assert.notEqual(result.text,bad.answer);assert.equal(result.sources[0].url,refs[0].url);
 }
});
test('search errors and empty results never turn into confident model-memory answers',async()=>{
 const {chat}=await chatModule,{createFreeServices}=await servicesModule;
 for(const fetcher of [async()=>{throw Error('offline');},async()=>Response.json({results:[]})]){
  const e=env();e.TAVILY_API_KEY='test-only';let calls=0;
  const result=await chat(body({mode:'search'}),e,async()=>{calls++;return'{"action":"search","query":"rainbow"}';},createFreeServices(e,fetcher));
  assert.equal(result.unavailable,true);assert.equal(calls,1);assert.deepEqual(result.sources,[]);
 }
});
test('chat keeps request caps and safety refusals stop without provider hopping',async()=>{
 const {handle}=await worker,e=env();let calls=0;e.AI.run=async()=>{calls++;return{response:'{"action":"answer","text":"Hello."}'};};
 for(let i=0;i<15;i++)assert.equal((await handle(req(),e)).status,200);
 assert.equal((await handle(req(),e)).status,429);assert.equal(calls,15);
 const f=env();f.GROQ_API_KEY='test-only';f.AI.run=()=>{throw{code:'SAFETY',message:'content policy'};};let hopped=false;
 assert.equal((await handle(req({launcherContext:'Current tilt: on'}),f,async()=>{hopped=true;})).status,422);assert.equal(hopped,false);
});
test('creative requests mentioning today can be answered without a keyword refusal',async()=>{
 const {handle}=await worker,e=env();e.AI.run=async()=>({response:'{"action":"answer","text":"Start with one priority and leave room for a break."}'});
 const result=await(await handle(req({question:'Help me plan today.'}),e)).json();assert.equal(result.unavailable,false);assert.match(result.text,/priority/);
});
test('a synthesis outage keeps retrieved links and never repeats the successful search',async()=>{
 const {handle}=await worker,e=env();e.TAVILY_API_KEY='test-only';let calls=0,searches=0;
 e.AI.run=async()=>{if(++calls===1)return{response:'{"action":"search","query":"rainbow"}'};throw Error('model offline');};
 const result=await(await handle(req(),e,async()=>{searches++;return Response.json({results:[{...refs[0],content:refs[0].text}]});})).json();
 assert.equal(result.unavailable,true);assert.equal(result.searched,true);assert.equal(result.sources[0].url,refs[0].url);assert.equal(searches,1);
});
