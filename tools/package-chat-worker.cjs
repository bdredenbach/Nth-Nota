#!/usr/bin/env node
/** Produce a dashboard-ready Worker without external imports or build dependencies. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const destination=process.argv[2];
if(!destination)throw Error('Pass the output module path.');
const chat=fs.readFileSync(path.join(root,'cloud/chat.mjs'),'utf8').replace(/^export /gm,'');
const worker=fs.readFileSync(path.join(root,'cloud/worker.mjs'),'utf8').replace(/^import \{chat,validChat,searchConfigured\} from '\.\/chat\.mjs';\n/,'');
fs.writeFileSync(destination,'// Generated from cloud/chat.mjs and cloud/worker.mjs. Search stays off unless explicitly configured.\n'+chat+'\n'+worker);
