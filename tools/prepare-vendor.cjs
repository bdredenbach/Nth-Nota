'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const manifest=require('./vendor-manifest.json');
const root=path.resolve(__dirname,'..');
for(const [name,entry]of Object.entries(manifest)){
 const bytes=fs.readFileSync(path.join(root,'node_modules',entry.source));
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Unexpected vendor bytes for '+name+'. Check the pinned package version before updating.');
 fs.mkdirSync(path.join(root,'dist/vendor'),{recursive:true});fs.writeFileSync(path.join(root,'dist/vendor',name),bytes);
}
console.log('Prepared and hash-verified all six browser libraries.');
