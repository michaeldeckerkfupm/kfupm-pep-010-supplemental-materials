const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
(async()=>{const server=http.createServer((req,res)=>{const name=req.url.split('?')[0];if(name==='/tests.json'){res.setHeader('Content-Type','application/json');res.end('[]');return;}const file=path.join(process.cwd(),name==='/'?'index.html':name);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(8771,r));const browser=await chromium.launch({executablePath:'/tmp/reading-chromium',headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));let references=0,views=0;
for(const book of [2,3])for(const unit of require('./explorer-data/book'+book+'.json')){
 if(!Object.keys(unit.superscripts).length)continue;
 await page.goto('http://localhost:8771/reading-practice.html?collection=reading-explorer-'+book+'&reading='+unit.id);await page.waitForSelector('#exam-q-0');
 const parts=[...new Set(unit.passages.map(p=>p.part))];
 for(const part of parts){await page.locator('#explorerParts>button[data-part="'+part+'"]').click();
  if(part==='vocabulary'){for(const p of unit.passages.filter(p=>p.part===part)){await page.locator('[data-activity="'+p.id+'"]').click();const expected=p.paragraphs.flatMap(text=>(unit.superscripts[text]||[]).map(([a,b])=>text.slice(a,b)));assert.deepEqual(await page.locator('#examQuestions sup').allTextContents(),expected);references+=expected.length;}continue;}
  const source=unit.passages.find(p=>p.part===part),base=unit.passages[source.readingContext];
  const expected=[base.title,...base.paragraphs].flatMap(text=>(unit.superscripts[text]||[]).map(([a,b])=>text.slice(a,b)));
  await page.waitForSelector('#examPassageImage img');await page.locator('#examPassageImage img').evaluate(i=>i.decode());
  const svg=await page.locator('#examPassageImage img').evaluate(i=>decodeURIComponent(i.src.split(',').slice(1).join(',')));
  const actual=await page.evaluate(svg=>[...new DOMParser().parseFromString(svg,'image/svg+xml').querySelectorAll('tspan[baseline-shift=super]')].map(n=>n.textContent),svg);assert.deepEqual(actual,expected,book+' '+unit.id+' part '+part+' page view');
  await page.locator('#passageTextButton').click();assert.deepEqual(await page.locator('#examPassage sup').allTextContents(),expected,book+' '+unit.id+' part '+part+' text view');
  const texts=await page.locator('#examPassage').evaluate(e=>[e.querySelector('h3').textContent,...[...e.querySelectorAll(':scope>p')].map(n=>n.textContent)]);assert.deepEqual(texts,[base.title,...base.paragraphs]);
  references+=expected.length;views++;
  await page.locator('#passageImageButton').click();
 }
}
await page.goto('http://localhost:8771/reading-practice.html?collection=reading-explorer-2&reading=10A');await page.waitForSelector('#explorerParts');await page.locator('[data-part="2"]').click();await page.waitForSelector('#examPassageImage img');await page.locator('#examPassageImage img').evaluate(i=>i.decode());await page.screenshot({path:'/tmp/explorer-superscript-page.png'});await page.locator('#passageTextButton').click();await page.screenshot({path:'/tmp/explorer-superscript-text.png'});
const geometry=await page.locator('#examPassage sup').first().evaluate(s=>{const p=s.previousSibling,r=document.createRange();r.setStart(p,p.textContent.length-1);r.setEnd(p,p.textContent.length);return {sup:s.getBoundingClientRect().top,normal:r.getBoundingClientRect().top};});assert(geometry.sup<geometry.normal,'Footnote marker must be raised');assert.deepEqual(errors,[]);console.log('Passed: '+references+' superscript markers across '+views+' reading contexts, both passage views, vocabulary text, unchanged plain text and raised marker geometry.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exit(1)});
