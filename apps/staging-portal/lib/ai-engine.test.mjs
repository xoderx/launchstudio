import {test} from 'node:test';import assert from 'node:assert/strict';
import {executionRouter,pickaxeCompatibility,executeReservedAI,validateExecution,compareExecutions} from './ai-engine.mjs';
import {gatewayAdapter} from './gateway-adapter.mjs';
const policy={enabled:true,credentialAvailable:true,budgetVerified:true,models:['synthetic/model'],maxOutputTokens:100,maxInputBytes:100,maxCostMicrousd:50};
const request={actorId:'synthetic-actor',projectId:'synthetic-project',requestId:'synthetic-request',model:'synthetic/model',prompt:'Synthetic brief',maxInputTokens:20,maxOutputTokens:50,maxCostMicrousd:10,approved:true,contextOptIn:true};
test('Pickaxe compatibility retains its exact contract and rejects implicit cutover',async()=>{
 let input;const run=executionRouter({pickaxe:pickaxeCompatibility(async(...args)=>{input=args;return 'unchanged';})});
 assert.equal(await run('agent',{goal:'approved'},{requestId:'id'}),'unchanged');assert.equal(input[0],'agent');
 assert.throws(()=>run('agent',{}, {provider:'gateway'}),/disabled/);
});
test('execution gates reject missing credentials, confidential context and token/cost/approval violations',()=>{
 for(const change of [{enabled:false},{credentialAvailable:false},{budgetVerified:false}])assert.throws(()=>validateExecution(request,{...policy,...change}),/disabled/);
 for(const change of [{approved:false},{contextOptIn:false},{confidential:true},{model:'unlisted/model'},{maxCostMicrousd:51},{maxInputTokens:1},{maxOutputTokens:101}])assert.throws(()=>validateExecution({...request,...change},policy));
});
test('unknown outcomes and previously claimed requests never replay external execution',async()=>{
 let calls=0,unknown=0,claimed=false;
 const ledger={claim:async()=>claimed?null:(claimed=true,{allowSubmission:true}),complete:async()=>{},unknown:async()=>{unknown++;}};
 const adapter={generate:async()=>{calls++;throw Error('ambiguous network response');}};
 assert.equal((await executeReservedAI({request,policy,ledger,adapter})).status,'unknown');
 assert.equal((await executeReservedAI({request,policy,ledger,adapter})).status,'already-reserved');assert.equal(calls,1);assert.equal(unknown,1);
});
test('gateway structured adapter uses no automatic retries and comparison keeps costs/quality unknown',async()=>{
 let opts;const adapter=gatewayAdapter({generate:async options=>{opts=options;return {output:{summary:'Synthetic',evidence:[],assumptions:[],actions:[]},usage:{totalTokens:12}};}});
 assert.equal((await adapter.generate(request)).output.summary,'Synthetic');assert.equal(opts.maxRetries,0);assert.equal(opts.maxOutputTokens,50);
 const comparison=compareExecutions({id:'fixture-1',sources:[]},[{provider:'pickaxe',sources:[],status:'not-run'}]);
 assert.equal(comparison.automaticCutover,false);assert.equal(comparison.results[0].costMicrousd,null);assert.match(comparison.results[0].quality,/Human/);
});
