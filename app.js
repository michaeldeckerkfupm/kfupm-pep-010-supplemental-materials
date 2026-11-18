'use strict';
const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const labels={short:'Short Listenings',long:'Long Listenings',full:'Full Exams'};let tests=[],active=null,state=null,tick=null,expandedSection=null;
const key=t=>'kfupm-listening-v1:'+t.section+':'+t.series+':'+t.number+(t.revision?':'+t.revision:'');
function shuffled(n){let a=Array.from({length:n},(_,i)=>i);for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function save(){if(active)try{localStorage.setItem(key(active),JSON.stringify(state))}catch(_){/* Continue practice if browser storage is unavailable. */}}
function collapseSection(){expandedSection=null;$('#tests').hidden=true;document.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-expanded','false'))}
// Collapse only on a deliberate outside click; scrolling and interactions inside stay untouched.
document.addEventListener('click',event=>{if($('#home').hidden||!expandedSection||event.defaultPrevented)return;if(event.target.closest('#sectionMenu, #tests'))return;if(!window.getSelection().isCollapsed)return;collapseSection()});
function menu(preserveView=false){collapseSection();clearInterval(tick);$('#audio').pause();if(preserveView!==true){$('#quiz').hidden=true;$('#home').hidden=false;$('#readingLesson').hidden=true;$('#readingQuiz').hidden=true;}$('#tests').innerHTML='';$('#sectionMenu').innerHTML=Object.entries(labels).map(([id,label])=>`<button class="card" data-section="${id}" aria-expanded="false" aria-controls="tests"><strong>${label}</strong><small>${tests.filter(x=>x.section===id).length} practice tests</small></button>`).join('');document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>showSection(b.dataset.section));if(preserveView!==true)window.scrollTo(0,0)}
function showSection(section){if(expandedSection===section){collapseSection();return}expandedSection=section;$('#tests').hidden=false;document.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.section===section)));const chosen=tests.filter(t=>t.section===section);let html=`<h2>${labels[section]}</h2>`;if(section==='full')html+='<p class="notice"><strong>Important:</strong> These practice exams may not match the full exam format. The full exam will have 10 short listening questions, with one recording per question, and one long listening section with 10 questions and a single long recording. Some practice exams reuse recordings and questions, so repeat scores do not represent independent progress checks.</p>';if(section==='short')html+='<p>Set 1: read the questions before starting the recording. Set 2: the recording includes 60 seconds to read the questions before listening, as in the long listening tests.</p>';if(section==='long')html+='<p>The recording includes 60 seconds to read the questions.</p>';for(const series of [...new Set(chosen.map(t=>t.series))]){html+=`<h3>${esc(series)}</h3><div class="grid">`;for(const t of chosen.filter(x=>x.series===series))html+=`<button class="card" data-open="${tests.indexOf(t)}" ${t.audio?'':'disabled'}><strong>Test ${t.number}</strong><small>${t.questions.length} questions${t.audio?'':' · recording unavailable'}</small></button>`;html+='</div>'}$('#tests').innerHTML=html;document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openTest(tests[+b.dataset.open]));$('#tests').scrollIntoView({behavior:'smooth'})}
function openTest(t,reset=false){active=t;try{state=reset?null:JSON.parse(localStorage.getItem(key(t))||'null')}catch(e){state=null}if(!state||state.answers.length!==t.questions.length)state={answers:Array(t.questions.length).fill(null),flags:Array(t.questions.length).fill(false),order:t.questions.map(q=>shuffled(q.options.length)),submitted:false,deadline:null};save();$('#home').hidden=true;$('#quiz').hidden=false;$('#title').textContent=labels[t.section]+' · '+t.series+' · Test '+t.number;$('#instructions').textContent=t.section==='short'?(t.series==='Set 2'?'The recording includes 60 seconds to read the questions before listening.':'Read the questions before playing the audio.'):t.section==='long'?'The recording includes 60 seconds to read the questions. Follow the spoken instructions.':'Follow the instructions in the recording.';loadAudio(t.audio);render();window.scrollTo(0,0)}

