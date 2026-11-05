'use strict';
(() => {
 const menus=[
  {trigger:'readingTestsButton',box:'readingTestsContents',group:'major-1',title:'Major 1'},
  {trigger:'otherReadingButton',box:'otherReadingContents',group:'major-2-final',title:'Major 2 and Final Exam'},
  {trigger:'readingExplorerButton',box:'readingExplorerContents',group:'reading-explorer',title:'Reading Explorer Supplemental Materials'}
 ];
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 let pending;
 function collections(){
  if(!pending)pending=fetch('reading-collections.json').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(e=>{pending=null;throw e;});
  return pending;
 }
 function close(m){m.expanded=false;document.getElementById(m.box).hidden=true;document.getElementById(m.trigger).setAttribute('aria-expanded','false');}
 async function open(m){
  if(m.expanded){close(m);return;}
  menus.filter(x=>x!==m).forEach(close);
  const guide=document.getElementById('readingGuideButton');
  if(guide.getAttribute('aria-expanded')==='true')guide.click();
  collapseSection();m.expanded=true;
  const trigger=document.getElementById(m.trigger),box=document.getElementById(m.box);
  trigger.setAttribute('aria-expanded','true');box.hidden=false;box.replaceChildren(node('p','Loading reading tests...'));
  try{
   const data=(await collections()).filter(c=>c.group===m.group);
   if(!m.expanded)return;
   box.replaceChildren(node('h3',m.title));
   const grid=node('div',undefined,'grid reading-toc packet-choices');
   data.forEach(collection=>{
    const card=node('a',undefined,'panel card packet-choice');
    card.id='packet-'+collection.id;card.href=window.materialsEmbedURL('reading-practice.html?collection='+encodeURIComponent(collection.id));
    card.append(node('strong',collection.title),node('small',collection.count+' '+(collection.itemLabel||'readings')+' · 20 minutes each'));
    if(collection.vocabulary)card.append(node('small','Vocabulary practice included'));
    card.append(node('span','Open readings','packet-action'));grid.append(card);
   });
   box.append(grid);
  }catch(_){if(m.expanded)box.replaceChildren(node('p','The tests could not be loaded. Close this menu and try again.'));}
 }
 menus.forEach(m=>document.getElementById(m.trigger).onclick=()=>open(m));
 document.addEventListener('click',event=>{
  if(document.getElementById('home').hidden||event.defaultPrevented||!window.getSelection().isCollapsed)return;
  menus.forEach(m=>{if(m.expanded&&!event.target.closest('#'+m.trigger+',#'+m.box))close(m);});
 });
})();
