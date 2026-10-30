/* Isolated fault-injection timing checks, not proof of API success. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs/promises');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const out=[];
for(const scenario of ['slow-session-api','unavailable-font-host','new-visitor']){
 const c=await b.newContext();await c.route('**/api/**',r=>new Promise(()=>{}));
 if(scenario==='slow-session-api')await c.addInitScript(()=>localStorage.setItem('sawti_qalami_token','test.'+btoa(JSON.stringify({sub:'startup-isolated-test',exp:9999999999}))+'.test'));
 if(scenario==='unavailable-font-host')await c.route('https://fonts.googleapis.com/**',r=>new Promise(()=>{}));
 const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));const start=Date.now();await p.goto('http://127.0.0.1:3000/',{waitUntil:'commit'});
 let formMs=null;try{await p.getByLabel(/بَرِيدُكَ/).waitFor({state:'visible',timeout:2500});formMs=Date.now()-start;}catch{}
 out.push({scenario,formVisibleWithin2500ms:formMs!==null,formMs,bodyText:(await p.locator('body').innerText()).slice(0,120),errors});await c.close();
}await b.close();await fs.writeFile(process.env.SAWTI_PERF_OUTPUT||'/private/tmp/sawti-startup-review.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));})();
