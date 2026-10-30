/* Layout smoke checks only; this does not certify physical mobile microphone support. */
const {chromium}=require(process.env.SAWTI_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const base=process.env.SAWTI_TEST_BASE||'http://127.0.0.1:3002';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();const results=[];
 try{
  await page.goto(base);
  const guest=await page.request.post(base+'/api/auth/guest-login',{data:{}});
  assert.equal(guest.status(),200);const {token}=await guest.json();
  await page.evaluate(token=>localStorage.setItem('sawti_qalami_token',token),token);
  await page.goto(base);await page.waitForURL('**/dashboard');
  await page.getByRole('button',{name:'تَخَطَّ الْجَوْلَةَ'}).click();
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of ['/dashboard','/skills','/skills/speaking','/skills/writing','/skills/self-learning','/writing-games']){
    await page.goto(base+route);await page.getByRole('heading').first().waitFor();
    const size=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
    assert(size.document<=size.viewport+1,`${route} at ${width}: horizontal overflow ${size.document}`);
    results.push({route,width,status:'PASS'});
   }
   await page.getByRole('button',{name:'المعلم الذكي',exact:true}).click();
   const input=page.getByRole('textbox',{name:'سؤالك للمعلم الذكي'});await input.fill('ما الجملة؟');
   const box=await input.boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width+1);
   results.push({feature:'assistant input visible and usable',width,status:'PASS'});
   await page.getByRole('button',{name:'إغلاق المعلم الذكي'}).click();
  }
 }catch(e){results.push({status:'FAILED',error:e.message});process.exitCode=1}
 await fs.writeFile('/private/tmp/sawti-responsive-results.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));await browser.close();
})();
