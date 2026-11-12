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
state={'entitled':True,'fail_save':False,'fail_history':False,'arm_history_failure':False}
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
   if state['arm_history_failure']:
    state['arm_history_failure']=False
    state['fail_history']=True
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
  if name=='tool_deliverables' and state['fail_history'] and 'content' in query.get('select',[''])[0] and query.get('tool_position')==['eq.53']:
   state['fail_history']=False
   return route.fulfill(status=403,content_type='application/json',headers={'access-control-allow-origin':'*'},body=json.dumps({'message':'Synthetic history outage after committed save'}))
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

# Independent lifecycle transport fixtures. Actual authorization is tested in SQL.
expect.set_options(timeout=15000)
base_mock=mock
advanced=[]
access={'role':'approver','enabled':True,'fail_once':False}
def lifecycle_mock(route):
 if route.request.method=='POST' and route.request.url.endswith('/rpc/advanced_workspace'):
  payload=route.request.post_data_json
  if not access['enabled']:return route.fulfill(status=403,content_type='application/json',body=json.dumps({'message':'Program unavailable'}))
  project_id=payload['target'];program=payload['program'];op=payload['operation']
  selected=[x for x in advanced if x['project_id']==project_id and x['program']==program]
  if op=='save':
   row=next((x for x in selected if x['request_id']==payload['request']),None)
   if not row:
    row={'id':str(uuid.uuid4()),'project_id':project_id,'program':program,'version':len(selected)+1,'content':payload['draft'],'request_id':payload['request'],'approved_at':None,'expires_at':'2027-05-01T00:00:00Z'};advanced.append(row)
   if access['fail_once']:
    access['fail_once']=False
    return route.fulfill(status=503,content_type='application/json',body=json.dumps({'message':'Ambiguous response'}))
  if op=='approve':
   row=next(x for x in selected if x['id']==payload['version_id']);row['approved_at']=now
  selected=[x for x in advanced if x['project_id']==project_id and x['program']==program]
  current=next((x for x in selected if x['id']==payload.get('version_id')),None) if payload.get('version_id') else (selected[-1] if selected else None)
  return route.fulfill(content_type='application/json',body=json.dumps({'access':access['role'],'retentionDays':180,'current':current,'versions':list(reversed(selected))}))
 return base_mock(route)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':900},accept_downloads=True)
 accessibility=[]
 def audit(selector):
  for width in [1280,390]:
   for theme in ['dark','light']:
    page.set_viewport_size({'width':width,'height':900})
    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    page.add_script_tag(path=str(root/'apps/staging-portal/node_modules/axe-core/axe.min.js'))
    result=page.evaluate('async selector=>(await axe.run({include:[selector]},{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations',selector)
    assert not result,[(x['id'],[n['target'] for n in x['nodes']]) for x in result]
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    accessibility.append({'scope':selector,'width':width,'theme':theme,'violations':0})
  page.set_viewport_size({'width':1280,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://exghrllltefuhsgnagym.supabase.co/**',lifecycle_mock)
 page.route('**/api/config',lambda r:r.fulfill(content_type='application/json',body=json.dumps({'url':'https://exghrllltefuhsgnagym.supabase.co','publishableKey':'sb_publishable_fixture','audienceDNA':False})))
 page.add_init_script('localStorage.setItem("sb-exghrllltefuhsgnagym-auth-token",'+json.dumps(json.dumps(session))+');')
 page.goto('http://localhost:3000/app#transform')
 suite=page.locator('#transform')
 expect(suite.get_by_text('Access: approver',exact=False)).to_be_visible()
 suite.get_by_text('Financial health and cash flow',exact=True).click()
 suite.get_by_label('Financial health and cash flow: Customer-entered information',exact=True).fill('Synthetic financial observations')
 suite.get_by_label('Financial health and cash flow: Evidence reference and period',exact=True).fill('Synthetic reference 2026-Q3')
 suite.get_by_label('I reviewed the evidence reference',exact=False).first.check()
 suite.get_by_role('button',name='Add improvement initiative',exact=True).click()
 suite.get_by_label('Initiative 1: Action',exact=True).fill('Document owner dependency')
 suite.get_by_label('Initiative 1: Responsible owner',exact=True).fill('Synthetic owner')
 suite.get_by_role('button',name='Save planning version',exact=True).click()
 expect(suite.get_by_role('button',name='Open version 1',exact=True)).to_be_visible()
 suite.get_by_role('button',name='Approve selected planning version',exact=True).click()
 expect(suite.get_by_text('Approved review',exact=False)).to_be_visible()
 suite.get_by_label('Outstanding decisions and advisor checkpoints',exact=True).fill('Revised synthetic decision')
 access['fail_once']=True
 suite.get_by_role('button',name='Save planning version',exact=True).click()
 expect(suite.get_by_role('alert')).to_contain_text('Save could not be confirmed')
 suite.get_by_role('button',name='Retry same save request',exact=True).click()
 expect(suite.get_by_role('button',name='Open version 2',exact=True)).to_be_visible()
 assert len(advanced)==2
 page.reload()
 expect(suite.get_by_label('Outstanding decisions and advisor checkpoints',exact=True)).to_have_value('Revised synthetic decision')
 audit('#transform')
 page.screenshot(path=str(evidence/'lifecycle-transform-desktop.png'),full_page=True)
 page.get_by_role('button',name='Enterprise Value · ExitReady',exact=True).click()
 suite=page.locator('#enterprise-value')
 expect(suite.get_by_label('Owner goals and time horizon',exact=True)).to_be_visible()
 suite.get_by_label('Owner goals and time horizon',exact=True).fill('Synthetic succession horizon')
 suite.get_by_label('Revenue and profitability history',exact=False).fill('Private synthetic amount 12345')
 suite.get_by_text('Customer-assumption valuation scenario',exact=True).click()
 for label,value in [('Currency','USD'),('Earnings basis, source period and assumptions','Synthetic annual earnings only'),('Customer-entered annual earnings','100'),('Customer-entered low multiple','2'),('Customer-entered high multiple','4'),('Debt assumption','10'),('Cash assumption','20')]:suite.get_by_label(label,exact=True).fill(value)
 expect(suite.get_by_text('Illustrative enterprise range:',exact=False)).to_contain_text('200–400 USD')
 suite.get_by_role('button',name='Save planning version',exact=True).click()
 expect(suite.get_by_role('button',name='Open version 1',exact=True)).to_be_visible()
 with page.expect_download() as download:suite.get_by_role('button',name='Export saved confidential JSON',exact=True).click()
 assert download.value.suggested_filename=='exit-review-v1.json'
 # Private content is never stored in browser storage.
 stored=page.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})')
 assert '12345' not in stored and 'Synthetic financial observations' not in stored
 page.get_by_role('button',name='Second project Active',exact=False).click()
 expect(suite.get_by_label('Owner goals and time horizon',exact=True)).to_have_value('')
 assert suite.get_by_role('button',name='Open version 1',exact=True).count()==0
 page.get_by_role('button',name='Software pilot Active',exact=False).click()
 expect(suite.get_by_label('Owner goals and time horizon',exact=True)).to_have_value('Synthetic succession horizon')
 access['role']='reader';suite.get_by_role('button',name='Reload program access',exact=True).click()
 expect(suite.get_by_text('Access: reader',exact=False)).to_be_visible()
 assert suite.get_by_role('button',name='Save planning version',exact=True).count()==0
 assert suite.get_by_role('button',name='Approve selected planning version',exact=True).count()==0
 page.set_viewport_size({'width':390,'height':844})
 suite.scroll_into_view_if_needed()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(evidence/'lifecycle-exit-mobile.png'),full_page=True)
 page.set_viewport_size({'width':1280,'height':900})
 page.screenshot(path=str(evidence/'lifecycle-exit-desktop.png'),full_page=True)
 audit('#enterprise-value')
 access['enabled']=False;suite.get_by_role('button',name='Reload program access',exact=True).click()
 expect(suite.get_by_role('alert')).to_contain_text('Program access could not be verified')
 assert suite.get_by_label('Revenue and profitability history',exact=False).count()==0
 assert 'Private synthetic amount 12345' not in page.locator('body').inner_text()
 page.get_by_role('button',name='Return to original business program',exact=True).click()
 expect(page.get_by_role('heading',name='Your tool workspace & growth sprints',exact=True)).to_be_visible()
 page.get_by_role('button',name='Sign out',exact=True).first.click()
 expect(page.get_by_role('button',name='Sign in',exact=True)).to_be_visible()
 assert not errors,errors
 report={'scope':'Local Chromium; intercepted Supabase; synthetic session. Not hosted customer acceptance.','passed':['Transform diagnostic fields and evidence attestation','Manual initiatives','Saved versions and planning approvals','Ambiguous save retry no duplicate','Refresh persistence','Exit progressive intake','Explicit assumption scenario arithmetic','Confidential JSON export','Private content absent from browser storage','Project switching','Reader cannot save/approve','Revoked access clears private fields','390px no overflow','Original program return','Signout'],'versions':len(advanced),'pageErrors':errors,'accessibility':accessibility}
 (evidence/'lifecycle-browser.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));browser.close()
