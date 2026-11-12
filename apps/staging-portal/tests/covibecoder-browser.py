"""Local UI regression with a mocked Supabase transport. NOT hosted acceptance.
Run the built staging portal on localhost:3000, then python tests/covibecoder-browser.py.
All Supabase calls are intercepted. SQL/RLS behavior is tested by staging/covibecoder.test.mjs.
"""
import base64, json, time, uuid
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parents[3]
evidence=root/'work/evidence'
evidence.mkdir(parents=True,exist_ok=True)
specs=json.loads((root/'catalog/tool-specs/covibecoder.json').read_text())
actor='10000000-0000-4000-8000-000000000001'
business='20000000-0000-4000-8000-000000000001'
project='30000000-0000-4000-8000-000000000001'
second='30000000-0000-4000-8000-000000000002'
now='2026-11-12T03:00:00Z'
rows=[]
contexts={}
state={'entitled':True,'fail_save':False}
projects=[{'id':project,'business_id':business,'name':'Software pilot','goal':'Build a useful app','status':'active'},
 {'id':second,'business_id':business,'name':'Second project','goal':'Keep separate records','status':'active'}]

def mock(route):
 request=route.request
 url=urlparse(request.url)
 query=parse_qs(url.query)
 name=url.path.split('/')[-1]
 payload=request.post_data_json if request.method=='POST' else None
 result=[]
 status=200
 if request.method=='OPTIONS':
  return route.fulfill(status=200,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'})
 if '/auth/' in url.path:
  result={} if name=='logout' else {'id':actor,'aud':'authenticated','role':'authenticated','email':'fixture@example.invalid'}
 elif '/rpc/' in url.path:
  if name=='save_tool_deliverable':
   existing=next((r for r in rows if r['project_id']==payload['target'] and r['tool_position']==payload['tool'] and r['request_id']==payload['request']),None)
   if not existing:
    existing={'id':str(uuid.uuid4()),'project_id':payload['target'],'tool_position':payload['tool'],'request_id':payload['request'],
     'version':1+max([r['version'] for r in rows if r['tool_position']==payload['tool'] and r['project_id']==payload['target']] or [0]),
     'content':payload['draft'],'sources':[],'approved_at':None,'created_at':now}
    rows.append(existing)
   if state['fail_save']:
    state['fail_save']=False
    return route.abort('failed')
   result=existing['id']
  elif name=='approve_tool_deliverable':
   next(r for r in rows if r['id']==payload['target'])['approved_at']=now
   result=None
  elif name=='covibecoder_progress':
   relevant=[r for r in rows if r['project_id']==payload['target']]
   result=[]
   for pos in set(r['tool_position'] for r in relevant):
    latest=max([r for r in relevant if r['tool_position']==pos],key=lambda r:r['version'])
    result.append({k:latest[k] for k in ['tool_position','version','approved_at','created_at']}|{'has_approved':any(r['approved_at'] for r in relevant if r['tool_position']==pos)})
  elif name=='import_covibecoder_context':
   contexts[payload['target']]={'source_project_id':payload['source'],'imported_at':now,
    'snapshot':{'sourceName':'Approved business plan','sourceProjectId':payload['source'],'sourceGoal':'Build useful software',
      'assessments':[],'deliverables':[{'deliverableId':'approved-plan','projectId':payload['source'],'toolPosition':1,'version':1,'content':{'summary':'Approved product specification'}}]}}
   result=None
  else: raise AssertionError('Unexpected RPC '+name)
 else:
  result={'businesses':[{'id':business,'owner_id':actor,'name':'Fixture business','profile':{'audience':'Local testers'}}],
   'business_projects':projects,'business_memberships':[], 'workflow_progress':[], 'workflow_requests':[],
   'assessment_versions':[], 'agent_runs':[], 'tool_deliverables':rows,
   'business_suite_entitlements':[{'enabled':state['entitled'],'expires_at':None,'business_id':business,'suite':'covibecoder'}],
   'covibecoder_contexts':[dict(v,project_id=k) for k,v in contexts.items()]}.get(name,[])
  result=list(result)
  for field,values in query.items():
   if field in ['select','order','limit','or']:continue
   for value in values:
    op,_,v=value.partition('.')
    if op=='eq':result=[r for r in result if str(r.get(field))==v]
    elif op in ['lt','gte','lte']:
     result=[r for r in result if r.get(field) is not None and {'lt':lambda a,b:a<b,'gte':lambda a,b:a>=b,'lte':lambda a,b:a<=b}[op](float(r[field]),float(v))]
    elif value=='is.null':result=[r for r in result if r.get(field) is None]
    elif value=='not.is.null':result=[r for r in result if r.get(field) is not None]
  if name=='tool_deliverables':result.sort(key=lambda r:r['version'],reverse=True)
  if 'limit' in query:result=result[:int(query['limit'][0])]
  if 'application/vnd.pgrst.object+json' in request.headers.get('accept',''):result=result[0] if result else None
 route.fulfill(status=status,content_type='application/json',headers={'access-control-allow-origin':'*'},body=json.dumps(result))

def token_part(data):return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')
token=token_part({'alg':'HS256','typ':'JWT'})+'.'+token_part({'sub':actor,'exp':int(time.time())+3600,'iat':int(time.time()),'aud':'authenticated'})+'.fixture'
session={'access_token':token,'refresh_token':'fixture','token_type':'bearer','expires_at':int(time.time())+3600,'expires_in':3600,
 'user':{'id':actor,'aud':'authenticated','role':'authenticated','email':'fixture@example.invalid'}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':900})
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('https://exghrllltefuhsgnagym.supabase.co/**',mock)
 page.route('**/api/config',lambda route:route.fulfill(content_type='application/json',body=json.dumps({'url':'https://exghrllltefuhsgnagym.supabase.co','publishableKey':'sb_publishable_fixture','audienceDNA':False})))
 page.add_init_script('localStorage.setItem("sb-exghrllltefuhsgnagym-auth-token",'+json.dumps(json.dumps(session))+');')
 page.goto('http://localhost:3000/#qcue')
 page.get_by_role('button',name='CoVibeCoder · 13 tools',exact=True).click()
 suite=page.locator('#covibecoder')
 expect(suite.get_by_label('Development tool')).to_be_visible()
 suite.get_by_role('button',name='Import approved context',exact=True).click()
 expect(suite.get_by_text('Approved business plan ·',exact=False)).to_be_visible()
 for tool in specs:
  print('Testing tool',tool['position'],flush=True)
  try:
   suite.get_by_label('Development tool',exact=True).select_option(str(tool['position']),timeout=8000)
  except Exception:
   print(page.locator('body').inner_text(),errors,flush=True)
   raise
  for field in tool['fields']:suite.get_by_label(field['label'],exact=True).fill('Synthetic UI fixture: '+field['label'])
  for starter in tool['starters']:expect(suite.get_by_role('button',name=starter,exact=True)).to_be_visible()
  suite.get_by_role('button',name='Prepare planning outline',exact=True).click()
  suite.get_by_role('button',name='Save draft version',exact=True).click()
  expect(suite.get_by_role('heading',name='Version 1 · Draft',exact=True)).to_be_visible()
 suite.get_by_label('Development tool',exact=True).select_option('53')
 suite.get_by_role('button',name='Approve version 1',exact=True).click()
 expect(suite.get_by_role('heading',name='Version 1 · Approved',exact=True)).to_be_visible()
 suite.get_by_role('button',name='Edit as new version',exact=True).click()
 suite.get_by_label('Executive summary',exact=True).fill('Revised product specification')
 state['fail_save']=True
 suite.get_by_role('button',name='Save draft version',exact=True).click()
 expect(suite.get_by_role('alert')).to_contain_text('save could not be confirmed')
 page.reload()
 page.get_by_role('button',name='CoVibeCoder · 13 tools',exact=True).click()
 expect(suite.get_by_role('heading',name='Version 2 · Draft',exact=True)).to_be_visible()
 assert len([r for r in rows if r['tool_position']==53])==2
 expect(suite.get_by_text('revision pending · v2',exact=True)).to_be_visible()
 with page.expect_download() as download:
  suite.get_by_role('button',name='Export JSON',exact=True).first.click()
 assert download.value.suggested_filename.endswith('-v2.json')
 page.get_by_role('button',name='Second project Active',exact=False).click()
 expect(suite.get_by_text('No tool drafts saved for this project.',exact=True)).to_be_visible()
 page.get_by_role('button',name='Software pilot Active',exact=False).click()
 expect(suite.get_by_role('heading',name='Version 2 · Draft',exact=True)).to_be_visible()
 suite.get_by_label('Development tool',exact=True).select_option('59')
 expect(suite.get_by_role('heading',name='Version 1 · Draft',exact=True)).to_be_visible()
 with page.expect_download() as sql_download:
  suite.get_by_role('button',name='Export Database schema draft (.sql)',exact=True).click()
 assert sql_download.value.suggested_filename.endswith('.sql')
 assert Path(sql_download.value.path()).read_text().startswith('-- Database schema draft')
 with page.expect_download() as markdown_download:
  suite.get_by_role('button',name='Export Markdown',exact=True).click()
 assert 'No external build' in Path(markdown_download.value.path()).read_text()
 suite.get_by_label('Development tool',exact=True).select_option('53')
 expect(suite.get_by_role('heading',name='Version 2 · Draft',exact=True)).to_be_visible()
 page.context.grant_permissions(['clipboard-read','clipboard-write'])
 suite.get_by_role('button',name='Copy build prompt with context',exact=True).click()
 assert 'Approved product specification' in page.evaluate('navigator.clipboard.readText()')
 page.add_script_tag(path=str(root/'apps/staging-portal/node_modules/axe-core/axe.min.js'))
 accessibility=[]
 for theme in ['dark','light']:
  page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
  page.wait_for_timeout(300)
  result=page.evaluate('async()=>await axe.run(document.querySelector("#covibecoder"),{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})')
  accessibility.append({'theme':theme,'violations':[{'id':v['id'],'impact':v['impact'],'nodes':[{'target':n['target'],'summary':n.get('failureSummary')} for n in v['nodes']]} for v in result['violations']]})
 assert all(not r['violations'] for r in accessibility),accessibility
 page.set_viewport_size({'width':390,'height':844})
 suite.scroll_into_view_if_needed()
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow on mobile'
 unnamed=page.evaluate('Array.from(document.querySelectorAll("input,textarea,select")).filter(e=>e.offsetParent!==null&&!e.labels?.length&&!e.getAttribute("aria-label")).length')
 assert unnamed==0,'Unlabeled form controls'
 suite.get_by_label('Development tool',exact=True).focus()
 page.keyboard.press('Tab')
 assert page.evaluate('document.activeElement.tagName') in ['INPUT','TEXTAREA','BUTTON','SELECT','SUMMARY','A']
 page.screenshot(path=str(evidence/'covibecoder-mobile.png'),full_page=True)
 page.set_viewport_size({'width':1280,'height':900})
 page.screenshot(path=str(evidence/'covibecoder-desktop.png'),full_page=True)
 state['entitled']=False
 suite.get_by_role('button',name='Reload access and progress',exact=True).click()
 expect(suite.get_by_text('CoVibeCoder membership is not enabled',exact=False)).to_be_visible()
 assert suite.get_by_role('button',name='Save draft version',exact=True).count()==0
 page.get_by_role('button',name='Business program · 52 tools',exact=True).click()
 expect(page.get_by_role('heading',name='Your tool workspace & growth sprints',exact=True)).to_be_visible()
 page.evaluate('sessionStorage.setItem("launchstudio:covibecoder:fixture","test")')
 page.get_by_role('button',name='Sign out',exact=True).first.click()
 expect(page.get_by_role('button',name='Sign in',exact=True)).to_be_visible()
 assert page.evaluate('Object.keys(sessionStorage).every(key=>!key.startsWith("launchstudio:covibecoder:"))')
 assert not errors,errors
 report={'scope':'Local UI regression; mocked Supabase and synthetic session; not hosted acceptance','passed':['All 13 tailored forms and three starters','Approved context import display','Save and reopen 13 tool drafts','Revision, version approval, Q/CUE progress','Interrupted save followed by reload without duplicate','JSON, Markdown and SQL exports; context-aware prompt copied','Project switching','Entitlement denied UI while original 52 remain available','Sign-out removes recovery data','390px no horizontal overflow','Visible form controls have labels; keyboard focus moves'],'pageErrors':errors,'savedVersions':len(rows),'accessibility':accessibility}
 (evidence/'covibecoder-browser.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
 browser.close()
