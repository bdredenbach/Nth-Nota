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
const report={version:require('../package.json').version,basePath:prefix,checks:[],physicalIPhoneTest:false};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}${prefix}`;
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
    await check('a note survives online reload and an offline app launch',async()=>{
     await page.locator('#desk-menu-toggle').click();const tool=page.locator('[data-launch-action="note"]'),category=tool.locator('xpath=ancestor::section[contains(@class,"launcher-category")]').locator('[data-launch-category]');if(await category.getAttribute('aria-expanded')==='false')await category.click();await tool.click();
     await page.locator('#note-title').fill('An iPhone testing note');await page.locator('#note-editor').fill('These words stay on this phone, including offline.');await page.locator('#note-done').click();await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent.includes('Saved on device'));
     await page.reload();await page.waitForFunction(()=>state?.items.some(n=>n.title==='An iPhone testing note'&&n.html.includes('These words stay on this phone')));
     await context.setOffline(true);assert((await page.reload()).ok());await page.waitForSelector('.card');assert(await page.evaluate(()=>state.items.some(n=>n.title==='An iPhone testing note'&&n.html.includes('These words stay on this phone'))));
     await page.screenshot({path:path.join(out,name+'-offline-desk.png')});await context.setOffline(false);assert.deepEqual(errors,[]);
    });
   }catch(e){if(page)await page.screenshot({path:path.join(out,name+'-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
  }
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log('Passed '+report.checks.length+' PWA browser checks.');
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({...report,error:e.stack},null,2)+'\n');throw e;}finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
