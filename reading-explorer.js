'use strict';
(() => {
 let active,section=0,token=0,hooks,parts=[],selectedWord=null,layoutObserver,activity=0,bankObserver;
 const $=id=>document.getElementById(id),make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

 const raisedRanges=value=>active?.superscripts?.[value]||[];
 function formatted(tag,value){
  const element=make(tag),ranges=raisedRanges(value);let cursor=0;
  ranges.forEach(([start,end])=>{element.append(document.createTextNode(value.slice(cursor,start)),make('sup',value.slice(start,end)));cursor=end;});
  element.append(document.createTextNode(value.slice(cursor)));return element;
 }
 function table(parent,rows){const wrap=make('div');wrap.className='table-scroll';const t=make('table');t.className='vocab-table';rows.forEach(row=>{const tr=make('tr');row.forEach(value=>tr.append(make('td',value)));t.append(tr);});wrap.append(t);parent.append(wrap);}
 window.explorerQuestionExtras=(parent,q)=>{(q.images||[]).forEach(src=>{const img=make('img');img.src=src;img.alt='Figure supplied with this question';img.className='explorer-figure';parent.append(img);});(q.tables||[]).forEach(rows=>table(parent,rows));};
 window.explorerClose=()=>{token++;layoutObserver?.disconnect();bankObserver?.disconnect();active=null;hooks=null;selectedWord=null;document.getElementById('explorerParts')?.remove();document.getElementById('explorerActivities')?.remove();$('practiceExam').classList.remove('explorer-exam','explorer-vocabulary');document.querySelector('.passage-header h2').textContent='Reading passage';document.querySelector('.passage-controls').hidden=false;$('examSubmit').textContent='Submit answers';$('passageImageButton').textContent='Original page';$('passageImageButton').title='Original layout with printed line numbers. Scroll this panel to find the referenced line.';};
 const partFor=index=>active.passages[index].part??index+1;
 window.explorerVisible=i=>!active||(partFor(active.questions[i].passage)===section&&(section!=='vocabulary'||active.questions[i].passage===activity));
 window.explorerSectionKey=i=>{const part=partFor(active.questions[i].passage);return part==='vocabulary'?'vocabulary:'+active.questions[i].passage:'part:'+part;};
 window.explorerSectionTitle=()=>section==='vocabulary'?'Vocabulary · Activity '+(active.passages.filter((p,i)=>partFor(i)==='vocabulary').findIndex(p=>p===active.passages[activity])+1):'Part '+section;
 const bankQuestion=q=>q.type==='choice'&&(active.passages[q.passage].part==='vocabulary'||/\bbox\b/i.test(active.passages[q.passage].instructions))&&active.passages[q.passage].bank.length>=2&&q.options.length===active.passages[q.passage].bank.length&&q.options.every(o=>active.passages[q.passage].bank.some(word=>word.text===o.text));
 window.explorerOpen=(test,callbacks)=>{
  active=test;hooks=callbacks;parts=[...new Set(test.passages.map((p,i)=>p.part??i+1))].sort((a,b)=>a==='vocabulary'?1:b==='vocabulary'?-1:a-b);
  section=parts.includes(hooks.state().explorerPart)?hooks.state().explorerPart:parts[0];
  const nav=make('nav');nav.id='explorerParts';nav.className='explorer-parts';nav.setAttribute('aria-label','Reading and vocabulary parts');
  parts.forEach(part=>{const button=make('button');button.type='button';button.dataset.part=part;button.onclick=()=>selectPart(part,true);nav.append(button);});
  const pager=make('div');pager.className='explorer-pager';
  ['Previous part','Next part'].forEach((text,i)=>{const b=make('button',text);b.type='button';b.onclick=()=>selectPart(parts[parts.indexOf(section)+(i?1:-1)],true);pager.append(b);});nav.append(pager);
  const live=make('span');live.id='explorerAnnouncement';live.className='sr-only';live.setAttribute('role','status');nav.append(live);
  document.querySelector('.exam-toolbar').after(nav);$('practiceExam').classList.add('explorer-exam');layoutObserver=new ResizeObserver(()=>{const toolbar=document.querySelector('.exam-toolbar').getBoundingClientRect().height;const height=nav.getBoundingClientRect().height;$('practiceExam').style.setProperty('--explorer-toolbar',toolbar+'px');$('practiceExam').style.setProperty('--explorer-nav',height+'px');});layoutObserver.observe(document.querySelector('.exam-toolbar'));layoutObserver.observe(nav);$('examSubmit').textContent='Submit this part';
  $('passageImageButton').textContent='Page view';$('passageImageButton').title='Formatted page view of the supplied passage and figures. Text view adjusts to smaller screens.';
  selectPart(section,false);
 };
 function selectPart(part,redraw){
  if(!active||!parts.includes(part))return;section=part;selectedWord=null;hooks.state().explorerPart=part;
  window.explorerRefresh();
  const indices=active.passages.map((p,i)=>partFor(i)===part?i:-1).filter(i=>i>=0);
  document.querySelector('.passage-header h2').textContent=part==='vocabulary'?'Vocabulary':'Reading passage';
  document.querySelector('.passage-controls').hidden=part==='vocabulary';
  $('examPassageImage').hidden=part==='vocabulary'||$('passageImageButton').getAttribute('aria-pressed')!=='true';
  $('examPassage').hidden=part==='vocabulary'||$('passageTextButton').getAttribute('aria-pressed')!=='true';
  $('practiceExam').classList.toggle('explorer-vocabulary',part==='vocabulary');
  document.getElementById('explorerActivities')?.remove();bankObserver?.disconnect();$('practiceExam').style.setProperty('--explorer-bank-height','0px');
  if(part==='vocabulary'){token++;const saved=hooks.state().explorerActivity;activity=indices.includes(saved)?saved:indices.find(index=>active.questions.some((q,i)=>q.passage===index&&hooks.state().answers[i]===undefined))??indices[0];hooks.state().explorerActivity=activity;activityNav(indices);}
  else showReading(indices[0]);
  if(redraw){hooks.changed();$('explorerParts').scrollIntoView({block:'start'});}
 }
 window.explorerShowContext=index=>{if(active){if(partFor(index)==='vocabulary')hooks.state().explorerActivity=index;selectPart(partFor(index),true);}};
 window.explorerRefresh=()=>{
  if(!active)return;const state=hooks.state();
  document.querySelectorAll('#explorerParts>button').forEach(b=>{const part=b.dataset.part==='vocabulary'?'vocabulary':Number(b.dataset.part);const qs=active.questions.map((q,i)=>partFor(q.passage)===part?i:-1).filter(i=>i>=0);const n=qs.filter(i=>state.answers[i]!==undefined).length;
   b.replaceChildren(make('strong',part==='vocabulary'?'Vocabulary':'Part '+part),make('small',(qs.every(hooks.submitted)?'Submitted · ':'')+n+' / '+qs.length+' answered'));b.setAttribute('aria-pressed',String(part===section));});
  const buttons=document.querySelectorAll('.explorer-pager button');buttons[0].disabled=parts.indexOf(section)===0;buttons[1].disabled=parts.indexOf(section)===parts.length-1;
  document.querySelectorAll('#explorerActivities button[data-activity]').forEach(b=>{const index=Number(b.dataset.activity),qs=active.questions.map((q,i)=>q.passage===index?i:-1).filter(i=>i>=0);b.textContent='Activity '+(Number(b.dataset.position)+1)+' · '+(qs.every(hooks.submitted)?'Submitted · ':'')+qs.filter(i=>state.answers[i]!==undefined).length+'/'+qs.length;b.setAttribute('aria-pressed',String(index===activity));});
  document.querySelectorAll('.explorer-bank button').forEach(b=>{const used=active.questions.some((q,i)=>q.passage===Number(b.dataset.section)&&q.options[state.answers[i]]?.text===b.textContent);b.classList.toggle('word-used',used);b.setAttribute('aria-pressed',String(selectedWord?.section===Number(b.dataset.section)&&selectedWord?.text===b.textContent));});
 };
 function activityNav(indices){
  const nav=make('nav');nav.id='explorerActivities';nav.className='explorer-activities';nav.setAttribute('aria-label','Vocabulary activities');
  indices.forEach((index,n)=>{const button=make('button');button.type='button';button.dataset.activity=index;button.dataset.position=n;button.onclick=()=>{activity=index;hooks.state().explorerActivity=index;selectedWord=null;hooks.changed();nav.scrollIntoView({block:'start'});};nav.append(button);});
  $('examResult').before(nav);window.explorerRefresh();
 }
 function wordBank(index){
  const bank=make('div');bank.className='explorer-bank';bank.id='explorerWordBanks';bank.setAttribute('aria-label','Word bank for this activity');
  const locked=hooks.submitted(active.questions.findIndex(q=>q.passage===index));
  active.passages[index].bank.forEach(word=>{const b=make('button',word.text);b.type='button';b.draggable=!locked;b.disabled=locked;b.dataset.section=index;b.onclick=()=>{selectedWord={section:index,text:word.text};window.explorerRefresh();$('explorerAnnouncement').textContent=word.text+' selected. Select its blank.';};b.ondragstart=e=>{e.dataTransfer.setData('text/plain',JSON.stringify({test:active.id,section:index,text:word.text}));e.dataTransfer.effectAllowed='copy';};bank.append(b);});bankObserver?.disconnect();bankObserver=new ResizeObserver(()=>$('practiceExam').style.setProperty('--explorer-bank-height',bank.getBoundingClientRect().height+'px'));bankObserver.observe(bank);return bank;
 }
 window.explorerActivityHeader=(q,i)=>{
  const first=active.questions.findIndex(item=>item.passage===q.passage);if(i!==first)return;
  const p=active.passages[q.passage],title=make('h3',section==='vocabulary'?'Activity '+(active.passages.filter((p,j)=>partFor(j)==='vocabulary').indexOf(p)+1):'Part '+section);title.className='explorer-activity-title';
  const header=make('div');header.className='explorer-activity-intro';header.append(title,make('p',p.instructions));
  const base=active.passages[p.readingContext]||p;
  const extras=p===base?[]:p.paragraphs.filter(text=>!base.paragraphs.includes(text));
  if(active.questions.some(item=>item.passage===q.passage&&bankQuestion(item))){header.append(make('p','Drag a word to a blank, or select a word and then select a blank.'),wordBank(q.passage));}
  const context=section==='vocabulary'?p.paragraphs:extras;
  if(context.length){
   const parent=section==='vocabulary'?make('details'):header;
   if(section==='vocabulary'){parent.className='explorer-activity-context';parent.open=active.questions.filter(item=>item.passage===q.passage).some(item=>/^\(?\d+\)?\s*_{2,}/.test(item.stem));parent.append(make('summary','Activity context'));header.append(parent);}
   context.forEach(value=>{const paragraph=formatted('p',value);paragraph.className='explorer-activity-text';parent.append(paragraph);});
  }
  return header;
 };
 function underlineBoxTargets(legend,q){
  for(const target of window.explorerWordBoxFormat?.[active.id]?.[q.number]||[]){const walker=document.createTreeWalker(legend,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const at=node.textContent.toLowerCase().indexOf(target.toLowerCase());if(at<0||node.parentElement.closest('u'))continue;const fragment=document.createDocumentFragment(),marked=make('u',node.textContent.slice(at,at+target.length));marked.className='explorer-match-target';fragment.append(document.createTextNode(node.textContent.slice(0,at)),marked,document.createTextNode(node.textContent.slice(at+target.length)));node.replaceWith(fragment);break;}}
 }
 window.explorerGap=(legend,choices,q,i)=>{
  const p=active.passages[q.passage];if(!bankQuestion(q))return false;underlineBoxTargets(legend,q);
  const state=hooks.state(),button=make('button'),picker=make('select'),clear=make('button','Clear');let value=state.answers[i];
  button.type='button';button.className='explorer-blank';button.setAttribute('aria-label','Blank for question '+(i+1));button.disabled=hooks.submitted(i);
  const placeholder=make('option','Choose a word');placeholder.value='';picker.append(placeholder);q.options.forEach((o,oi)=>{const option=make('option',o.text);option.value=oi;picker.append(option);});picker.setAttribute('aria-label','Choose a word for question '+(i+1));picker.disabled=hooks.submitted(i);picker.value=value===undefined?'':String(value);
  clear.type='button';clear.disabled=hooks.submitted(i);clear.setAttribute('aria-label','Clear answer to question '+(i+1));
  function update(word){const oi=q.options.findIndex(o=>o.text===word);if(oi<0)return;hooks.answer(i,oi);value=hooks.state().answers[i];sync();}
  function sync(){button.textContent=q.options[value]?.text||'Select or drop a word';picker.value=value===undefined?'':String(value);clear.hidden=value===undefined;}
  button.onclick=()=>{if(selectedWord?.section===q.passage)update(selectedWord.text);else{picker.parentElement.open=true;picker.focus();$('explorerAnnouncement').textContent='Choose a word from the bank or the list below this blank.';}};
  button.ondragover=e=>{if(!hooks.submitted(i)){e.preventDefault();button.classList.add('drag-over');e.dataTransfer.dropEffect='copy';}};button.ondragleave=()=>button.classList.remove('drag-over');
  button.ondrop=e=>{e.preventDefault();button.classList.remove('drag-over');if(hooks.submitted(i))return;try{const word=JSON.parse(e.dataTransfer.getData('text/plain'));if(word.test===active.id&&word.section===q.passage)update(word.text);else $('explorerAnnouncement').textContent='Use the word bank for this activity.';}catch(_){}};
  picker.onchange=()=>{hooks.answer(i,picker.value===''?undefined:Number(picker.value));value=hooks.state().answers[i];sync();};clear.onclick=()=>{hooks.answer(i,undefined);value=hooks.state().answers[i];sync();};
  const walker=document.createTreeWalker(legend,NodeFilter.SHOW_TEXT);let target;while(walker.nextNode()){if(/_{2,}/.test(walker.currentNode.textContent)){target=walker.currentNode;break;}}
  if(target){const match=/_{2,}/.exec(target.textContent),fragment=document.createDocumentFragment();fragment.append(document.createTextNode(target.textContent.slice(0,match.index)),button,document.createTextNode(target.textContent.slice(match.index+match[0].length)));target.replaceWith(fragment);}else legend.append(document.createTextNode(' → '),button);
  const tools=make('div');tools.className='explorer-blank-tools';const fallback=make('details');fallback.className='explorer-list-fallback';fallback.append(make('summary','Choose from list'),picker);tools.append(fallback,clear);choices.append(tools);sync();
  if(hooks.submitted(i)){button.classList.add(hooks.correct(q,value)?'correct':'wrong');choices.append(make('p','Correct answer: '+q.options[q.key].text));}
  return true;
 };
 document.addEventListener('focusin',event=>{if(!active||section!=='vocabulary')return;const field=event.target.closest?.('.exam-question');if(!field)return;requestAnimationFrame(()=>{const bank=document.getElementById('explorerWordBanks');if(!bank||!field.isConnected)return;const top=bank.getBoundingClientRect().bottom+12,rect=field.getBoundingClientRect();if(rect.top<top&&rect.height<innerHeight-top-12)window.scrollBy(0,rect.top-top);});});
 async function showReading(index){
  if(!active)return;const test=active,current=++token,source=test.passages[index];if(!source)return;
  const base=test.passages[source.readingContext]||source;
  const p={...base,images:[...base.images],imageCaptions:[...(base.imageCaptions||[])],bank:[],tables:[]};
  source.images.forEach((src,i)=>{if(!p.images.includes(src)){p.images.push(src);p.imageCaptions.push(source.imageCaptions?.[i]||'');}});
  const text=$('examPassage');text.replaceChildren(formatted('h3',p.title));p.paragraphs.forEach(value=>text.append(formatted('p',value)));
  if(p.bank.length){const bank=make('p','Word bank: '+p.bank.map(o=>o.text).join(' · '));bank.className='explorer-word-bank';text.append(bank);}
  else p.tables.forEach(rows=>table(text,rows));
  p.images.forEach((src,i)=>{if(p.imageCaptions?.[i])text.append(make('h4',p.imageCaptions[i]));const img=make('img');img.src=src;img.alt='Figure supplied with this exercise';img.className='explorer-figure';text.append(img);});
  window.readingPassageTargets(text,test.questions.filter(q=>partFor(q.passage)===section));
  const imageBox=$('examPassageImage');imageBox.replaceChildren();
  // SVG keeps the source's paragraph labels and figures crisp at any zoom level.
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),parts=[];let y=48;
  const targets=test.questions.filter(q=>partFor(q.passage)===section&&q.target).map(q=>q.target);
  const escaped=targets.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const targetPattern=escaped.length?new RegExp('(?<![\\p{L}\\p{N}_])('+escaped.join('|')+')(?![\\p{L}\\p{N}_])','giu'):null;
  function styledRuns(value,raised,bold,offset){
   const clip=ranges=>ranges.map(([a,b])=>[Math.max(0,a-offset),Math.min(value.length,b-offset)]).filter(([a,b])=>a<b);
   raised=clip(raised);bold=clip(bold);
   const bounds=[...new Set([0,value.length,...bold.flat(),...raised.flat()])].sort((a,b)=>a-b);
   return bounds.slice(0,-1).map((a,i)=>{const b=bounds[i+1];return {text:value.slice(a,b),bold:bold.some(([x,y])=>a>=x&&b<=y),sup:raised.some(([x,y])=>a>=x&&b<=y)};});
  }
  function lines(value,size,bold=false){
   value=String(value);const raised=raisedRanges(value),emphasis=[];
   if(targetPattern){targetPattern.lastIndex=0;for(const m of value.matchAll(targetPattern))emphasis.push([m.index,m.index+m[0].length]);}
   const runs=(text,offset)=>styledRuns(text,raised,emphasis,offset);
   const measure=(text,offset)=>runs(text,offset).reduce((width,run)=>{ctx.font=((bold||run.bold)?'bold ':'')+(size*(run.sup?0.65:1))+'px Georgia';return width+ctx.measureText(run.text).width;},0);
   const rows=[];let start=-1,end=0;
   for(const word of value.matchAll(/\S+/g)){
    if(start<0)start=word.index;
    const next=word.index+word[0].length;
    if(end>start&&measure(value.slice(start,next),start)>810){rows.push([start,end]);start=word.index;}
    // Long unbroken strings also stay inside the page.
    while(measure(value.slice(start,next),start)>810&&next-start>1){let cut=start+1;while(cut<next&&measure(value.slice(start,cut+1),start)<=810)cut++;rows.push([start,cut]);start=cut;}
    end=next;
   }
   if(start>=0&&end>start)rows.push([start,end]);
   rows.forEach(([from,to])=>{const markup=runs(value.slice(from,to),from).map(run=>'<tspan'+(run.bold?' font-weight="bold"':'')+(run.sup?' baseline-shift="super" font-size="65%"':'')+'>'+escape(run.text)+'</tspan>').join('');parts.push('<text x="40" y="'+y+'" font-family="Georgia,serif" font-size="'+size+'"'+(bold?' font-weight="bold"':'')+'>'+markup+'</text>');y+=size*1.55;});y+=14;
  }
  lines(p.title,25,true);p.paragraphs.forEach(value=>lines(value,19));
  if(p.bank.length)lines('Word bank: '+p.bank.map(o=>o.text).join(' · '),19);else p.tables.forEach(rows=>rows.forEach(row=>lines(row.join(' | '),18)));
  for(let i=0;i<p.images.length;i++){const src=p.images[i];if(p.imageCaptions?.[i])lines(p.imageCaptions[i],20,true);const img=new Image();img.src=src;try{await img.decode();}catch(_){continue;}const width=Math.min(820,img.naturalWidth),height=width*img.naturalHeight/img.naturalWidth;parts.push('<image x="40" y="'+y+'" width="'+width+'" height="'+height+'" href="'+escape(src)+'"/>');y+=height+24;}
  if(current!==token||active!==test)return;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="'+Math.ceil(y+25)+'" viewBox="0 0 900 '+Math.ceil(y+25)+'"><rect width="100%" height="100%" fill="white"/>'+parts.join('')+'</svg>';
  const image=make('img');image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);image.alt=p.title+' formatted passage and figures';imageBox.append(image);$('examPassagePanel').scrollTop=0;
 };
})();