let audioRequest=null,audioObjectUrl=null;
async function loadAudio(src){
 const player=$('#audio'),status=$('#audioStatus');
 if(audioRequest)audioRequest.abort();
 player.pause();player.removeAttribute('src');player.load();
 if(audioObjectUrl){URL.revokeObjectURL(audioObjectUrl);audioObjectUrl=null}
 const request=new AbortController();audioRequest=request;
 status.textContent='Loading recording. Playback and seeking will be available when loading finishes.';
 try{
  const response=await fetch(src,{signal:request.signal});
  if(!response.ok)throw new Error('Audio download failed');
  const blob=await response.blob();
  if(request.signal.aborted)return;
  audioObjectUrl=URL.createObjectURL(blob);
  player.onloadedmetadata=()=>{if(state?.audioTime && Number.isFinite(player.duration))player.currentTime=Math.min(state.audioTime,player.duration);};player.src=audioObjectUrl;player.load();
  status.textContent='';
 }catch(error){
  if(error.name==='AbortError')return;
  status.textContent='The recording could not be loaded. Check your connection and reopen this test.';
 }
}

function pictures(images){return (images||[]).map(p=>`<img src="${esc(p.replace(/\.emf$/i,'.png'))}" alt="Answer illustration" loading="lazy">`).join('')}
function feedback(q,i){if(!state.submitted)return '';if(!Number.isInteger(q.answer))return '<p class="notice">No answer key was supplied for this question. It is not scored.</p>';let pos=state.order[i].indexOf(q.answer);let letter=String.fromCharCode(65+pos);let answer=q.options[q.answer];let desc=answer.text.trim()?esc(answer.text):'see the illustration in the correct answer above';let status=state.answers[i]===null?'Not answered':state.answers[i]===q.answer?'Correct':'Incorrect';return `<div class="feedback" role="status"><strong>${status}.</strong> Correct answer: ${letter}. ${desc}</div>`}
const formatToggle = $('#listeningDropdowns');
const formatKey = 'kfupm-listening-dropdowns';
try {
  formatToggle.checked = localStorage.getItem(formatKey) === 'true';
} catch (_) { /* Use the default when storage is unavailable. */ }

formatToggle.onchange = () => {
  try { localStorage.setItem(formatKey, String(formatToggle.checked)); } catch (_) {}
  render();
};

function dropdownChoices(question, index) {
  let options = '<option value="" disabled' + (state.answers[index] === null ? ' selected' : '') + '>Choose an answer</option>';
  let illustrations = '';
  for (const [position, optionIndex] of state.order[index].entries()) {
    const option = question.options[optionIndex];
    const letter = String.fromCharCode(65 + position);
    const selected = state.answers[index] === optionIndex ? ' selected' : '';
    options += `<option value="${optionIndex}"${selected}>${letter}. ${esc(option.text.trim() || 'Illustration ' + letter)}</option>`;
    if (option.images?.length) {
      illustrations += `<figure><figcaption>Option ${letter}</figcaption>${pictures(option.images)}</figure>`;
    }
  }
  return illustrations + `<select class="listening-answer" data-listening-answer="${index}" aria-labelledby="listening-number-${index} listening-stem-${index}" ${state.submitted ? 'disabled' : ''}>${options}</select>`;
}

