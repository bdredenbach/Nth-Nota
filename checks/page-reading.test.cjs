const test=require('node:test'),assert=require('node:assert/strict');
const DB=require('./fixtures/gateway-db.cjs'),services=import('../cloud/free-providers.mjs'),chatModule=import('../cloud/chat.mjs');
const url='https://reference.example/article';
const excerpt='Sunlight bends and reflects inside water droplets to produce a rainbow.';
const env=()=>({FREE_ONLY_CONFIRMED:'yes',DB:new DB(),CONTEXT_API_KEY:'test-context',NOTA_CONTEXT_PROVIDER:'context.dev',FIRECRAWL_API_KEY:'test-firecrawl'});
const page=()=>Response.json({url,markdown:{success:true,data:excerpt},metadata:{title:'An article',sourceUrl:url,finalUrl:url},key_metadata:{credits_consumed:1}});
const fallbackPage=()=>Response.json({success:true,data:{markdown:excerpt,metadata:{title:'An article',statusCode:200,sourceURL:url}}});
const input=(extra={})=>({question:'Summarize '+url,messages:[],mode:'auto',timezone:'UTC',consentAccepted:true,...extra});

test('page reading prefers confirmed Context.dev and shares its credit budget with basic search',async()=>{
 const {createFreeServices}=await services,e={...env(),NOTA_WEB_SEARCH:'context'},calls=[];
 const service=createFreeServices(e,async(target,options)=>{
  calls.push(target);assert.equal(options.headers.Authorization,'Bearer test-context');const p=JSON.parse(options.body);
  if(target.endsWith('/search'))return Response.json({results:[{title:'Article',url,description:excerpt}],key_metadata:{credits_consumed:1}});
  assert.equal(target,'https://api.context.dev/v1/web/scrape');assert.equal(p.url,url);assert.deepEqual(p.formats,{markdown:true});assert.deepEqual(p.sharedParams,{mainContentOnly:true});assert.equal(p.maxAgeMs,0);assert(!('headers' in p.sharedParams));return page();
 });
 assert.equal((await service.search('question')).provider,'context');const result=await service.readPage(url);assert.equal(result.provider,'context');assert.equal(result.sources[0].detail,'Retrieved page excerpt');
 assert.equal([...e.DB.quota].find(([k])=>k.includes('|budget:context:credits'))[1],2);assert.equal(calls.length,2);
});
test('a Context outage uses one basic Firecrawl page read and shares its search credits',async()=>{
 const {createFreeServices}=await services,e=env(),calls=[];
 const result=await createFreeServices(e,async(target,options)=>{
  calls.push(target);if(target.includes('context.dev'))throw Error('offline');
  assert.equal(target,'https://api.firecrawl.dev/v2/scrape');assert.equal(options.headers.Authorization,'Bearer test-firecrawl');const p=JSON.parse(options.body);
  assert.deepEqual(p.formats,['markdown']);assert.deepEqual(p.parsers,[]);assert.equal(p.storeInCache,false);assert.equal(p.maxAge,0);assert(!('actions' in p));assert(!('profile' in p));assert(!('headers' in p));return fallbackPage();
 }).readPage(url);
 assert.equal(result.provider,'firecrawl');assert.equal(calls.length,2);assert.equal([...e.DB.quota].find(([k])=>k.includes('|budget:firecrawl:credits'))[1],1);
});
test('only HTTPS public-page links are accepted; private addresses, credentials and document downloads never trigger a request',async()=>{
 const {createFreeServices}=await services,e=env();let calls=0;const service=createFreeServices(e,async()=>{calls++;return page();});
 for(const bad of ['http://reference.example/a','https://127.0.0.1/a','https://[::ffff:127.0.0.1]/a','https://localhost./a','https://host.internal/a','https://user:password@reference.example/a','https://reference.example/book.pdf','https://reference.example/file.docx'])await assert.rejects(service.readPage(bad),e=>e.code==='INVALID_REQUEST');
 assert.equal(calls,0);assert.equal(e.DB.quota.size,0);
});
test('explicit links are taken from user messages and never from assistant suggestions or private URLs',async()=>{
 const {explicitPageUrls}=await chatModule;
 const found=explicitPageUrls(input({question:'Read this ('+url+'#intro).',messages:[{role:'user',content:'Earlier https://reference.example/earlier'},{role:'assistant',content:'Try https://invented.example/fake and https://127.0.0.1/.'}]}));
 assert(found.has(url));assert(found.has('https://reference.example/earlier'));assert.equal(found.size,2);
});
test('a model cannot read an invented URL, even if a page reader is configured',async()=>{
 const {chat}=await chatModule,e=env();let calls=0;
 const reply=await chat(input(),e,async()=>'{"action":"read","url":"https://not-provided.example/secret"}',{readPage:async()=>{calls++;throw Error();},search:async()=>{calls++;throw Error();}});
 assert.equal(reply.unavailable,true);assert.equal(calls,0);
});
test('mentioning a URL in a writing request does not automatically fetch the page',async()=>{
 const {chat}=await chatModule,e=env();let calls=0;
 const reply=await chat(input({question:'Write a warm invitation containing '+url}),e,async()=>'{"action":"answer","text":"You are warmly invited to join us."}',{readPage:async()=>{calls++;throw Error();}});
 assert.equal(reply.unavailable,false);assert.equal(reply.searched,false);assert.equal(calls,0);
});
test('summarize-a-link uses exactly one page retrieval, bounded evidence and checked citations',async()=>{
 const {handle}=await import('../cloud/worker.mjs'),e={...env(),IP_HASH_SALT:'test-salt'};let models=0,reads=0;
 e.AI={run:async(_model,payload)=>{
  models++;if(models===1){assert.match(payload.messages[0].content,/explicit user links/);return{response:JSON.stringify({action:'read',url})};}
  assert.match(payload.messages[0].content,/bounded excerpt/);assert.match(payload.messages.at(-1).content,/RETRIEVED EXCERPTS/);
  return{response:JSON.stringify({answer:'This excerpt explains how light forms a rainbow.',uncertain:false,citations:[{source:1,quote:'Sunlight bends and reflects inside water droplets'}]})};
 }};
 const request=new Request('https://gateway.example/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input())});
 const response=await handle(request,e,async(target)=>{reads++;assert.equal(target,'https://api.context.dev/v1/web/scrape');return page();}),body=await response.json();
 assert.equal(response.status,200);assert.equal(body.unavailable,false);assert.equal(body.searchProvider,'context');assert.equal(body.sources[0].detail,'Retrieved page excerpt');assert.equal(reads,1);assert.equal(models,2);
});
test('an oversized/failed or higher-cost page response cannot become a fabricated summary',async()=>{
 const {createFreeServices}=await services;
 for(const payload of [{markdown:{success:false,data:'not a valid page'},metadata:{}},{markdown:{success:true,data:excerpt},metadata:{statusCode:404}},{markdown:{success:true,data:excerpt},key_metadata:{credits_consumed:5}}]){
  const e={...env(),FIRECRAWL_API_KEY:''};await assert.rejects(createFreeServices(e,async()=>Response.json(payload)).readPage(url));
 }
 const e={...env(),FIRECRAWL_API_KEY:''};const found=await createFreeServices(e,async()=>Response.json({markdown:{success:true,data:excerpt.repeat(150)},metadata:{title:'Long article',finalUrl:'https://unverified.example/redirect'},key_metadata:{credits_consumed:1}})).readPage(url);assert.equal(found.sources[0].url,url);assert.equal(found.sources[0].text.length,6000);
});
test('search off disables page reading and unconfirmed Context keys are not used for page reads',async()=>{
 const {createFreeServices,pageProviders}=await services;
 assert.deepEqual(pageProviders({...env(),NOTA_WEB_SEARCH:'off'}),[]);
 const e={...env(),NOTA_CONTEXT_PROVIDER:'',FIRECRAWL_API_KEY:''};let calls=0;
 await assert.rejects(createFreeServices(e,async()=>{calls++;return page();}).readPage(url));assert.equal(calls,0);
});
test('concurrent page/search calls share the same last Context credit',async()=>{
 const {createFreeServices,FREE_LIMITS}=await services,e={...env(),FIRECRAWL_API_KEY:''},d=new Date(),key=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10)+'|budget:context:credits';
 e.DB.quota.set(key,FREE_LIMITS.contextCreditsMonthly-1);let calls=0;
 const create=()=>createFreeServices(e,async(target)=>{calls++;return target.endsWith('/scrape')?page():Response.json({results:[{title:'Source',url,description:excerpt}]});});
 const results=await Promise.allSettled([create().readPage(url),create().search('question')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(calls,1);assert.equal(e.DB.quota.get(key),FREE_LIMITS.contextCreditsMonthly);
});

test('one unreadable page does not put the whole reader service on cooldown',async()=>{
 const {createFreeServices}=await services,e=env();let calls=0;
 const service=createFreeServices(e,async(target,options)=>{
  calls++;if(JSON.parse(options.body).url.endsWith('/missing'))return target.includes('context.dev')?Response.json({markdown:{success:false,data:null}}):Response.json({success:true,data:{markdown:'Missing',metadata:{statusCode:404}}});
  return page();
 });
 await assert.rejects(service.readPage('https://reference.example/missing'));assert.equal(e.DB.cooldowns.size,0);
 const result=await service.readPage(url);assert.equal(result.provider,'context');assert.equal(calls,3);
});
