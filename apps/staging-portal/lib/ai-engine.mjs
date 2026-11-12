// Server-side orchestration contract. There is deliberately no public execute route.
export function pickaxeCompatibility(run) {
 return {provider:'pickaxe',assessment:(...args)=>run(...args)};
}
export function executionRouter({pickaxe}) {
 return (id,context,options={})=>{
  if(options.provider && options.provider!=='pickaxe')throw Error('Provider cutover is disabled');
  return pickaxe.assessment(id,context,options);
 };
}
export function validateExecution(request,policy){
 if(!policy.enabled||!policy.credentialAvailable||!policy.budgetVerified)throw Error('Direct AI execution disabled');
 if(!request.actorId||!request.projectId||!request.requestId||request.approved!==true||request.contextOptIn!==true)throw Error('Authorized context and approval required');
 if(request.confidential===true)throw Error('Confidential advanced-program data cannot enter this provider');
 if(!policy.models?.includes(request.model)||!Number.isSafeInteger(request.maxOutputTokens)||request.maxOutputTokens<1||request.maxOutputTokens>policy.maxOutputTokens)throw Error('Model or output limit unavailable');
 if(!Number.isSafeInteger(request.maxCostMicrousd)||request.maxCostMicrousd<1||request.maxCostMicrousd>policy.maxCostMicrousd)throw Error('Execution cost limit unavailable');
 const inputBytes=typeof request.prompt==='string'?new TextEncoder().encode(request.prompt).length:Infinity;
 if(inputBytes>policy.maxInputBytes||!Number.isSafeInteger(request.maxInputTokens)||request.maxInputTokens<inputBytes||request.maxInputTokens>policy.maxInputBytes)throw Error('Input budget exceeded');
 if(request.streaming===true)throw Error('Native streaming persistence is not enabled');
}
export async function executeReservedAI({request,policy,ledger,adapter}){
 validateExecution(request,policy);
 // Inject a binding to the EXISTING workflow_requests ledger, not a new run store.
 // Claim/budget reservation must be atomic and persisted before this boundary.
 const claim=await ledger.claim(request);
 if(!claim)return {status:'already-reserved'};
 if(claim.allowSubmission!==true)return {status:'reconciliation-required'};
 try{
  const result=await adapter.generate(request);
  await ledger.complete(request,result);
  return {status:'completed',result};
 }catch{
  // A timeout, invalid result or persistence error may follow an accepted call.
  // Never release the budget or automatically resubmit an ambiguous request.
  await ledger.unknown(request);
  return {status:'unknown',recovery:'Operator reconciliation required; no automatic replay'};
 }
}
export function compareExecutions(fixture,results){
 return {fixtureId:fixture.id,synthetic:true,automaticCutover:false,results:results.map(r=>({provider:r.provider,
  inputDigest:r.inputDigest??null,provenancePreserved:r.status==='completed'?JSON.stringify(r.sources??[])===JSON.stringify(fixture.sources):null,
  structuredValid:r.status==='completed'?typeof r.output?.summary==='string'&&Array.isArray(r.output?.evidence):null,
  tokens:r.tokens??null,costMicrousd:r.costMicrousd??null,latencyMs:r.latencyMs??null,
  status:r.status??'not-run',quality:'Human rubric review required; no quality score inferred',recovery:r.recovery??'not verified'}))};
}
