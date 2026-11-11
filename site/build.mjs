import {readFileSync,writeFileSync} from 'node:fs';
const original=readFileSync('before.html','utf8');
const registry=JSON.parse(readFileSync('../catalog/agent-registry.json','utf8')).agents;
const live=JSON.parse(readFileSync('portal-before.json','utf8'));
const tools=registry.filter(t=>t.position>=1&&t.position<=52).sort((a,b)=>a.position-b.position);
if(tools.length!==52||tools.some(t=>!live.items.some(p=>p.secondaryId===t.id))) throw Error('Catalog mismatch');
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const link=(id,text)=>'<a href="#'+id+'">'+esc(text)+'</a>';
const details=(q,a)=>'<details><summary>'+esc(q)+'</summary><p>'+a+'</p></details>';
const section=(id,title,body)=>'<section class="ls-resource" id="'+id+'" aria-labelledby="'+id+'-heading"><h2 id="'+id+'-heading">'+esc(title)+'</h2>'+body+'</section>';
const card=(title,text)=>'<article class="card"><h3>'+esc(title)+'</h3><p>'+text+'</p></article>';
const checklist=(key,labels)=>'<fieldset data-local-checklist="'+key+'"><legend>Your checklist</legend>'+labels.map((x,i)=>'<label><input type="checkbox" data-step="'+i+'"> '+esc(x)+'</label>').join('')+'<p role="status"></p></fieldset>';
const stages=[
 ['Launch','Validate an idea and prepare an offer you can test.'],
 ['Grow','Find a repeatable way to reach customers and improve conversion.'],
 ['Monetize','Choose a revenue opportunity and check its unit economics.'],
 ['Scale','Document repeatable work and decide what to automate or delegate.']
];
const guide=section('start-guide','Getting Started','<p>Choose a business goal, use one tool to produce a deliverable, and decide how to measure the result.</p><div class="grid">'+stages.map(([s,d])=>card(s,esc(d)+' '+link('tools','Find '+s+' tools').replace('href=', 'data-category="'+s+'" href='))).join('')+'</div><p>Bring a short description of your business, audience, goal, and constraints. Keep a copy of useful outputs in your own project files. The checklist below is saved in this browser, when storage is available.</p>'+checklist('onboarding',['Choose one business goal','Run Business Navigator','Open a recommended tool','Complete a first deliverable','Record one success measure'])+'<div class="actions"><a class="cta primary" href="#navigator">Start Assessment</a><a class="cta" href="#tools">Explore Tools</a><a class="cta" href="#roadmap">View the Roadmap</a></div>');
const academy=section('academy','Academy & Implementation Sprints','<p>Start with the first sprint or jump to the business stage that fits your goal.</p><article class="card"><h3>Sample sprint: Validate one business idea</h3><p>Allow 45 minutes for the assessment and a week to run your test. Start with one audience and a problem you can describe in one sentence.</p><ol><li>Write down the problem, who experiences it, and how they solve it today.</li><li>Ask Idea Validator to identify the riskiest assumption and propose a low-cost experiment.</li><li>Choose a measurable signal and decide what result would justify continuing.</li><li>Collect evidence and note whether to continue, revise, or stop.</li></ol><p><strong>Deliverable:</strong> A one-page validation brief with an experiment, budget, success threshold, and review date.</p><p><a class="cta primary" href="'+esc(tools[0].url)+'" target="_blank" rel="noopener">Open Idea Validator (new tab)</a></p></article>');
const roadmap=section('roadmap','52-Week Implementation Roadmap','<p>Four stages, 13 weeks each. Open a week to find the tool and its assignment. Progress stays in this browser when storage is available.</p>'+stages.map(([stage,description])=>'<details class="roadmap-stage"><summary>'+stage+' · 13 weeks</summary><p>'+esc(description)+'</p>'+tools.filter(t=>t.category===stage).map(t=>'<details class="roadmap-week"><summary>Week '+t.position+' · '+esc(t.name)+'</summary><p>'+esc(t.description)+'</p><p><strong>Assignment:</strong> Choose one live business problem that matches this tool. Supply the goal, constraints, and available evidence. Turn the output into a one-page plan with a named next step, one success measure, and a review date.</p><p><strong>Review:</strong> Which assumption needs evidence before you act?</p><p>'+link('tools','Find '+t.name+' in the directory').replace('href=', 'data-tool-search="'+esc(t.name)+'" href=')+'</p>'+checklist('week-'+t.position,['Save the deliverable in your own files','Record the outcome and next action'])+'</details>').join('')+'</details>').join(''));
const faqs=[
 ['What is LaunchStudio?','LaunchStudio helps you turn a business goal into a practical plan using tools for Launch, Grow, Monetize and Scale.'],
 ['How do I choose a tool?',link('navigator','Business Navigator')+' suggests tools based on your goal. The directory also lets you search by name and category.'],
 ['Can I save and revisit projects?','Keep a copy of important deliverables in your own project files. The roadmap checklist saves in this browser when local storage is available.'],
 ['What comes with my plan?','Use the portal’s native Pricing control to see current plans and terms for your account. Some tools may ask you to upgrade.'],
 ['Can I cancel or get a refund?','Check the plan terms shown in the native Pricing or account controls. For a billing question, use your purchase confirmation to find the seller’s support details.'],
 ['How should I use AI output?','Verify facts, assumptions, and recommendations before acting. Use qualified professional advice for consequential decisions.'],
 ['Can I use the tools without a technical background?','Yes. Start with a plain-language goal, then use the first sprint to turn the response into a practical deliverable.'],
 ['Do the tools share my business profile?','The public portal does not yet offer a shared project profile across these tools. Carry relevant context forward yourself and avoid including sensitive data.'],
];
const faq=section('faq','FAQ','<label for="faq-search">Search answers</label><input type="search" id="faq-search" placeholder="Try plans or projects"><p id="faq-status" role="status"></p><div id="faq-entries">'+faqs.map(x=>details(...x)).join('')+'</div>');
const help=section('help','Help Center','<div class="grid">'+card('Account setup','Use Log in or Sign up in the portal header. If a tool opens an upgrade screen, check the account you signed in with.')+card('Find your next tool',link('navigator','Run Business Navigator')+' or '+link('tools','search the tool directory')+'.')+card('Using AI tools','Start with your objective, add constraints, and ask for a deliverable you can review. Keep a copy of the output you intend to use.')+card('Billing and access','Use the native Pricing control or account menu to check the plan shown for your account.')+card('Troubleshooting','If a page fails, try reopening it from the native menu. Keep the tool name, date, and a redacted error message for support.')+card('Progress and projects',link('roadmap','Use the roadmap')+' for browser-local progress. Save business deliverables in your own project files.')+'</div><p>'+link('faq','Search frequently asked questions')+'</p>');
const templates=[
 ['Idea validation brief','Audience\nProblem\nRiskiest assumption\nTest\nBudget\nSuccess threshold\nReview date'],
 ['Market research worksheet','Customer segment\nCompetitors\nEvidence source\nFinding\nConfidence\nNext question'],
 ['Customer acquisition plan','Audience\nChannel\nOffer\nBudget\nConversion metric\nExperiment\nReview date'],
 ['Revenue optimization worksheet','Revenue stream\nCurrent price\nVariable cost\nMargin\nTest\nSuccess threshold'],
 ['SOP template','Purpose\nOwner\nTrigger\nInputs\nSteps\nExceptions\nQuality check\nRevision date'],
 ['90-day growth plan','Objective\nBaseline\n30-day milestone\n60-day milestone\n90-day milestone\nOwner\nReview cadence']
];
const playbooks=section('playbooks','Templates & Playbooks','<p>Download a plain-text worksheet and fill it in as you work.</p><div class="grid">'+templates.map(([name,fields])=>card(name,'<a download="'+esc(name.toLowerCase().replaceAll(' ','-'))+'.txt" href="data:text/plain;charset=utf-8,'+encodeURIComponent(name+'\n\n'+fields.split('\n').map(f=>f+': ').join('\n\n'))+'">Download '+esc(name)+'</a>')).join('')+'</div>');
const company=section('about','About LaunchStudio','<p>LaunchStudio helps business builders turn a goal into a deliverable they can use. Start with the stage that fits, use a focused tool, and measure the result before taking the next step.</p><h3 id="methodology">Our Methodology</h3><p>Assess → Plan → Implement → Measure → Optimize → Scale.</p><p>For example, validate a service offer with a one-page brief, test it with a small audience, and use the results to decide whether to adjust pricing or expand.</p><h3 id="contact">Contact & Support</h3><p>For help using the portal, start with the '+link('help','Help Center')+'. For a purchase issue, check your confirmation for the seller’s support details.</p><h3 id="partnerships">Partnerships</h3><p>Potential collaboration areas include referrals, implementation, agencies, technology, community, education, and enterprise. Applications and commercial terms are pending.</p><h3 id="success-stories">Success Stories</h3><p>Published case studies will appear here after results and permission to publish have been verified. See the '+link('methodology','methodology')+' for a practical example of the process.</p>');
const commercial=section('pricing-plans','Pricing & Plans','<p>Use <strong>Pricing</strong> in the portal header for the current plans, access terms, and usage allowances available to your account.</p><div class="grid">'+card('Launch and Build','Explore the Launch and CoVibeCoder entries. Check your account allowance before starting a session.')+card('Grow, Monetize and Scale','Browse these stages in the directory. Restricted tools may prompt you to upgrade in Pickaxe.')+'</div><h3 id="managed-services">Managed Services</h3><p>Self-service tools help you plan and prepare deliverables. Guided implementation, automation, and enterprise engagements are separate service options. Availability and terms are pending.</p><h3 id="growth-challenge">52-Week Growth Challenge</h3><p>Start at the stage that fits your business and use the '+link('roadmap','roadmap')+' to choose assignments and milestones.</p>');
const disclaimer=section('ai-use','Using AI responsibly','<p>AI-generated output can contain errors. Review results before acting on them. Verify claims, measurements, and recommendations, and consult qualified professionals for consequential decisions. External actions require appropriate authorization.</p>');
const groups=[
 ['Platform',[['Launch','tools','Launch'],['Grow','tools','Grow'],['Monetize','tools','Monetize'],['Scale','tools','Scale'],['All Tools','tools','All'],['Business Navigator','navigator']]],
 ['Resources',[['Getting Started','start-guide'],['Academy','academy'],['52-Week Roadmap','roadmap'],['Playbooks','playbooks'],['Help Center','help'],['FAQ','faq']]],
 ['Company',[['About','about'],['Our Methodology','methodology'],['Contact','contact'],['Partnerships','partnerships'],['Success Stories','success-stories']]],
 ['Programs & Services',[['Pricing','pricing-plans'],['Implementation Sprints','academy'],['Growth Challenge','growth-challenge'],['Managed Services','managed-services']]],
 ['Legal',[['AI output guidance','ai-use'],['Privacy Policy',null],['Terms of Service',null]]]
];
const accelerator='<div class="accelerator-intro"><p class="eyebrow">Launch · Grow · Monetize · Scale</p><p>Start with a goal, turn it into a concrete deliverable, and measure the result before your next sprint.</p><div class="actions"><a class="cta primary" href="#navigator">Find your first sprint</a><a class="cta" href="#start-guide">See how it works</a></div></div>';
const iconNames={'Business Navigator':'business-navigator','Getting Started':'getting-started','Pricing':'proposed-pricing','Help Center':'support','About':'about','Contact':'contact','Partnerships':'partnerships','AI output guidance':'ai-disclaimer','Privacy Policy':'privacy-policy','Terms of Service':'terms-of-service'};
const oldFooter=original.match(/<footer>([\s\S]*?)<\/footer>/)?.[1]??'';
const brand=oldFooter.match(/<svg[^>]*data-vector="logo-horizontal"[\s\S]*?<\/svg>/)?.[0];
if(!brand) throw Error('Logo not found');
const icon=(name)=>{const slug=iconNames[name];return slug?(oldFooter.match(new RegExp('<svg[^>]*data-vector="icon-'+slug+'"[\\s\\S]*?<\\/svg>'))?.[0]??''):'';};
const footer='<footer>'+brand+'<div class="grid">'+groups.map(([name,items])=>'<nav aria-label="'+esc(name)+'"><h3>'+esc(name)+'</h3>'+items.map(([label,id,cat])=>!id?'<p>'+icon(label)+esc(label)+' · under review</p>':'<p>'+icon(label)+'<a href="#'+id+'"'+(cat?' data-category="'+esc(cat)+'"':'')+'>'+esc(label)+'</a></p>').join('')+'</nav>').join('')+'</div></footer>';
const canonical='https://studio.pickaxe.co/STUDIOSAG26QENFZXNY0957VNT/launch';
const title='LaunchStudio | Business Launch & Growth Accelerator';
const description='Turn a business goal into a measurable implementation sprint with LaunchStudio’s Business Navigator, 52-tool roadmap, and practical playbooks.';
const metadata='<title>'+title+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+canonical+'"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+canonical+'"><meta property="og:type" content="website">';
let output=original.replace(/<title>[\s\S]*?<\/title>/,()=>metadata).replace(/<footer>[\s\S]*?<\/footer>/,()=>footer);
output=output.replace(/<section id="getting-started">[\s\S]*?<\/section>/,'').replace(/<section id="proposed-pricing">[\s\S]*?<\/section>/,'');
output=output.replace('What do you want to do today?</h1>','Business Launch &amp; Growth Accelerator</h1>'+accelerator);
output=output.replace('</main>',()=>guide+academy+roadmap+playbooks+help+faq+company+commercial+disclaimer+'</main>');
const css='#launchstudio .ls-resource details{border:1px solid var(--border);border-radius:10px;padding:12px;margin:10px 0}#launchstudio .ls-resource summary{cursor:pointer;min-height:26px;font-weight:650}#launchstudio .ls-resource fieldset{border:1px solid var(--border);border-radius:10px;margin:16px 0;padding:12px}#launchstudio .ls-resource fieldset label{display:flex;align-items:flex-start;gap:10px;min-height:28px;margin:8px 0}#launchstudio .ls-resource input[type=checkbox]{width:18px;height:18px;flex:none;accent-color:var(--lime)}#launchstudio .ls-resource input[type=search]{max-width:38rem}#launchstudio .accelerator-intro .actions{margin:14px 0 22px}';
const js=`<script>
for (const list of document.querySelectorAll('[data-local-checklist]')) {
  const key = 'launchstudio-checklist-v1:' + list.dataset.localChecklist;
  const fields = [...list.querySelectorAll('input')];
  const status = list.querySelector('[role=status]');
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  fields.forEach(field => { field.checked = Array.isArray(stored) && stored.includes(field.dataset.step); });
  const update = save => {
    const done = fields.filter(field => field.checked).map(field => field.dataset.step);
    let message = done.length + ' of ' + fields.length + ' complete';
    if (save) try { localStorage.setItem(key, JSON.stringify(done)); } catch { message += ' · Could not save in this browser'; }
    status.textContent = message;
  };
  list.addEventListener('change', () => update(true));
  update(false);
}
const faqSearch = document.getElementById('faq-search');
faqSearch.addEventListener('input', () => {
  let count = 0;
  for (const entry of document.querySelectorAll('#faq-entries details')) {
    entry.hidden = !entry.textContent.toLowerCase().includes(faqSearch.value.toLowerCase().trim());
    if (!entry.hidden) count++;
  }
  document.getElementById('faq-status').textContent = count ? count + ' answers found' : 'No matching answers';
});
for (const shortcut of document.querySelectorAll('[data-tool-search]')) {
  shortcut.addEventListener('click', () => {
    document.querySelector('[data-filter="All"]').click();
    const search = document.getElementById('search');
    search.value = shortcut.dataset.toolSearch;
    search.dispatchEvent(new Event('input'));
  });
}
</script>`;
output=output.replace('</style>',()=>css+'</style>').replace('</body>',()=>js+'</body>');
const ids=[...output.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
if(new Set(ids).size!==ids.length) throw Error('Duplicate IDs');
for(const [,id] of output.matchAll(/href="#([\w-]+)"/g)) if(!ids.includes(id))throw Error('Broken anchor '+id);
if(!output.includes('Business Launch &amp; Growth Accelerator')||(output.match(/class="roadmap-week"/g)||[]).length!==52)throw Error('Missing scope');
writeFileSync('public-build.html',output);
console.log('Built public hub, 52 roadmap entries, 6 downloads and validated internal anchors.');
