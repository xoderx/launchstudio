import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {emptyLifecycle,scenarioRange,lifecycleProgress} from '../apps/staging-portal/lib/lifecycle.mjs';
import {gatewayLedger} from '../apps/staging-portal/lib/ai-budget.mjs';
test('private advanced programs enforce individual access, versions, approvals, expiry and audit without worker exposure',async()=>{
 const db=await PGlite.create();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const f of readdirSync(new URL('./supabase/migrations/',import.meta.url)).sort())await db.exec(readFileSync(new URL('./supabase/migrations/'+f,import.meta.url),'utf8'));
 const a=crypto.randomUUID(),b=crypto.randomUUID();
 const as=(actor,sql,args=[])=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);return tx.query(sql,args);});
 await db.query('insert into auth.users values($1),($2)',[a,b]);
 for(const id of [a,b])await as(id,"insert into public.customer_profiles(user_id,display_name) values($1,'Synthetic')",[id]);
 const business=(await as(a,"insert into public.businesses(owner_id,name) values($1,'Synthetic advanced') returning id",[a])).rows[0].id;
 const p=(await as(a,"insert into public.business_projects(business_id,goal) values($1,'Transform safely') returning id",[business])).rows[0].id;
 const call=async(actor,program,operation='read',request=null,draft=null,version=null)=>(await as(actor,'select public.advanced_workspace($1,$2,$3,$4,$5,$6) as result',[p,program,operation,request,draft,version])).rows[0].result;
 await assert.rejects(call(a,'exit'),{code:'42501'});
 await db.query("insert into launchstudio_private.advanced_entitlements(business_id,program,enabled) values($1,'transform',true),($1,'exit',true)",[business]);
 await assert.rejects(call(a,'exit'),{code:'42501'});
 await db.query("insert into launchstudio_private.advanced_access(business_id,program,user_id,role) values($1,'transform',$2,'editor'),($1,'exit',$2,'approver')",[business,a]);
 await assert.rejects(call(b,'exit'),{code:'42501'});
 const draft=emptyLifecycle();draft.intake.history='Confidential synthetic earnings, no actual customer data';
 const request=crypto.randomUUID();const first=await call(a,'exit','save',request,draft);
 const again=await call(a,'exit','save',request,draft);assert.equal(first.savedId,again.savedId);
 await assert.rejects(call(a,'exit','save',request,{...draft,decisions:'Different request content'}),{code:'22023'});
 assert.equal((await call(a,'exit')).versions.length,1);
 await call(a,'exit','approve',null,null,first.savedId);
 assert.ok((await call(a,'exit')).current.approved_at);
 await call(a,'exit','save',crypto.randomUUID(),{...draft,decisions:'Revised for review'});
 const history=await call(a,'exit');assert.equal(history.current.version,2);assert.equal(history.current.approved_at,null);assert.equal(history.versions.length,2);
 assert.equal((await call(a,'exit','read',null,null,first.savedId)).current.content.decisions,'');
 const t=await call(a,'transform','save',crypto.randomUUID(),emptyLifecycle());
 await assert.rejects(call(a,'transform','approve',null,null,t.savedId),{code:'42501'});
 await assert.rejects(call(a,'transform','read',null,null,first.savedId),{code:'42501'});
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'viewer')",[business,b]);
 await assert.rejects(call(b,'exit'),{code:'42501'}); // Ordinary membership is insufficient.
 await db.query("insert into launchstudio_private.advanced_access(business_id,program,user_id,role) values($1,'exit',$2,'reader')",[business,b]);
 assert.equal((await call(b,'exit')).current.version,2);
 await assert.rejects(call(b,'exit','save',crypto.randomUUID(),draft),{code:'42501'});
 await assert.rejects(call(b,'exit','approve',null,null,first.savedId),{code:'42501'});
 for(const role of ['anon','authenticated','launchstudio_worker']){
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);return tx.query('select content from launchstudio_private.advanced_versions');}),{code:'42501'});
 }
 await assert.rejects(as(a,"insert into launchstudio_private.advanced_access(business_id,program,user_id,role) values($1,'exit',$2,'approver')",[business,b]),{code:'42501'});
 await db.query("update launchstudio_private.advanced_access set expires_at=now()-interval '1 second' where user_id=$1",[b]);
 await assert.rejects(call(b,'exit'),{code:'42501'});
 await db.query("update launchstudio_private.advanced_versions set expires_at=now()-interval '1 second' where program='exit'");
 assert.equal((await call(a,'exit')).current,null);
 await assert.rejects(call(a,'exit','read',null,null,first.savedId),{code:'42501'});
 await assert.rejects(call(a,'exit','approve',null,null,first.savedId),{code:'42501'});
 await db.query("update launchstudio_private.advanced_entitlements set enabled=false where program='transform'");
 await assert.rejects(call(a,'transform'),{code:'42501'});
 await db.query("update launchstudio_private.advanced_entitlements set enabled=true where program='transform'");
 await db.query("update public.business_projects set status='archived' where id=$1",[p]);
 await assert.rejects(call(a,'transform','save',crypto.randomUUID(),emptyLifecycle()),{code:'42501'});
 await db.query("update public.business_projects set status='active' where id=$1",[p]);
 const audits=(await db.query('select * from launchstudio_private.advanced_audit')).rows;assert.ok(audits.some(x=>x.action==='read')&&audits.some(x=>x.action==='approve'));
 assert.ok(!JSON.stringify(audits).includes('Confidential synthetic'));
 // Same request ledger; server-side budget reservation is atomic and once-only.
 const req={projectId:p,actorId:a,agent:'idea-validator',requestId:crypto.randomUUID(),dispatchId:crypto.randomUUID(),maxCostMicrousd:5,maxInputTokens:10,maxOutputTokens:10,model:'synthetic/model'};
 await db.query("insert into public.ai_budget_accounts(actor_id,plan,enabled,period_start,period_end,limit_microusd,token_limit) values($1,'synthetic-plan',true,now()-interval '1 day',now()+interval '1 day',6,25)",[a]);
 await db.query("insert into public.workflow_requests(project_id,actor_id,agent,request_id,dispatch_id,provider) values($1,$2,$3,$4,$5,'vercel-ai-gateway')",[p,a,req.agent,req.requestId,req.dispatchId]);
 const worker={query:(...args)=>db.transaction(async tx=>{await tx.exec('set local role launchstudio_worker');return tx.query(...args);}),transaction:fn=>db.transaction(async tx=>{await tx.exec('set local role launchstudio_worker');return fn(tx);})};
 const ledger=gatewayLedger(worker);assert.equal((await ledger.claim(req)).allowSubmission,true);assert.equal(await ledger.claim(req),null);await ledger.unknown(req);
 const budget=(await db.query('select reserved_microusd,reserved_tokens from public.ai_budget_accounts')).rows[0];assert.equal(Number(budget.reserved_microusd),5);assert.equal(Number(budget.reserved_tokens),20);
 await db.query("update public.workflow_requests set status='queued' where request_id=$1",[req.requestId]);
 await assert.rejects(ledger.claim(req),/budget exhausted/);
 await db.query('update public.ai_budget_accounts set reserved_microusd=0 where actor_id=$1',[a]);
 await assert.rejects(ledger.claim(req),/budget exhausted/); // Token limit independently enforced.
 await assert.rejects(ledger.claim({...req,maxCostMicrousd:-1}),/Invalid execution limits/);
 await db.query('update public.ai_budget_accounts set reserved_microusd=5 where actor_id=$1',[a]);
 await db.query("update public.workflow_requests set status='unknown' where request_id=$1",[req.requestId]);
 await assert.rejects(ledger.complete(req,{accounting:{verified:true,costMicrousd:4,tokens:15}}),/Verified result persistence/);
 let persisted=0;
 const settlement=gatewayLedger(worker,{persistResult:async()=>{persisted++;}});
 await assert.rejects(settlement.complete(req,{accounting:{verified:true,costMicrousd:7,tokens:15}}),/reconciliation/);
 const measured={accounting:{verified:true,costMicrousd:4,tokens:15}};
 await settlement.complete(req,measured);await settlement.complete(req,measured);
 assert.equal(persisted,1);
 const settled=(await db.query('select * from public.ai_budget_accounts')).rows[0];
 assert.equal(Number(settled.reserved_microusd),0);assert.equal(Number(settled.spent_microusd),4);
 assert.equal(Number(settled.reserved_tokens),0);assert.equal(Number(settled.used_tokens),15);
 }finally{await db.close();}
});
test('diagnostic completeness is evidence-based and scenarios require explicit assumptions',()=>{
 assert.equal(scenarioRange({earnings:100,low:2,high:4}),null);
 assert.equal(scenarioRange({earnings:100,low:4,high:2,debt:0,cash:0,basis:'Synthetic',currency:'USD'}),null);
 assert.deepEqual(scenarioRange({earnings:100,low:2,high:4,debt:10,cash:20,basis:'Synthetic assumptions',currency:'USD'}),{enterpriseLow:200,enterpriseHigh:400,equityLow:210,equityHigh:410});
 assert.equal(lifecycleProgress({dimensions:{a:{verified:true}},initiatives:[]}).verified,0);
});
