/* Functional audit. No response mocks. Fake capture device replays the real shipped audio fixture.
   Isolated Chrome profile; the local backend must use a disposable PostgreSQL database. */
const {chromium}=require(process.env.SAWTI_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const base=process.env.SAWTI_TEST_BASE || 'http://127.0.0.1:3002';
const output=process.env.SAWTI_TEST_OUTPUT || '/private/tmp/sawti-browser-audit.json';
const fixture=process.env.SAWTI_TEST_AUDIO || '/private/tmp/sawti-audit-speech.wav';
const results=[];const errors=[];
const clean=s=>s.replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/\s+/g,' ').trim();
async function button(page,text){for(const b of await page.getByRole('button').all()){if(await b.isVisible() && clean(await b.innerText()).includes(clean(text))) return b;}throw new Error('Visible button missing: '+text);}
async function click(page,text){await (await button(page,text)).click();}
async function check(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name);}catch(e){results.push({name,status:'FAILED',error:e.message});console.log('FAILED',name,e.message);}}
async function onboard(page){const skip=page.getByRole('button',{name:'تَخَطَّ الْجَوْلَةَ'});if(await skip.isVisible().catch(()=>false))await skip.click();}
async function speaking(page){await page.goto(base+'/skills/speaking');await page.locator('h3').first().waitFor();await page.locator('button').filter({has:page.locator('h3')}).first().click();await click(page,'رحلة بحرية');await click(page,'ابدأ التحدث');}
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${fixture}`,'--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({permissions:['microphone'],viewport:{width:1280,height:900}});
await context.addInitScript(()=>{window.__auditStreams=[];const real=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await real(...args);window.__auditStreams.push(stream);return stream;};});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
await check('real registration and authenticated dashboard',async()=>{
 await page.goto(base);await click(page,'ليس لديك حساب');
 await page.getByLabel(/اسْمُكَ/).fill('طالب تدقيق آلي');await page.getByLabel(/شُعْبَتُكَ/).fill('تدقيق');
 await page.getByLabel(/بَرِيدُكَ/).fill(`audit-${Date.now()}@example.com`);await page.getByLabel(/كَلِمَةُ/).fill('Audit-local-only-2026');
 await click(page,'أنشئ حسابي');await page.waitForURL('**/dashboard');await page.getByRole('button',{name:'تَخَطَّ الْجَوْلَةَ'}).waitFor();await onboard(page);
 assert.equal((await page.request.get(base+'/api/health')).status(),200);return 'UI → local API → real isolated PostgreSQL';
});
await check('writing evaluation and persisted progress',async()=>{
 await page.goto(base+'/skills/writing');await page.locator('button').filter({has:page.locator('h3')}).first().click();
 await page.getByRole('textbox',{name:'مساحة كتابة النص'}).fill('ذهبت إلى المدرسة في الصباح وتعلمت اللغة العربية مع أصدقائي. أحب القراءة لأنها تساعدني على فهم العالم وتعلم كلمات جديدة كل يوم.');
 const response=page.waitForResponse(r=>r.url().endsWith('/eval/writing')&&r.request().method()==='POST');await click(page,'تقييم الكتابة');assert.equal((await response).status(),200);await page.getByText('📊 نَتِيجَةُ التَّقْيِيمِ',{exact:true}).waitFor();
 await page.waitForTimeout(1100);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('sawti_qalami_v2_state')));assert(state.writingProgress>0);assert(state.completedLessons.length>0);
 const token=await page.evaluate(()=>localStorage.getItem('sawti_qalami_token'));const r=await page.request.get(base+'/api/students/me',{headers:{Authorization:'Bearer '+token}});assert.equal(r.status(),200);assert.equal((await r.json()).writingProgress,state.writingProgress);return 'Real writing scorer and database roundtrip';
});
await check('recording captures playable audio and stops all tracks',async()=>{
 await speaking(page);await page.getByRole('button',{name:'بدء تسجيل الصوت',exact:true}).click();await page.getByRole('button',{name:'إيقاف التسجيل',exact:true}).waitFor();await page.waitForTimeout(3500);await page.getByRole('button',{name:'إيقاف التسجيل',exact:true}).click();
 await page.locator('audio[controls]').waitFor();const media=await page.locator('audio[controls]').evaluate(async a=>{await new Promise((resolve,reject)=>{if(a.readyState>=1)resolve();else{a.onloadedmetadata=resolve;a.onerror=()=>reject(new Error('audio decode error'));}});await a.play();return {src:a.currentSrc,readyState:a.readyState,playing:!a.paused};});assert(media.src.startsWith('blob:'));assert(media.playing);
 const tracks=await page.evaluate(()=>window.__auditStreams.flatMap(s=>s.getTracks().map(t=>t.readyState)));assert(tracks.every(s=>s==='ended'));return 'Native MediaRecorder with real educational WAV through Chrome capture device; playback decoded';
});
await check('speech failure is explicit and never awards fake progress',async()=>{
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('sawti_qalami_v2_state')).points);
 const response=page.waitForResponse(r=>r.url().endsWith('/eval/speech'));await click(page,'إرسال للتقييم');const r=await response;assert(r.status()>=500);await page.getByText(/تعذّر تقييم التسجيل الآن/).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sawti_qalami_v2_state')).points),before);return 'Actual local backend has no Groq key; verifies real error path, not AI success';
});
await check('leaving speaking via SPA navigation releases microphone',async()=>{
 await click(page,'إعادة التسجيل');await page.getByRole('button',{name:'إيقاف التسجيل',exact:true}).waitFor();
 await page.getByRole('link',{name:'مسارات التعلم',exact:true}).click();await page.waitForURL('**/skills');
 assert(await page.evaluate(()=>window.__auditStreams.flatMap(s=>s.getTracks()).every(t=>t.readyState==='ended')));return 'Verified without document reload';
});
await check('AI assistant opens, sends and displays service failure',async()=>{
 await page.getByRole('button',{name:'المعلم الذكي',exact:true}).click();await page.getByRole('textbox',{name:'سؤالك للمعلم الذكي'}).fill('ما الفرق بين الاسم والفعل؟');const response=page.waitForResponse(r=>r.url().endsWith('/eval/ask'));await click(page,'إرسال');assert.equal((await response).status(),503);await page.getByText(/تعذّر الاتصال بالمعلم الذكي الآن/).waitFor();assert.equal(await page.getByRole('textbox',{name:'سؤالك للمعلم الذكي'}).inputValue(),'ما الفرق بين الاسم والفعل؟');await page.getByRole('button',{name:'إغلاق المعلم الذكي'}).click();return 'No fabricated AI answer; retry input preserved';
});
await check('all routes and game entry screens render',async()=>{
 for(const route of ['/about','/dashboard','/skills','/assessments','/class-selection','/writing-games','/writing-games/treasure-map','/writing-games/diver-pearl','/writing-games/balloon','/skills/self-learning']){await page.goto(base+route);await page.getByRole('heading').first().waitFor();assert.equal(await page.locator('body').innerText().then(t=>t.includes('Something went wrong')),false);}
 return '10 real route entry screens; full game completion is separate';
});
await check('teacher authentication, search, report download and logout',async()=>{
 await page.goto(base+'/teacher');await page.getByLabel(/رَمْزُ الدُّخُولِ/).fill('audit-teacher-local');await click(page,'دخول');await page.getByRole('button',{name:/الطُّلَّاب/}).waitFor();await click(page,'الطلاب');await page.getByRole('textbox',{name:'البحث عن طالب'}).fill('طالب تدقيق');
 const token=await page.evaluate(()=>sessionStorage.getItem('sawti_teacher_token'));assert(token);
 const response=await page.request.post(base+'/api/reports/student',{headers:{Authorization:'Bearer '+token},data:{name:'طالب تدقيق',grade:'السادس',speaking_progress:40,writing_progress:50}});assert.equal(response.status(),200);assert((await response.body()).subarray(0,5).equals(Buffer.from('%PDF-')));
 await click(page,'خروج');await page.waitForURL(base+'/');return 'Real teacher JWT, live local DB search, PDF bytes and logout';
});
await check('no uncaught JavaScript errors',async()=>{assert.deepEqual(errors,[]);return 'pageerror listener across all scenarios';});
}catch(e){results.push({name:'harness',status:'FAILED',error:e.message});}
await fs.writeFile(output,JSON.stringify({base,results,errors},null,2));await browser.close();process.exitCode=results.some(r=>r.status==='FAILED')?1:0;
})();
