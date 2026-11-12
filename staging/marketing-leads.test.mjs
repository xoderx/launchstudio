import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {saveLead,createLeadHandlers,challenge,requesterHash} from '../apps/staging-portal/lib/lead-capture.mjs';
test('interest capture persists an admin-readable record, enforces atomic quotas/idempotency and denies customer access',async()=>{
 const db=await PGlite.create();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const file of readdirSync(new URL('./supabase/migrations/',import.meta.url)).sort())await db.exec(readFileSync(new URL('./supabase/migrations/'+file,import.meta.url),'utf8'));
 const worker={transaction:fn=>db.transaction(async tx=>{await tx.exec('set local role launchstudio_worker');return fn(tx);})};
 const base={requestId:crypto.randomUUID(),email:'founder@example.invalid',goal:'Validate a useful business idea',interest:'membership',businessName:'Example',source:'early-access',ipHash:'a'.repeat(64)};
 await saveLead(worker,base);await saveLead(worker,base);
 let data=(await db.query('select * from public.marketing_leads')).rows;assert.equal(data.length,1);assert.equal(data[0].email,base.email);assert.equal(data[0].consent,true);assert.equal(data[0].consent_version,'early-access-v1');
 for(let i=0;i<4;i++)await saveLead(worker,{...base,requestId:crypto.randomUUID()});
 await assert.rejects(saveLead(worker,{...base,requestId:crypto.randomUUID()}),{status:429});
 assert.equal((await db.query('select count(*)::int as count from public.marketing_leads')).rows[0].count,5);
 const as=(role,sql)=>db.transaction(async tx=>{await tx.exec('set local role '+role);return tx.query(sql);});
 for(const role of ['anon','authenticated'])await assert.rejects(as(role,'select * from public.marketing_leads'),{code:'42501'});
 await assert.rejects(as('launchstudio_worker','select email,goal from public.marketing_leads'),{code:'42501'});
 assert.equal((await as('launchstudio_worker','select id from public.marketing_leads')).rows.length,5);
 assert.equal((await db.query('select count(*)::int as count from public.customer_profiles')).rows[0].count,0);
 assert.equal((await db.query('select count(*)::int as count from public.business_suite_entitlements')).rows[0].count,0);
 const previousKey=process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY;
 process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY='synthetic-marketing-handler-signing-key-0123456789';
 try {
  const request=new Request('https://launch.example/api/early-access',{headers:{'x-vercel-forwarded-for':'192.0.2.10'}});
  const token=challenge(requesterHash(request),Date.now()-3000);
  const handlers=createLeadHandlers({database:()=>worker});
  const payload={email:'http-flow@example.invalid',goal:'Run a complete inquiry flow',interest:'partnership',source:'partners',consent:true,website:'',token};
  const submit=()=>handlers.POST(new Request(request.url,{method:'POST',headers:{origin:'https://launch.example','content-type':'application/json','x-vercel-forwarded-for':'192.0.2.10'},body:JSON.stringify(payload)}));
  assert.equal((await submit()).status,201);assert.equal((await submit()).status,201);
  const saved=(await db.query('select email,goal,consent from public.marketing_leads where email=$1',['http-flow@example.invalid'])).rows;
  assert.equal(saved.length,1);assert.equal(saved[0].consent,true);assert.equal(saved[0].goal,payload.goal);
 } finally {if(previousKey===undefined)delete process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY;else process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY=previousKey;}

 }finally{await db.close();}
});
