import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createWorkflow, createSessionVerifier } from './workflow.mjs';
import { createRequestHandler } from './request-handler.mjs';
const a='10000000-0000-4000-8000-000000000001', b='10000000-0000-4000-8000-000000000002';
const directory = mkdtempSync(join(tmpdir(), 'launchstudio-acceptance-'));
let db = await PGlite.create(directory);
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const file of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  await db.query('insert into auth.users values ($1),($2)',[a,b]);
  const as = (actor, fn) => db.transaction(async tx=>{
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
    return fn(tx);
  });
  for (const actor of [a,b]) await as(actor,tx=>tx.query("insert into public.customer_profiles(user_id,display_name) values($1,'Synthetic tester')",[actor]));
  const {rows:[business]}=await as(a,tx=>tx.query("insert into public.businesses(owner_id,name,profile) values($1,'Bike repair',$2) returning id",[a,{offering:'mobile repairs', audience:'commuters', privateNotes:'do not send'}]));
  const {rows:[businessB]}=await as(b,tx=>tx.query("insert into public.businesses(owner_id,name) values($1,'Separate business') returning id",[b]));
  const {rows:[projectB]}=await as(b,tx=>tx.query("insert into public.business_projects(business_id,goal) values($1,'Independent goal') returning id",[businessB.id]));
  assert.equal((await as(b,tx=>tx.query('select name from public.business_projects where id=$1',[projectB.id]))).rows[0].name,'Untitled project');
  assert.equal((await as(b,tx=>tx.query('select id from public.business_projects where id=$1',[projectB.id]))).rows.length,1);
  assert.equal((await as(a,tx=>tx.query('select id from public.business_projects where id=$1',[projectB.id]))).rows.length,0);
  const {rows:[project]}=await as(a,tx=>tx.query("insert into public.business_projects(business_id,name,goal) values($1,'Bike repair pilot','Validate demand') returning id,name,goal",[business.id]));
  assert.deepEqual([project.name,project.goal],['Bike repair pilot','Validate demand']);
  const {rows:[editedProject]} = await as(a,tx=>tx.query(
    "update public.business_projects set name='Renamed pilot',goal='Validate pricing' where id=$1 returning id,business_id,name,goal",
    [project.id],
  ));
  assert.deepEqual(editedProject,{id:project.id,business_id:business.id,name:'Renamed pilot',goal:'Validate pricing'});
  assert.equal((await as(b,tx=>tx.query(
    "update public.business_projects set name='Unauthorized edit' where id=$1 returning id",[project.id],
  ))).rowCount,0);
  await assert.rejects(as(a,tx=>tx.query("insert into public.business_projects(business_id,name,goal) values($1,'   ','Validate demand')",[business.id])),{code:'23514'});
  assert.equal((await as(a,tx=>tx.query("update public.businesses set name='Mobile bike repair' where id=$1 returning id",[business.id]))).rows.length,1);
  assert.equal((await as(b,tx=>tx.query('select id from public.businesses where id=$1',[business.id]))).rows.length,0);
  assert.equal((await as(b,tx=>tx.query("update public.businesses set name='Changed' where id=$1 returning id",[business.id]))).rows.length,0);
  await assert.rejects(as(b,tx=>tx.query("insert into public.business_projects(business_id,name,goal) values($1,'Forged','Forged')",[business.id])),{code:'42501'});
  await assert.rejects(as(b,tx=>tx.query("insert into public.businesses(owner_id,name) values($1,'Forged')",[a])),{code:'42501'});
  for(const actor of [a,b]) await assert.rejects(as(actor,tx=>tx.query('delete from public.businesses where id=$1',[business.id])),{code:'42501'});
  const invoke=[];
  const asWorker = fn => db.transaction(async tx => {
    await tx.exec('set local role launchstudio_worker');
    return fn(tx);
  });
  const worker = { transaction: asWorker, query: (...args) => asWorker(tx => tx.query(...args)) };
  await assert.rejects(worker.query("update public.businesses set updated_at=now() where id=$1",[business.id]),{code:'42501'});
  await assert.rejects(worker.query("delete from public.businesses where id=$1",[business.id]),{code:'42501'});
  const workflow=createWorkflow({database:worker,verifySession:async t=>t==='A'?{id:a}:t==='B'?{id:b}:null,
    runAgent:async(id,input)=>{invoke.push({id,input});return id==='YL7LGN8AV2'?'Validated outcome with next steps.':'Market intelligence built from approved idea.';}});
  const run=(token,agent,requestId=crypto.randomUUID())=>workflow({token,projectId:project.id,agent,requestId});
  await assert.rejects(run(null,'idea-validator'),{status:401});
  await assert.rejects(run('B','idea-validator'),{status:404});
  await assert.rejects(run('A','market-intelligence'),{status:409});
  const handle = createRequestHandler(workflow);
  const api = (token, body) => handle(new Request('https://example.invalid/workflow', {
    method:'POST', headers:{'content-type':'application/json',authorization:'Bearer '+token},
    body:JSON.stringify(body),
  }));
  const payload={projectId:project.id,agent:'idea-validator',requestId:crypto.randomUUID()};
  assert.equal((await api('B',payload)).status,404);
  assert.equal((await api('B',{...payload,actorId:a})).status,400);
  assert.equal((await api('B',{...payload,token:'A'})).status,400);
  assert.equal((await api('invalid',payload)).status,401);
  const key=crypto.randomUUID(), idea=await run('A','idea-validator',key);
  assert.equal((await run('A','idea-validator',key)).runId,idea.runId);
  assert.equal(invoke.length,1);
  assert.equal(invoke[0].input.profile.privateNotes,undefined);
  await assert.rejects(as(b,tx=>tx.query('select public.approve_idea_assessment($1,1)',[idea.assessmentId])),{code:'42501'});
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'viewer')",[business.id,b]);
  await assert.rejects(as(b,tx=>tx.query('select public.approve_idea_assessment($1,1)',[idea.assessmentId])),{code:'42501'});
  const { rows: [pending] } = await as(a,tx=>tx.query(
    'select approval_status, approved_by from public.assessment_versions where assessment_id=$1 and version=1',[idea.assessmentId]
  ));
  assert.deepEqual(pending,{approval_status:'pending',approved_by:null});
  await db.query('delete from public.business_memberships where business_id=$1 and user_id=$2',[business.id,b]);
  await as(a,tx=>tx.query('select public.approve_idea_assessment($1,1)',[idea.assessmentId]));
  assert.equal((await as(a,tx=>tx.query('select next_agent from public.workflow_progress where project_id=$1',[project.id]))).rows[0].next_agent,'market-intelligence');
  const newer=await run('A','idea-validator');
  assert.equal(newer.version,2);
  const market=await run('A','market-intelligence');
  assert.equal(market.status,'succeeded');
  assert.equal(invoke[2].input.approvedIdea.markdown,'Validated outcome with next steps.');
  for(const table of ['business_projects','agent_runs','assessments','assessment_versions','workflow_progress']){
    const column = table==='business_projects' ? 'id' : 'project_id';
    const query = 'select * from public.'+table+' where '+column+'=$1';
    assert.ok((await as(a,tx=>tx.query(query,[project.id]))).rows.length>0);
    assert.equal((await as(b,tx=>tx.query(query,[project.id]))).rows.length,0);
  }
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'viewer')",[business.id,b]);
  assert.equal((await as(b,tx=>tx.query('select id from public.businesses where id=$1',[business.id]))).rows.length,1);
  await assert.rejects(run('B','market-intelligence'),{status:404});
  assert.equal((await as(b,tx=>tx.query("update public.businesses set name='Changed' where id=$1 returning id",[business.id]))).rows.length,0);
  const verify=createSessionVerifier({url:'https://example.invalid',publishableKey:'test',fetchImpl:async (url,{headers})=>{
    assert.equal(url.pathname,'/auth/v1/user'); assert.equal(headers.authorization,'Bearer test.test.test');
    return Response.json({id:a,is_anonymous:false});
  }});
  assert.deepEqual(await verify('test.test.test'),{id:a});
  assert.equal(await verify('invalid'),null);
  const { rows: [source] } = await as(a,tx=>tx.query(
    'select source_assessment_id, source_assessment_version from public.agent_runs where id=$1', [market.runId]
  ));
  assert.deepEqual(source,{source_assessment_id:idea.assessmentId,source_assessment_version:1});
  await db.close();
  db = await PGlite.create(directory);
  const { rows: [restored] } = await as(a,tx=>tx.query(
    'select result from public.assessment_versions where run_id=$1', [market.runId]
  ));
  assert.equal(restored.result.markdown,'Market intelligence built from approved idea.');
  const hidden = await as(b,tx=>tx.query('select result from public.assessment_versions where run_id=$1', [market.runId]));
  // Viewer access was explicitly granted above, so revoke it before rechecking isolation.
  assert.equal(hidden.rows.length,1);
  await db.query('delete from public.business_memberships where business_id=$1 and user_id=$2',[business.id,b]);
  assert.equal((await as(b,tx=>tx.query('select result from public.assessment_versions where run_id=$1',[market.runId]))).rows.length,0);
  await db.exec(readFileSync('rollback.sql','utf8'));
  assert.equal((await db.query("select to_regclass('public.businesses') as table_id")).rows[0].table_id,null);
  console.log('PASS: two-user SQL isolation, owner and viewer permissions, API identity contract, approved handoff, retries, versioning and saved market result, assessment provenance, and restart recovery. Agent calls and auth endpoint stubbed.');
} finally { await db.close(); rmSync(directory, { recursive:true, force:true }); }
