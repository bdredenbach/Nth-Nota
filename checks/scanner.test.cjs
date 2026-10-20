const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function fixture(){const window=new EventTarget(),calls={starts:[],cancels:[]};window.NotaAndroid={startScan:id=>calls.starts.push(id),cancelScan:id=>calls.cancels.push(id)};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/scanner.js'),'utf8'),{window,crypto,DOMException,atob,setTimeout,clearTimeout});return {api:window.NotaScan,calls,emit:(id,data)=>window.dispatchEvent(new CustomEvent('nota-scan',{detail:{id,...data}}))};}
test('Scanner assembles bounded ordered chunks and ignores unrelated native jobs',async()=>{
 const f=fixture(),promise=f.api.nativeScan(),id=f.calls.starts[0],bytes=Buffer.from('%PDF-1.7\nfixture'),encoded=bytes.toString('base64');f.emit('other',{event:'error'});f.emit(id,{event:'begin',bytes:bytes.length,pages:2});f.emit(id,{event:'chunk',data:encoded});f.emit(id,{event:'result'});const result=await promise;assert.equal(result.pages,2);assert.equal(result.data,'data:application/pdf;base64,'+encoded);assert.deepEqual(f.calls.cancels,[]);
});
test('Scanner rejects oversized transfers before receiving any document data',async()=>{
 const f=fixture(),promise=f.api.nativeScan(),id=f.calls.starts[0];f.emit(id,{event:'begin',bytes:f.api.MAX_BYTES+1,pages:1});await assert.rejects(promise,/larger than 12 MB/);assert.deepEqual(f.calls.cancels,[id]);
});
test('Incomplete and malformed scan transfers cannot become saved documents',async()=>{
 for(const events of [[{event:'result'}],[{event:'begin',bytes:15,pages:1},{event:'chunk',data:'invalid!'}],[{event:'begin',bytes:15,pages:1},{event:'result'}],[{event:'begin',bytes:15,pages:21}]]){const f=fixture(),promise=f.api.nativeScan(),id=f.calls.starts[0];for(const e of events)f.emit(id,e);await assert.rejects(promise);assert.equal(f.calls.cancels.length,1);}
});
test('Cancelling a scan removes its listener and late native events have no effect',async()=>{
 const f=fixture(),controller=new AbortController(),promise=f.api.nativeScan({signal:controller.signal}),id=f.calls.starts[0];controller.abort();await assert.rejects(promise,e=>e.name==='AbortError');f.emit(id,{event:'begin',bytes:10,pages:1});f.emit(id,{event:'result'});assert.deepEqual(f.calls.cancels,[id]);const next=f.api.nativeScan(),nextId=f.calls.starts[1];f.emit(nextId,{event:'cancelled',message:'Scan cancelled.'});await assert.rejects(next,e=>e.name==='AbortError');
});
test('A failed native scan explains the picture import alternative',async()=>{
 const f=fixture(),promise=f.api.nativeScan(),id=f.calls.starts[0];f.emit(id,{event:'error',message:'Use Import pictures.'});await assert.rejects(promise,/Import pictures/);
});