function render(){const n=active.questions.length,completed=state.answers.filter(x=>x!==null).length;$('#answered').textContent=`${completed} of ${n} answered`;$('#progress').max=n;$('#progress').value=completed;$('#navigation').innerHTML=active.questions.map((_,i)=>`<button data-jump="${i}" class="${state.flags[i]?'flagged':''}" aria-label="Question ${i+1}${state.flags[i]?', flagged':''}">${i+1}${state.flags[i]?' ⚑':''}</button>`).join('');let marked=active.questions.filter(q=>Number.isInteger(q.answer));let correct=active.questions.reduce((v,q,i)=>v+(q.answer!==null&&q.answer===state.answers[i]?1:0),0);$('#result').innerHTML=state.submitted?`<div class="result"><strong>Score: ${correct} / ${marked.length}</strong>${marked.length<n?`<p>${n-marked.length} question(s) have no supplied answer key and are not scored.</p>`:''}</div>`:'';$('#questions').innerHTML=active.questions.map((q,i)=>{let controls=formatToggle.checked ? dropdownChoices(q,i) : state.order[i].map((oi,pos)=>{let o=q.options[oi],cl=state.answers[i]===oi?'selected':'';if(state.submitted&&q.answer!==null){if(oi===q.answer)cl='correct';else if(oi===state.answers[i])cl='wrong'}return `<button class="choice ${cl}" data-q="${i}" data-option="${oi}" ${state.submitted?'disabled':''} aria-pressed="${state.answers[i]===oi}"><span class="letter">${String.fromCharCode(65+pos)}</span><span>${esc(o.text)}${pictures(o.images)}${state.submitted&&q.answer===oi?'<strong class="choice-label">Correct answer</strong>':state.submitted&&state.answers[i]===oi&&q.answer!==null?'<strong class="choice-label">Your answer</strong>':''}</span></button>`}).join('');return `<article class="question-card" id="question-${i}" tabindex="-1"><div class="toolbar"><strong id="listening-number-${i}">Question ${i+1}</strong><button data-flag="${i}" class="${state.flags[i]?'flagged':''}" aria-pressed="${state.flags[i]}">${state.flags[i]?'Flagged':'Flag question'}</button></div><h2 id="listening-stem-${i}">${esc(q.stem)}</h2>${pictures(q.images)}${controls}${feedback(q,i)}</article>`}).join('');$('#submit').hidden=state.submitted;document.querySelectorAll('[data-listening-answer]').forEach(select => {
  select.onchange = () => {
    state.answers[Number(select.dataset.listeningAnswer)] = Number(select.value);
    save();
    const count = state.answers.filter(answer => answer !== null).length;
    $('#answered').textContent = `${count} of ${n} answered`;
    $('#progress').value = count;
  };
});document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{state.answers[+b.dataset.q]=+b.dataset.option;save();render()});document.querySelectorAll('[data-flag]').forEach(b=>b.onclick=()=>{let i=+b.dataset.flag;state.flags[i]=!state.flags[i];save();render()});document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{let el=$('#question-'+b.dataset.jump);el.scrollIntoView({behavior:'smooth'});el.focus({preventScroll:true})})}
$('#back').onclick=menu;$('#reset').onclick=()=>{if(confirm('Restart this test and clear your answers?')){let t=active;$('#audio').pause();openTest(t,true)}};$('#submit').onclick=()=>{let missing=state.answers.filter(x=>x===null).length;if(missing&&!confirm(`${missing} question(s) are unanswered. Submit anyway?`))return;state.submitted=true;$('#audio').pause();save();render();$('#result').scrollIntoView({behavior:'smooth'})};fetch('tests.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{tests=d;menu(!$('#readingLesson').hidden||!$('#readingQuiz').hidden)}).catch(()=>{$('#sectionMenu').textContent='Unable to load tests. Please refresh the page.'});

let lastAudioSave=0;function saveAudioPosition(){if(active&&state){const audio=document.getElementById("audio");if(audio.readyState>0){state.audioTime=audio.currentTime;save();}}}document.getElementById("audio").addEventListener("timeupdate",()=>{if(Date.now()-lastAudioSave>1000){lastAudioSave=Date.now();saveAudioPosition();}});window.addEventListener("pagehide",saveAudioPosition);document.querySelector(".brand-home")?.addEventListener("click",saveAudioPosition);
