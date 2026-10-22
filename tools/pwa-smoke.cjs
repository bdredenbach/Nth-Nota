'use strict';
const {chromium,webkit,devices}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../artifacts/pwa'),prefix='/Nth-Nota/';
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/Nth-Nota'){res.writeHead(301,{Location:prefix}).end();return;}
 if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
 const relative=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html',file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}
 try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
const report={version:require('../package.json').version,basePath:prefix,checks:[],physicalIPhoneTest:false,outageMethods:{chromium:'offline emulation and stopped origin',webkit:'stopped origin; offline emulation bypasses service worker handling in Playwright WebKit'}};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port,base=`http://127.0.0.1:${port}${prefix}`;
 const stopOrigin=()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
 const startOrigin=()=>new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 try{
  for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
   const browser=await engine.launch();let page;
   try{
    const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'allow'}),errors=[],failures=[];
    await context.addInitScript(()=>{localStorage.setItem('nota-tour-version','2');localStorage.setItem('nota-tour-v2',JSON.stringify({enabled:false,seen:[]}));});
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))failures.push(r.status()+' '+r.url());});
    const check=async(label,fn)=>{console.log(name+': '+label);await fn();report.checks.push(name+': '+label);};
    await check('index and every local dependency load under the GitHub project path',async()=>{
     assert((await page.goto(base)).ok());await page.waitForSelector('.card');assert.equal(await page.title(),'Nth Nota · A little room to think');
     assert.equal(await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content'),'yes');
     const manifest=await page.evaluate(async()=>{const link=document.querySelector('link[rel="manifest"]');return {url:link.href,data:await(await fetch(link.href)).json()};});
     assert.equal(new URL(manifest.data.start_url,manifest.url).href,base);assert.equal(new URL(manifest.data.scope,manifest.url).href,base);assert.equal(manifest.data.display,'standalone');
     await page.waitForFunction(()=>typeof lucide!=='undefined'&&typeof JSZip!=='undefined'&&typeof docx!=='undefined'&&typeof PDFLib!=='undefined'&&!!window.pdfjsLib);
     assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    });
    await check('iPhone installation instructions and offline preparation are available',async()=>{
     await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
     const worker=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return {scope:r.scope,script:r.active.scriptURL};});assert.equal(worker.scope,base);assert.equal(worker.script,base+'sw.js');
     await page.evaluate(()=>installModal());await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent==='Prepared');assert((await page.locator('.modal-body').innerText()).includes('Safari'));assert((await page.locator('.modal-body').innerText()).includes('Add to Home Screen'));await page.screenshot({path:path.join(out,name+'-iphone-install.png')});await page.locator('#close-modal').click();
    });
    const fullTours=await page.evaluate(()=>NotaTour.fullToursEnabled);
    if(fullTours){
    await check('the movable tutor leaves blank writing fields usable and restores the desk',async()=>{
     const before=await page.evaluate(()=>structuredClone(state.items));await page.evaluate(()=>NotaTourDemo.start({chapter:'note'}));await page.waitForFunction(()=>NotaTourDemo.state.intro&&NotaTourDemo.state.ready);assert((await page.locator('#demo-copy').innerText()).includes('Drag the three lines'));await page.locator('#demo-next').click();await page.waitForFunction(()=>NotaTourDemo.state.interaction?.selector==='#note-title');assert.equal(await page.locator('#note-title').inputValue(),'');assert.equal(await page.locator('#note-editor').innerText(),'');
     await page.locator('#demo-grip').focus();const old=await page.locator('#demo-card').boundingBox();await page.keyboard.press('ArrowUp');assert((await page.locator('#demo-card').boundingBox()).y<=old.y);await page.keyboard.press('Home');await page.locator('#note-title').click();await page.locator('#note-title').fill('My own web practice');await page.locator('#demo-next').click();await page.waitForFunction(()=>NotaTourDemo.state.interaction?.selector==='#note-editor');assert.equal(await page.locator('#note-title').inputValue(),'My own web practice');await page.locator('#note-editor').fill('Typed by the person using the tutor.');await page.screenshot({path:path.join(out,name+'-interactive-tutor.png')});await page.locator('#demo-exit').click();assert.deepEqual(await page.evaluate(()=>state.items),before);
    });
    const audit=require('./tour-audit.cjs')({page,shot:async label=>page.screenshot({path:path.join(out,name+'-'+label+'.png')})});
    await check('live and practice tutorials are distinct side-by-side choices',async()=>{await audit.launchRegression();});
    await check('card movement, List view, note color and compact chat work on a phone',async()=>{await audit.practiceRefinements();});
    await check('Desk search follows real animation and resumes after menu detours',async()=>{await audit.menuRegression();});
    await check('every tour chapter uses its real highlighted controls with normal motion',async()=>{await audit.walkAll();});
    await check('unfinished writing and drawings survive backward navigation and recovery',async()=>{await audit.draftRegression();});
    }else{
     const audit=require('./tour-audit.cjs')({page,shot:async label=>page.screenshot({path:path.join(out,name+'-'+label+'.png')})});
     await check('full walkthroughs stay disabled and first-visit tool tips remain usable',async()=>{await audit.tipsOnlyRegression();});
     await check('all Desk categories open by default and search respects manual collapses',async()=>{await audit.expandedMenuRegression();});
    }
    const miscTool=async action=>{if(await page.locator('.modal').count())await page.locator('#close-modal').click();await page.locator('#desk-menu-toggle').click();const button=page.locator('[data-launch-action="'+action+'"]'),category=button.locator('xpath=ancestor::section[contains(@class,"launcher-category")]').locator('[data-launch-category]');if(await category.getAttribute('aria-expanded')==='false')await category.click();await button.click();};
    await require('./desk-polish-ui.cjs')({page,check,tool:miscTool,shot:async label=>page.screenshot({path:path.join(out,name+'-'+label+'.png')})});
    await require('./misc-widgets-ui.cjs')({page,check,tool:miscTool,shot:async label=>page.screenshot({path:path.join(out,name+'-'+label+'.png')})});
    await check('a note survives online reload and an offline app launch',async()=>{
     await page.locator('#desk-menu-toggle').click();const tool=page.locator('[data-launch-action="note"]'),category=tool.locator('xpath=ancestor::section[contains(@class,"launcher-category")]').locator('[data-launch-category]');if(await category.getAttribute('aria-expanded')==='false')await category.click();await tool.click();
     await page.locator('#note-title').fill('An iPhone testing note');await page.locator('#note-editor').fill('These words stay on this phone, including offline.');await page.locator('#note-done').click();await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent.includes('Saved on device'));
     await page.reload();await page.waitForFunction(()=>state?.items.some(n=>n.title==='An iPhone testing note'&&n.html.includes('These words stay on this phone')));
     // Playwright WebKit rejects SW requests under setOffline (upstream #42775).
     // Stop the actual origin for both engines, and require an uncached context to fail.
     if(name==='chromium')await context.setOffline(true);await stopOrigin();assert.equal(server.listening,false);
     try{
      const response=await page.reload();assert(response.ok());assert(response.fromServiceWorker(),'The offline document comes from the service worker');await page.waitForSelector('.card');assert(await page.evaluate(()=>state.items.some(n=>n.title==='An iPhone testing note'&&n.html.includes('These words stay on this phone'))));
      const uncached=await browser.newContext({serviceWorkers:'block'});try{const probe=await uncached.newPage();let refused=false;try{await probe.goto(base,{timeout:10000});}catch{refused=true;}assert(refused,'The origin is unavailable to a browser without the cached app');}finally{await uncached.close();}
      await page.screenshot({path:path.join(out,name+'-offline-desk.png')});assert.deepEqual(errors,[]);
     }finally{await context.setOffline(false);await startOrigin();}
    });
   }catch(e){if(page){await page.screenshot({path:path.join(out,name+'-failure.png')}).catch(()=>{});const diagnostics=await page.evaluate(()=>{const box=id=>{const el=document.getElementById(id);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,scrollTop:el.scrollTop};};return {tour:window.NotaTourDemo?.state,card:box('demo-card'),scroll:box('demo-scroll'),next:box('demo-next')};}).catch(()=>null);fs.writeFileSync(path.join(out,name+'-diagnostics.json'),JSON.stringify(diagnostics,null,2));}throw e;}finally{await browser.close();}
  }
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log('Passed '+report.checks.length+' PWA browser checks.');
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({...report,error:e.stack},null,2)+'\n');throw e;}finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
