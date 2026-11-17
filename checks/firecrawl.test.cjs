const test=require('node:test'),assert=require('node:assert/strict');
const DB=require('./fixtures/gateway-db.cjs'),services=import('../cloud/free-providers.mjs');
const environment=()=>({FREE_ONLY_CONFIRMED:'yes',DB:new DB(),FIRECRAWL_API_KEY:'test-only-firecrawl'});
const firecrawlResult=(extra={})=>Response.json({success:true,data:{web:[{title:'Public reference',url:'https://reference.example/article',description:'Sunlight bends and reflects inside water droplets to produce a rainbow.'}]},creditsUsed:2,...extra});
const monthlyKey=time=>new Date(Date.UTC(new Date(time).getUTCFullYear(),new Date(time).getUTCMonth()+1,0)).toISOString().slice(0,10)+'|budget:firecrawl:credits';

test('configured search routes use Tavily then Exa then Firecrawl and explicit modes stay isolated',async()=>{
 const {searchProviders}=await services,e={...environment(),TAVILY_API_KEY:'test-only-tavily',EXA_API_KEY:'test-only-exa'};
 assert.deepEqual(searchProviders(e),['tavily','exa','firecrawl']);
 assert.deepEqual(searchProviders({...e,NOTA_WEB_SEARCH:'firecrawl'}),['firecrawl']);
 assert.deepEqual(searchProviders({...e,NOTA_WEB_SEARCH:'tavily'}),['tavily']);
 assert.deepEqual(searchProviders({...e,NOTA_WEB_SEARCH:'exa'}),['exa']);
 assert.deepEqual(searchProviders({...e,FREE_ONLY_CONFIRMED:'no'}),[]);
 assert.deepEqual(searchProviders({...e,NOTA_WEB_SEARCH:'off'}),[]);
 assert.deepEqual(searchProviders({...e,FIRECRAWL_API_KEY:'',TAVILY_API_KEY:'',EXA_API_KEY:''}),[]);
});
test('two search outages reach Firecrawl basic search with no scrape, browser, agent or paid data options',async()=>{
 const {createFreeServices}=await services,e={...environment(),TAVILY_API_KEY:'test-only-tavily',EXA_API_KEY:'test-only-exa'},calls=[];
 const service=createFreeServices(e,async(url,options)=>{
  calls.push(url);
  if(url==='https://api.tavily.com/search')return new Response('',{status:429,headers:{'Retry-After':'60'}});
  if(url==='https://api.exa.ai/search')return new Response('',{status:503});
  assert.equal(url,'https://api.firecrawl.dev/v2/search');assert.equal(options.headers.Authorization,'Bearer test-only-firecrawl');assert.equal(options.redirect,'error');
  assert.deepEqual(JSON.parse(options.body),{query:'Explain rainbows',limit:3,sources:[{type:'web'}],domainTools:false,highlights:false,timeout:6500});
  return firecrawlResult();
 });
 assert.equal((await service.search('Explain rainbows')).provider,'firecrawl');
 assert.equal((await service.search('Explain rainbows')).provider,'firecrawl');
 assert.deepEqual(calls,['https://api.tavily.com/search','https://api.exa.ai/search','https://api.firecrawl.dev/v2/search','https://api.firecrawl.dev/v2/search']);
 assert.equal(e.DB.quota.get(monthlyKey(Date.now())),4);
});
test('a healthy primary search does not contact backup services or consume their credits',async()=>{
 const {createFreeServices}=await services,e={...environment(),TAVILY_API_KEY:'test-only-tavily',EXA_API_KEY:'test-only-exa'};let count=0;
 const result=await createFreeServices(e,async(url)=>{count++;assert.equal(url,'https://api.tavily.com/search');return Response.json({results:[{title:'Primary source',url:'https://reference.example/primary',content:'Primary source excerpt.'}]});}).search('question');
 assert.equal(result.provider,'tavily');assert.equal(count,1);assert.equal([...e.DB.quota.keys()].some(k=>k.includes('firecrawl')||k.includes('exa')),false);
});
test('Firecrawl credits are reserved atomically at two per attempt across concurrent requests',async()=>{
 const {createFreeServices,FREE_LIMITS}=await services,e=environment(),key=monthlyKey(Date.now());e.DB.quota.set(key,FREE_LIMITS.firecrawlCreditsMonthly-2);let calls=0;
 const outcomes=await Promise.allSettled(Array.from({length:6},()=>createFreeServices(e,async()=>{calls++;return firecrawlResult();}).search('question')));
 assert.equal(calls,1);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(e.DB.quota.get(key),FREE_LIMITS.firecrawlCreditsMonthly);
});
test('Firecrawl reserves a bounded free-minute allowance and becomes eligible after its reset',async()=>{
 const {createFreeServices,FREE_LIMITS}=await services,e=environment();let time=Date.UTC(2026,10,17,12,0,1),calls=0;
 const service=()=>createFreeServices(e,async()=>{calls++;return firecrawlResult();},{now:()=>time});
 for(let i=0;i<FREE_LIMITS.firecrawlRequestsMinute;i++)assert.equal((await service().search('question')).provider,'firecrawl');
 await assert.rejects(service().search('question'),error=>error.code==='RATE_LIMIT');assert.equal(calls,FREE_LIMITS.firecrawlRequestsMinute);
 time+=60000;assert.equal((await service().search('question')).provider,'firecrawl');assert.equal(calls,FREE_LIMITS.firecrawlRequestsMinute+1);
});
test('Firecrawl HTTP 402 rests until the next month without a paid upgrade or refill request',async()=>{
 const {createFreeServices}=await services,e=environment();let time=Date.UTC(2026,10,17),calls=0;
 const service=()=>createFreeServices(e,async()=>{calls++;return calls===1?new Response('',{status:402}):firecrawlResult();},{now:()=>time});
 await assert.rejects(service().search('question'),error=>error.code==='RATE_LIMIT');
 await assert.rejects(service().search('question'),error=>error.code==='RATE_LIMIT');assert.equal(calls,1);
 time=Date.UTC(2026,11,1);assert.equal((await service().search('question')).provider,'firecrawl');assert.equal(e.DB.quota.get('2026-12-31|budget:firecrawl:credits'),2);
});
test('unexpected Firecrawl credit usage stops further automatic requests for that month',async()=>{
 const {createFreeServices}=await services,e=environment();let calls=0;
 const service=createFreeServices(e,async()=>{calls++;return firecrawlResult({creditsUsed:3});});
 await assert.rejects(service.search('question'),error=>error.code==='RATE_LIMIT');
 await assert.rejects(service.search('question'),error=>error.code==='RATE_LIMIT');assert.equal(calls,1);
});
test('Firecrawl error envelopes and unsafe or unsupported source data never become factual evidence',async()=>{
 const {createFreeServices}=await services;
 for(const payload of [{success:false,data:{web:[{title:'fake',url:'https://reference.example/a',description:'not a valid success'}]}},{success:true,data:{web:[{title:'unsafe',url:'javascript:alert(1)',description:'Bad'},{title:'No excerpt',url:'https://reference.example/a',markdown:'Unrequested scraped material'}]}}]){
  const e=environment();
  try{const result=await createFreeServices(e,async()=>Response.json(payload)).search('question');assert.deepEqual(result.sources,[]);}
  catch(error){assert.equal(error.code,'UNAVAILABLE');}
 }
});
test('Firecrawl’s excerpt links flow through the existing launcher chat source validator',async()=>{
 const {handle}=await import('../cloud/worker.mjs'),e={...environment(),IP_HASH_SALT:'test-salt',TAVILY_API_KEY:'test-only-tavily',EXA_API_KEY:'test-only-exa'};let calls=0;
 e.AI={run:async()=>({response:++calls===1?'{"action":"search","query":"rainbow sunlight droplets"}':JSON.stringify({answer:'A rainbow forms when sunlight bends and reflects in droplets.',uncertain:false,citations:[{source:1,quote:'Sunlight bends and reflects inside water droplets'}]})})};
 const request=new Request('https://gateway.test/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Find sources about how rainbows form.',messages:[],mode:'search',timezone:'UTC',consentAccepted:true})});
 const result=await(await handle(request,e,async(url)=>url==='https://api.firecrawl.dev/v2/search'?firecrawlResult():new Response('',{status:503}))).json();
 assert.equal(result.unavailable,false);assert.equal(result.searched,true);assert.equal(result.searchProvider,'firecrawl');assert.equal(result.provider,'cloudflare');assert.equal(result.sources[0].url,'https://reference.example/article');assert.equal(calls,2);
});
test('adding only a Firecrawl secret advertises search without making an upstream request',async()=>{
 const {handle}=await import('../cloud/worker.mjs'),e={...environment(),IP_HASH_SALT:'test-salt',AI:{run(){throw Error('must not generate');}}};
 const result=await handle(new Request('https://gateway.test/v1/capabilities'),e,async()=>{throw Error('must not search');});
 const caps=await result.json();assert.equal(caps.chatVersion,1);assert.equal(caps.gatewayVersion,2);assert.equal(caps.webSearch,true);assert.deepEqual(caps.configuredProviders.search,['firecrawl']);assert.equal(e.DB.quota.size,0);
});
