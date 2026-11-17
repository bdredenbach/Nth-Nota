const test=require('node:test'),assert=require('node:assert/strict');
const DB=require('./fixtures/gateway-db.cjs'),services=import('../cloud/free-providers.mjs');
const env=()=>({FREE_ONLY_CONFIRMED:'yes',DB:new DB(),RIVETER_API_KEY:'test-riveter'});
const account=(plan='free',balance=250)=>Response.json({request_status:'success',account:{plan,credit:{balance},name:'Private owner',api_key_info:{name:'Private key name'}}});
const riveter=(extra={})=>Response.json({id:'run_test',type:'quick_search',status:'success',credits_used:.04,output:{results:[{title:'Public source',link:'https://reference.example/facts',snippet:'A factual excerpt from a public source.'}]},...extra});
const context=()=>Response.json({results:[{title:'Context source',url:'https://reference.example/context',description:'A second public factual excerpt.'}],key_metadata:{credits_consumed:1}});

test('generic Context secrets remain unused until their exact provider is configured',async()=>{
 const {searchProviders,pageProviders,gatewayCapabilities}=await services,e={...env(),CONTEXT_API_KEY:'a-key-with-an-ambiguous-name'};
 assert.deepEqual(searchProviders(e),['riveter']);assert.deepEqual(pageProviders(e),[]);assert.equal(gatewayCapabilities(e).contextProviderRequired,true);
 e.NOTA_CONTEXT_PROVIDER='context.dev';assert.deepEqual(searchProviders(e),['riveter','context']);assert.deepEqual(pageProviders(e),['context']);assert.equal(gatewayCapabilities(e).contextProviderRequired,false);
 e.NOTA_CONTEXT_PROVIDER='context7';assert.deepEqual(searchProviders(e),['riveter']);
});
test('Riveter checks the Free plan and caps a synchronous quick-search request without starting agent jobs',async()=>{
 const {createFreeServices}=await services,e=env(),calls=[];
 const found=await createFreeServices(e,async(url,options)=>{
  calls.push(url);assert.equal(options.headers.Authorization,'Bearer test-riveter');assert.equal(options.redirect,'error');
  if(url.endsWith('/account'))return account();
  assert.equal(url,'https://api.riveterhq.com/v1/quick_search');const p=JSON.parse(options.body);assert.equal(p.query,'latest public facts');assert.equal(p.max_credits,.04);assert.match(p.run_key,/^nota-[\w-]+$/);assert.deepEqual(Object.keys(p).sort(),['max_credits','query','run_key']);return riveter();
 }).search('latest public facts');
 assert.deepEqual(calls,['https://api.riveterhq.com/v1/account','https://api.riveterhq.com/v1/quick_search']);assert.equal(found.provider,'riveter');assert.equal(found.sources[0].url,'https://reference.example/facts');
 const stored=JSON.stringify([...e.DB.quota]);assert(!stored.includes('Private owner'));assert(!stored.includes('latest public facts'));assert(!stored.includes('test-riveter'));
});
test('paid, unverifiable or empty Riveter accounts never start a search or a refill',async()=>{
 const {createFreeServices}=await services;
 for(const reply of [()=>account('pro'),()=>account('free',0),()=>Response.json({request_status:'error'}),()=>account('free','250')]){
  const e=env(),calls=[];const service=createFreeServices(e,async(url)=>{calls.push(url);return reply();});
  await assert.rejects(service.search('question'));await assert.rejects(service.search('question'));
  assert.deepEqual(calls,['https://api.riveterhq.com/v1/account']);
 }
});
test('Riveter credit ceilings and unexpected reported prices stop further attempts until reset',async()=>{
 const {createFreeServices}=await services;
 for(const fixture of [()=>Response.json({error:{type:'credit_cap_exceeded'}},{status:422}),()=>riveter({credits_used:.05})]){
  const e=env();let searches=0;
  const service=createFreeServices(e,async(url)=>url.endsWith('/account')?account():(searches++,fixture()));
  await assert.rejects(service.search('question'),e=>e.code==='RATE_LIMIT');await assert.rejects(service.search('question'),e=>e.code==='RATE_LIMIT');assert.equal(searches,1);
 }
});
test('the four-provider search chain reaches Riveter only after the other services fail',async()=>{
 const {createFreeServices}=await services,e={...env(),TAVILY_API_KEY:'test-tavily',EXA_API_KEY:'test-exa',FIRECRAWL_API_KEY:'test-firecrawl'},calls=[];
 const found=await createFreeServices(e,async(url)=>{calls.push(url);return url.endsWith('/account')?account():url.endsWith('/quick_search')?riveter():new Response('',{status:503});}).search('question');
 assert.equal(found.provider,'riveter');assert.deepEqual(calls,['https://api.tavily.com/search','https://api.exa.ai/search','https://api.firecrawl.dev/v2/search','https://api.riveterhq.com/v1/account','https://api.riveterhq.com/v1/quick_search']);
});
test('Context.dev basic search uses the confirmed key only at its fixed endpoint',async()=>{
 const {createFreeServices}=await services,e={...env(),RIVETER_API_KEY:'',CONTEXT_API_KEY:'test-context',NOTA_CONTEXT_PROVIDER:'context.dev'};
 const found=await createFreeServices(e,async(url,options)=>{
  assert.equal(url,'https://api.context.dev/v1/web/search');assert.equal(options.headers.Authorization,'Bearer test-context');const p=JSON.parse(options.body);assert.equal(p.numResults,3);assert.equal(p.descriptionMaxCharacters,1000);assert(!('formats' in p));assert(!('pageContent' in p));return context();
 }).search('question');assert.equal(found.provider,'context');assert.equal(found.sources[0].text,'A second public factual excerpt.');
});
test('a Context usage-exceeded error on HTTP 401 is treated as exhausted credits',async()=>{
 const {createFreeServices}=await services,e={...env(),RIVETER_API_KEY:'',CONTEXT_API_KEY:'test-context',NOTA_CONTEXT_PROVIDER:'context.dev'};let calls=0;
 const service=createFreeServices(e,async()=>{calls++;return Response.json({error_code:'USAGE_EXCEEDED'},{status:401});});
 await assert.rejects(service.search('question'),e=>e.code==='RATE_LIMIT');await assert.rejects(service.search('question'),e=>e.code==='RATE_LIMIT');assert.equal(calls,1);
});
test('Riveter processing/error envelopes and knowledge graphs are never treated as completed source evidence',async()=>{
 const {createFreeServices}=await services;
 for(const payload of [{status:'processing',output:null},{status:'stopped'},{output:{knowledge_graph:{title:'Unverified answer'}}},{output:{results:[{title:'Unsafe',link:'https://user:password@reference.example/',snippet:'not acceptable'}]}}]){
  try{const found=await createFreeServices(env(),async(url)=>url.endsWith('/account')?account():riveter(payload)).search('question');assert.deepEqual(found.sources,[]);}
  catch(error){assert.equal(error.code,'UNAVAILABLE');}
 }
});
test('the shared Riveter request budget stops concurrent searches before upstream account or search calls',async()=>{
 const {createFreeServices,FREE_LIMITS}=await services,e=env(),d=new Date(),expiry=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10),key=expiry+'|budget:riveter:searches';
 e.DB.quota.set(key,FREE_LIMITS.riveterSearchesMonthly-1);let accounts=0,searches=0;
 const results=await Promise.allSettled(Array.from({length:6},()=>createFreeServices(e,async(url)=>url.endsWith('/account')?(accounts++,account()):(searches++,riveter())).search('question')));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(accounts,1);assert.equal(searches,1);assert.equal(e.DB.quota.get(key),FREE_LIMITS.riveterSearchesMonthly);
});
test('versioned capabilities expose configured names and the Context setup gap, without querying providers or revealing keys',async()=>{
 const {handle}=await import('../cloud/worker.mjs'),e={...env(),IP_HASH_SALT:'test-salt',AI:{run(){throw Error('must not run');}},CONTEXT_API_KEY:'private-context-key'};
 const result=await handle(new Request('https://gateway.example/v1/capabilities'),e,async()=>{throw Error('must not fetch');}),body=await result.json();
 assert.equal(body.chatVersion,1);assert.equal(body.gatewayVersion,2);assert.equal(body.contextProviderRequired,true);assert.deepEqual(body.configuredProviders.search,['riveter']);assert(!JSON.stringify(body).includes('private-context-key'));assert.equal(e.DB.quota.size,0);
});
