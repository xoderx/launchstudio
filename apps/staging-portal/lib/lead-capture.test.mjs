import assert from 'node:assert/strict';
import {test} from 'node:test';
import {challenge,validateLead,requesterHash,createLeadHandlers} from './lead-capture.mjs';
function environment(t){const saved=process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY;process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY='synthetic-signing-key-only-for-tests-0123456789';t.after(()=>{if(saved===undefined)delete process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY;else process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY=saved;});}
const ip='a'.repeat(64);
const valid=(now=Date.now())=>({email:'  Founder@Example.invalid ',goal:'Validate a useful business idea',interest:'membership',businessName:'Example',source:'early-access',consent:true,website:'',token:challenge(ip,now-3000)});
test('signed interest tokens bind an IP hash and time window; consent and minimal data are required',t=>{
 environment(t);const now=Date.now();const value=valid(now);const lead=validateLead(value,ip,now);
 assert.equal(lead.email,'founder@example.invalid');assert.equal(lead.ipHash,ip);assert.ok(!value.token.includes('Founder'));
 for(const change of [{consent:false},{website:'spam'},{email:'invalid'},{goal:'x'},{interest:'admin'},{businessName:'x'.repeat(121)},{secret:'unknown'}])assert.throws(()=>validateLead({...value,...change},ip,now));
 assert.throws(()=>validateLead(value,'b'.repeat(64),now));
 assert.throws(()=>validateLead({...value,token:challenge(ip,now)},ip,now));
 assert.throws(()=>validateLead({...value,token:challenge(ip,now-16*60_000)},ip,now));
 assert.throws(()=>validateLead({...value,token:value.token.slice(0,-1)+(value.token.endsWith('a')?'b':'a')},ip,now));
});
test('HTTP protection rejects cross-origin, malformed, oversized and unsigned submissions before database access',async t=>{
 environment(t);let accessed=0;const handlers=createLeadHandlers({database:()=>{accessed++;throw Error('must not execute');}});
 const post=(body,origin='https://launch.example',type='application/json')=>new Request('https://launch.example/api/early-access',{method:'POST',headers:{origin,'content-type':type},body:typeof body==='string'?body:JSON.stringify(body)});
 assert.equal((await handlers.POST(post(valid(),'https://attacker.example'))).status,403);
 assert.equal((await handlers.POST(post(valid(),'https://launch.example','text/plain'))).status,415);
 assert.equal((await handlers.POST(post('{'))).status,400);
 assert.equal((await handlers.POST(post('x'.repeat(10001)))).status,413);
 assert.equal((await handlers.POST(post({...valid(),token:'invalid'}))).status,400);
 assert.equal(accessed,0);
});
test('missing signing configuration fails closed and never leaks submitted data or driver messages',async t=>{
 environment(t);delete process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY;
 const handlers=createLeadHandlers({database:()=>{throw Error('secret connection details');}});
 const r=await handlers.GET(new Request('https://launch.example/api/early-access'));assert.equal(r.status,503);assert.ok(!(await r.text()).includes('connection'));
});
test('deployed requester identity uses a platform IP header and hashes it without persisting a raw address',t=>{
 environment(t);const old=process.env.VERCEL_ENV;process.env.VERCEL_ENV='preview';t.after(()=>{if(old===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=old;});
 assert.throws(()=>requesterHash(new Request('https://launch.example/api/early-access')));
 const hash=requesterHash(new Request('https://launch.example/api/early-access',{headers:{'x-vercel-forwarded-for':'192.0.2.10'}}));assert.match(hash,/^[a-f0-9]{64}$/);assert.ok(!hash.includes('192.0.2'));
});
