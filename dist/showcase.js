/* Editable examples. Migrations add missing examples once, never replace a user's work. */
(function(root){'use strict';
const VERSION=1;
const CREDIT={artist:'Nastelbom',title:'No Copyright Music',source:'https://pixabay.com/music/corporate-no-copyright-music-617081/',license:'https://pixabay.com/service/license-summary/',seconds:30};
const line=(x1,y1,x2,y2,color='#527063',size=3)=>({tool:'pen',color,size,points:[[x1,y1],[x2,y2]]});
const box=(x,y,w,h)=>({tool:'pen',color:'#527063',size:3,points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]});
function specs(){return [
 {sampleId:'project-next',workspace:'projects',type:'task',title:'My next project',legacy:true,color:'sage',tag:'Example · next steps',tasks:[{text:'Start with the simplest version',done:false},{text:'Collect inspiration',done:false},{text:'Choose one small milestone',done:false},{text:'Review what worked',done:false}]},
 {sampleId:'project-brief',workspace:'projects',type:'note',title:'A brief worth coming back to',color:'paper',tag:'Example · project brief',html:'<h2>The idea</h2><p>A welcoming community reading corner.</p><h2>Who it helps</h2><p>Neighbors who want a quiet place to read, swap books, and meet.</p><h2>What success looks like</h2><ul><li>A comfortable seat and a small book exchange.</li><li>A clear plan for keeping the space tidy.</li><li>One opening afternoon to learn what people need.</li></ul><p><i>Use headings to turn a loose idea into a useful brief. Replace this example with your own project.</i></p>'},
 {sampleId:'project-meeting',workspace:'projects',type:'note',title:'The meeting, without the mystery',color:'blue',tag:'Example · meeting notes',html:'<h2>Decisions</h2><p>Keep the first version small. Test it with three people before adding more.</p><h2>Next steps</h2><ul><li>Sketch the layout.</li><li>Write a short invitation.</li><li>Collect feedback in one place.</li></ul><h2>Open questions</h2><p>What would make this easier for someone trying it for the first time?</p><p><i>Try Organize in the writing companion to structure your own meeting notes. Replies remain suggestions to review.</i></p>'},
 {sampleId:'project-budget',workspace:'projects',type:'note',title:'Let the budget take shape',color:'peach',tag:'Example · automatic math',html:'<h2>A first estimate</h2><p>Supplies: 150<br>Printing: 90<br>Refreshments: 60</p><p>150 + 90 + 60 = 300</p><h2>A little breathing room</h2><p>300 * 0.1 = 30<br>300 + 30 = 330</p><p><i>On a new line, type a numeric equation followed by = to calculate it. Automatic math can be changed in Settings.</i></p>'},
 {sampleId:'project-layout',workspace:'projects',type:'sketch',title:'A first draft of the space',color:'paper',tag:'Example · sketch & markup',drawing:{mode:'sketch',strokes:[box(.1,.12,.8,.76),box(.15,.2,.3,.2),box(.55,.2,.3,.2),box(.15,.55,.7,.24),line(.5,.12,.5,.48)]}},
 {sampleId:'project-audio',workspace:'projects',type:'audio',title:'A soundtrack for the launch',color:'lilac',tag:'Example · audio attachment',caption:'Keep a sound reference beside your project brief. This 30-second music preview demonstrates audio playback; speech recordings can also hold a transcript.',audioKind:'music',credit:CREDIT},
 {sampleId:'idea-start',workspace:'ideas',type:'note',title:'Start anywhere.',legacy:true,color:'peach',tag:'Example · a first thought',html:'<p>What’s one thing you wish existed?</p><p>Write the rough version first. A question, a sentence, or a sketch is enough to begin.</p><p><i>Your note saves as you type. Give the idea a title when it is ready.</i></p>'},
 {sampleId:'idea-garden',workspace:'ideas',type:'note',title:'An idea garden',color:'sage',tag:'Example · collect & connect',html:'<h2>Things I noticed</h2><ul><li>A place that could be easier to use.</li><li>A question I keep coming back to.</li><li>A small joy worth sharing.</li></ul><h2>A connection</h2><p>What happens if two of these ideas belong together?</p><p><i>Move related notes beside each other on the canvas. Use favorites for thoughts you want to find again.</i></p>'},
 {sampleId:'idea-story',workspace:'ideas',type:'note',title:'The beginning of a story',color:'paper',tag:'Example · writing companion',html:'<p>Every Thursday, a new postcard appeared in the old library book. This week, it was addressed to someone who had not been born yet.</p><h2>A direction to explore</h2><p>Who finds the postcard? What would make them answer it?</p><p><i>Select a passage and open the writing companion to develop it. Try Draft for a starting point or Polish to refine your own words.</i></p>'},
 {sampleId:'idea-experiment',workspace:'ideas',type:'task',title:'Turn a what-if into a small test',color:'blue',tag:'Example · an experiment',tasks:[{text:'Write the idea in one sentence',done:false},{text:'Choose the smallest thing to try',done:false},{text:'Ask one person what they notice',done:false},{text:'Keep a note of what to change',done:false}]},
 {sampleId:'idea-map',workspace:'ideas',type:'sketch',title:'Let the connections wander',color:'paper',tag:'Example · digital ink',drawing:{mode:'ink',strokes:[box(.36,.38,.28,.22),box(.08,.08,.25,.2),box(.69,.08,.24,.2),box(.08,.72,.25,.2),box(.69,.72,.24,.2),line(.36,.38,.27,.28),line(.64,.38,.73,.28),line(.36,.6,.27,.72),line(.64,.6,.73,.72)]}},
 {sampleId:'idea-compare',workspace:'ideas',type:'note',title:'Two possibilities, one next step',color:'lilac',tag:'Example · compare & decide',html:'<h2>Possibility A: a weekend workshop</h2><p>A shared space, a few useful materials, and one thing everyone can make.</p><h2>Possibility B: a take-home kit</h2><p>A small package with instructions people can follow at their own pace.</p><h2>What matters?</h2><p>Cost, time, accessibility, and the kind of experience people want.</p><p><i>Make a note for each option. Desk → Workspace view → Compare notes lets you read them side by side.</i></p>'}
 ];}
function create({uid,at=new Date().toISOString(),audioData='',columns=3}={}){
 const rows={};return specs().map(s=>{const slot=rows[s.workspace]||0;rows[s.workspace]=slot+1;const n={id:uid(),x:16+(slot%columns)*384,y:16+Math.floor(slot/columns)*336,w:360,h:312,updated:at,deskState:'open',...s};delete n.legacy;if(n.type==='audio'&&audioData)n.data=audioData;return n;});
}
function merge(desk,options={}){
 if(desk.showcaseVersion===VERSION)return [];
 // An intentionally empty desk stays empty after deletion or backup restoration.
 if(!desk.items.length){desk.showcaseVersion=VERSION;return [];}
 const added=[],legacy=new Set(specs().filter(s=>s.legacy).map(s=>s.workspace+'|'+s.type+'|'+s.title));
 for(const sample of create(options)){
  if(!desk.workspaces.some(w=>w.id===sample.workspace))continue;
  const old=desk.items.find(n=>n.sampleId===sample.sampleId||legacy.has(sample.workspace+'|'+sample.type+'|'+sample.title)&&n.workspace===sample.workspace&&n.type===sample.type&&n.title===sample.title);
  if(old){if(!old.sampleId)old.sampleId=sample.sampleId;continue;}
  desk.items.push(sample);added.push(sample);
 }
 desk.showcaseVersion=VERSION;return added;
}
const api={VERSION,CREDIT,create,merge,audioData:''};if(typeof module!=='undefined')module.exports=api;else root.NotaShowcase=api;
})(typeof window!=='undefined'?window:globalThis);
