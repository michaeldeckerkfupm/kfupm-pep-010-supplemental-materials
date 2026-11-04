'use strict';
// Exercise the production submission/state functions without requiring a browser.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elements=new Map(),storage=new Map();let accepted=true,prompt='',renders=0;
const context=vm.createContext({URLSearchParams,location:{search:''},Date,Math,Number,String,Array,Set,JSON,
 document:{getElementById(id){if(!elements.has(id))elements.set(id,{classList:{remove(){}},scrollIntoView(){},focus(){}});return elements.get(id);}},
 localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null},
 confirm:message=>{prompt=message;return accepted;},clearInterval(){},window:{}});
let explorer=fs.readFileSync('reading-explorer.js','utf8');
explorer=explorer.slice(0,explorer.indexOf(" document.addEventListener('focusin'"))+`window.setupExplorer=(test,part,index)=>{active=test;section=part;activity=index;};})();`;
vm.runInContext(explorer,context);
let practice=fs.readFileSync('reading-practice.js','utf8');
practice=practice.slice(0,practice.indexOf(' function vocab('))+`
 render=()=>{};timer=()=>{};
 window.api={setup:(test,s)=>{active=test;state=s;},fresh,read,submit,current,submitted,score,get:()=>state};})();`;
vm.runInContext(practice,context);
const {api}=context.window;
const setSection=(test,key)=>{const i=test.questions.findIndex((q,i)=>sectionKey(test,i)===key);context.window.setupExplorer(test,test.passages[test.questions[i].passage].part,test.questions[i].passage);};
const sectionKey=(t,i)=>{const q=t.questions[i],p=t.passages[q.passage].part;return p==='vocabulary'?'vocabulary:'+q.passage:'part:'+p;};
let units=0,sections=0;
for(const book of [2,3])for(const raw of JSON.parse(fs.readFileSync('explorer-data/book'+book+'.json'))){
 const test={...raw,id:'reading-explorer-'+book+'-'+raw.id};const s=api.fresh(test);s.flags[0]=true;const originalOrder=JSON.stringify(s.order),deadline=s.deadline;
 api.setup(test,s);const keys=[...new Set(test.questions.map((_,i)=>sectionKey(test,i)))];
 for(const key of keys){
  setSection(test,key);const indices=test.questions.map((_,i)=>i).filter(i=>sectionKey(test,i)===key);
  // Cancelling counts only the displayed section's unanswered questions.
  accepted=false;api.submit();assert.equal(prompt,indices.length+' question(s) are unanswered in this part. Submit anyway?');assert(!api.submitted(indices[0]));
  accepted=true;for(const i of indices){const q=test.questions[i];s.answers[i]=q.type==='text'?q.answer:q.type==='multi'?q.keys:q.key;}
  const before=JSON.stringify(s.answers);api.submit();assert.equal(JSON.stringify(s.answers),before);
  for(const i of indices){assert(api.submitted(i));assert(!api.current(i));}
  for(let i=0;i<test.questions.length;i++)if(!s.explorerSections[sectionKey(test,i)])assert(api.current(i),'Unsubmitted sections must remain editable');
  assert.equal(s.deadline,deadline);assert.equal(JSON.stringify(s.order),originalOrder);assert(s.flags[0]);
  const resumed=api.read(test);assert.deepEqual(JSON.parse(JSON.stringify(resumed)),JSON.parse(JSON.stringify(s)));api.setup(test,resumed);
  sections++;
  // Continue with the reloaded state, as a real return visit would.
  Object.assign(s,resumed);api.setup(test,s);
 }
 assert(s.submitted);assert.equal(s.score,test.questions.length);assert.equal(s.firstScore,test.questions.length);
 // Old, fully submitted attempts remain locked with their historical scores intact.
 delete s.explorerSections;s.score=17;s.firstScore=16;api.setup(test,s);assert(api.submitted(0));api.submit();assert.equal(s.score,17);assert.equal(s.firstScore,16);
 // Timer expiry after a partial submission must finalize every remaining section.
 const timed=api.fresh(test);api.setup(test,timed);setSection(test,keys[0]);api.submit();assert(!timed.submitted);timed.deadline=Date.now()-1;api.submit();assert(timed.submitted&&timed.expired);assert.equal(timed.score,0);
 units++;
}
// Ordinary reading tests keep whole-test submission behavior.
const normal={id:'ordinary',questions:[{type:'choice',options:[{text:'a'},{text:'b'}],key:0}]};
const normalState=api.fresh(normal);normalState.answers[0]=0;api.setup(normal,normalState);api.submit();assert(normalState.submitted);assert.equal(normalState.score,1);
console.log(`Passed ${units} units, ${sections} independent sections: scoped confirmation, grading, lock isolation, saved state, legacy attempts, expiry, and ordinary reading submission.`);
