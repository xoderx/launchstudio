import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const origin=process.env.BASE_URL||'http://localhost:3000';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const out=process.env.MARKETING_REVIEW_OUTPUT||'/workspace/work/launchstudio/work/marketing-review';mkdirSync(out,{recursive:true});
const paths=['/','/product','/solutions','/tools','/academy','/covibecoder','/pricing','/about','/contact','/partners','/early-access','/privacy','/terms','/ai-disclaimer','/transform','/exit-ready'];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext();const page=await context.newPage();const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 for(const width of [1440,390])for(const theme of ['dark','light'])for(const path of paths){
  await page.setViewportSize({width,height:1000});const r=await page.goto(origin+path,{waitUntil:'networkidle'});assert.equal(r.status(),200,path);
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;localStorage.setItem('launchstudio-theme',theme);},theme);await page.waitForTimeout(250);
  assert.equal(await page.locator('h1').count(),1,path);assert.ok((await page.locator('head meta[name="description"]').getAttribute('content')).length>50,path);
  assert.match(await page.locator('head meta[property="og:image"]').getAttribute('content'),/opengraph-image/);assert.match(r.headers()['x-robots-tag'],/noindex/);assert.match(await page.locator('head meta[name="robots"]').getAttribute('content'),/noindex/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${width} ${theme} ${path}`);
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();const violations=a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));checks.push({path,width,theme,violations});if(violations.length)throw Error(JSON.stringify(checks.at(-1)));
  if(path==='/'||['/tools','/covibecoder','/early-access'].includes(path)&&width===1440&&theme==='dark')await page.screenshot({path:`${out}/${path==='/'?'home':path.slice(1)}-${width}-${theme}.png`,fullPage:path==='/'});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin);
 await page.getByRole('button',{name:'Find customers',exact:true}).click();assert.match(await page.locator('.m-recommendation').innerText(),/Growth Diagnostic/);assert.match(await page.locator('.m-recommendation').innerText(),/Rule-based/);
 await page.getByRole('button',{name:'Build an app',exact:true}).click();assert.equal(await page.locator('.m-recommendation a').first().getAttribute('href'),'/covibecoder');
 await page.goto(origin+'/tools?stage=Grow');assert.equal(await page.locator('.m-tool-card').count(),13);await page.getByRole('searchbox').fill('lead');assert.ok(await page.locator('.m-tool-card').count()>0);await page.getByRole('searchbox').fill('no-such-tool-xyz');assert.equal(await page.locator('.m-tool-card').count(),0);
 await page.goto(origin+'/academy');assert.equal(await page.locator('.m-curriculum details').count(),52);await page.goto(origin+'/covibecoder');assert.equal(await page.locator('.m-development-grid article').count(),13);
 await page.goto(origin);await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'marketing-menu');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.m-button').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 const sitemap=await(await page.request.get(origin+'/sitemap.xml')).text();assert.ok(!sitemap.includes('/app<'));assert.ok(!sitemap.includes('/login<'));for(const path of paths.filter(p=>!['/privacy','/terms','/ai-disclaimer'].includes(p)))assert.ok(sitemap.includes(path==='/'?'<loc>':path));for(const path of ['/privacy','/terms','/ai-disclaimer'])assert.ok(!sitemap.includes(path));assert.match(await(await page.request.get(origin+'/robots.txt')).text(),/Disallow: \//);
 const og=await page.request.get(origin+'/opengraph-image');assert.equal(og.status(),200);assert.match(og.headers()['content-type'],/image\/png/);
 // No responses were mocked above. This config fixture only allows checking
 // the unauthenticated customer route locally; no customer identity is created.
 await page.route('**/api/config',r=>r.fulfill({json:{url:'https://exghrllltefuhsgnagym.supabase.co',publishableKey:'sb_publishable_fixture',audienceDNA:false}}));
 for(const path of ['/app#qcue','/#qcue','/#assessment-11111111-1111-4111-8111-111111111111-1']){await page.goto(origin+path);await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();assert.match(page.url(),/\/login#/);assert.equal(await page.locator('.app-shell').count(),0);}
 let payload;await page.route('**/api/early-access',async route=>{if(route.request().method()==='POST'){payload=route.request().postDataJSON();await route.fulfill({status:201,json:{message:'Synthetic fixture: inquiry recorded; no account or membership created.'}});}else await route.continue();});
 await page.goto(origin+'/early-access?interest=covibecoder&goal=Build%20a%20useful%20app');await page.getByLabel('Email address',{exact:true}).fill('synthetic@example.invalid');await page.getByLabel('Business name',{exact:false}).fill('Synthetic');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Request early access',exact:true}).click();await page.getByRole('heading',{name:'We have your request.',exact:true}).waitFor();assert.equal(payload.consent,true);assert.equal(payload.interest,'covibecoder');assert.equal(payload.goal,'Build a useful app');assert.ok(payload.token);assert.equal(payload.website,'');assert.deepEqual(errors,[]);
 writeFileSync(`${out}/verification.json`,JSON.stringify({publicPages:'Actual local site; no mocked public page responses',checks,interactions:['Navigator registry recommendations','Filtered/searchable catalog','52 academy sprints','13 development tools','App/auth boundary and legacy hash redirects','Mobile keyboard navigation','Reduced motion','Robots/sitemap/Open Graph image','Interest form UI with synthetic POST response'],leadPersistence:'Verified separately against real SQL and hosted API; not established by the intercepted UI POST',pageErrors:errors},null,2));console.log(`PASS: ${checks.length} public page/theme/layout WCAG checks, routing, SEO and interaction checks. Auth config and final form POST are explicitly local fixtures.`);
}catch(error){writeFileSync(`${out}/failure.json`,JSON.stringify({checks,errors,error:String(error)},null,2));await page.screenshot({path:`${out}/failure.png`,fullPage:true});throw error;}finally{await browser.close();}
