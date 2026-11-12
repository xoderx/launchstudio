// Adapter for the existing ledger. Preparation only: no customer route calls it.
export function gatewayLedger(db,{persistResult}={}){
 const args=r=>[r.projectId,r.actorId,r.agent,r.requestId];
 return {
  async claim(r){
   if(![r.maxCostMicrousd,r.maxInputTokens,r.maxOutputTokens].every(x=>Number.isSafeInteger(x)&&x>0))throw Error('Invalid execution limits');
   return db.transaction(async tx=>{
   const {rows:[w]}=await tx.query(`select * from public.workflow_requests where project_id=$1 and actor_id=$2 and agent=$3 and request_id=$4 for update`,args(r));
   if(!w||w.provider!=='vercel-ai-gateway'||w.status!=='queued'||w.dispatch_id!==r.dispatchId)return null;
   const {rows:[member]}=await tx.query(`select p.id from public.business_projects p join public.businesses b on b.id=p.business_id where p.id=$1 and p.status='active' and (b.owner_id=$2 or exists(select 1 from public.business_memberships m where m.business_id=b.id and m.user_id=$2 and m.role='editor'))`,[r.projectId,r.actorId]);
   if(!member)throw Error('Project unavailable');
   const {rows:[limit]}=await tx.query(`update public.ai_budget_accounts set reserved_microusd=reserved_microusd+$2,reserved_tokens=reserved_tokens+$3 where actor_id=$1 and enabled and period_start<=now() and period_end>now() and spent_microusd+reserved_microusd+$2<=limit_microusd and used_tokens+reserved_tokens+$3<=token_limit returning actor_id`,[r.actorId,r.maxCostMicrousd,r.maxInputTokens+r.maxOutputTokens]);
   if(!limit)throw Error('Customer/plan budget exhausted or unconfigured');
   await tx.query(`update public.workflow_requests set status='running',reserved_microusd=$5,reserved_tokens=$6,provider_model=$7 where project_id=$1 and actor_id=$2 and agent=$3 and request_id=$4`,[...args(r),r.maxCostMicrousd,r.maxInputTokens+r.maxOutputTokens,r.model]);
   return {allowSubmission:true};
  });},
  // The pilot must supply an existing assessment/provenance persistence sink and
  // authoritative accounting. Missing/unknown billing never frees reservations.
  async complete(r,result){
   const a=result.accounting;
   if(typeof persistResult!=='function'||a?.verified!==true||!Number.isSafeInteger(a.costMicrousd)||a.costMicrousd<0||!Number.isSafeInteger(a.tokens)||a.tokens<0)throw Error('Verified result persistence and accounting required');
   return db.transaction(async tx=>{
    const {rows:[w]}=await tx.query(`select * from public.workflow_requests where project_id=$1 and actor_id=$2 and agent=$3 and request_id=$4 for update`,args(r));
    if(!w||w.provider!=='vercel-ai-gateway')throw Error('Reserved request unavailable');
    if(w.status==='completed')return;
    if(!['running','unknown'].includes(w.status)||a.costMicrousd>Number(w.reserved_microusd)||a.tokens>Number(w.reserved_tokens))throw Error('Accounting requires operator reconciliation');
    // Must authorize the actor/project again and persist the original source
    // references within this transaction; no customer result is stored here.
    const {rows:[member]}=await tx.query(`select p.id from public.business_projects p join public.businesses b on b.id=p.business_id where p.id=$1 and p.status='active' and (b.owner_id=$2 or exists(select 1 from public.business_memberships m where m.business_id=b.id and m.user_id=$2 and m.role='editor'))`,[r.projectId,r.actorId]);
    if(!member)throw Error('Project unavailable');
    await persistResult(tx,r,result);
    await tx.query(`update public.ai_budget_accounts set reserved_microusd=reserved_microusd-$2,reserved_tokens=reserved_tokens-$3,spent_microusd=spent_microusd+$4,used_tokens=used_tokens+$5 where actor_id=$1`,[r.actorId,w.reserved_microusd,w.reserved_tokens,a.costMicrousd,a.tokens]);
    await tx.query(`update public.workflow_requests set status='completed' where project_id=$1 and actor_id=$2 and agent=$3 and request_id=$4`,args(r));
   });
  },
  async unknown(r){await db.query(`update public.workflow_requests set status='unknown' where project_id=$1 and actor_id=$2 and agent=$3 and request_id=$4 and provider='vercel-ai-gateway'`,args(r));},
 };
}
