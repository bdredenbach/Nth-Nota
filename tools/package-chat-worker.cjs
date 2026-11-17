#!/usr/bin/env node
/** Produce a dashboard-ready Worker without external imports or build dependencies. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const destination=process.argv[2];
if(!destination)throw Error('Pass the output module path.');
const inline=file=>fs.readFileSync(path.join(root,'cloud',file),'utf8')
 .replace(/^import .* from ['"].*['"];\n/gm,'')
 .replace(/^export \{.*\} from ['"].*['"];\n/gm,'')
 .replace(/^export (?!default)/gm,'');
const files=['free-providers.mjs','chat.mjs','worker.mjs'];
fs.writeFileSync(destination,'// Generated from cloud/{free-providers,chat,worker}.mjs. Keep provider accounts on Free.\n'+files.map(inline).join('\n'));
