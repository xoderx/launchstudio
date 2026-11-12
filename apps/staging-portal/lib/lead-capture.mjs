import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
export const interests = ['membership','growth-suite','covibecoder','managed-implementation','partnership','general','support'];
const sources = new Set(['early-access','contact','partners','pricing']);
export const consentVersion = 'early-access-v1';
function failure(status, message) { return Object.assign(Error(message), { status }); }
function key() {
  const value = process.env.LAUNCHSTUDIO_LEAD_SIGNING_KEY;
  if (typeof value !== 'string' || value.length < 32) throw failure(503, 'Interest capture is temporarily unavailable. Please try again later.');
  return value;
}
function digest(value) { return createHmac('sha256', key()).update(value).digest('hex'); }
export function requesterHash(request) {
  // Vercel overwrites its platform-owned forwarded-IP header. Never accept a
  // customer-supplied identity, raw IP in a body, or persist the address itself.
  const address = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (!address && process.env.VERCEL_ENV) throw failure(503, 'Interest capture is temporarily unavailable. Please try again later.');
  return digest('lead-ip:' + (address || 'local-development'));
}
export function challenge(ipHash, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id: randomUUID(), issued: now, ipHash })).toString('base64url');
  return payload + '.' + digest('lead-token:' + payload);
}
export function validateLead(input, ipHash, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    Object.keys(input).some(k => !['email','goal','interest','businessName','consent','source','website','token'].includes(k))) throw failure(400, 'Check the form and try again.');
  if (input.website) throw failure(400, 'The request could not be accepted.');
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const goal = typeof input.goal === 'string' ? input.goal.trim() : '';
  const businessName = typeof input.businessName === 'string' ? input.businessName.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || goal.length < 5 || goal.length > 2000 ||
      businessName.length > 120 || !interests.includes(input.interest) || !sources.has(input.source) || input.consent !== true) {
    throw failure(400, 'Enter a valid email, goal, interest and explicit consent.');
  }
  if (typeof input.token !== 'string' || input.token.length > 1000) throw failure(400, 'Refresh the form and try again.');
  const [payload, signature, extra] = input.token.split('.');
  if (!payload || !/^[a-f0-9]{64}$/.test(signature ?? '') || extra) throw failure(400, 'Refresh the form and try again.');
  const expected = Buffer.from(digest('lead-token:' + payload));
  if (!timingSafeEqual(expected, Buffer.from(signature))) throw failure(400, 'Refresh the form and try again.');
  let token;
  try { token = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw failure(400, 'Refresh the form and try again.'); }
  if (!/^[a-f0-9-]{36}$/.test(token.id ?? '') || token.ipHash !== ipHash || !Number.isFinite(token.issued) ||
      now - token.issued < 2000 || now - token.issued > 15 * 60_000) throw failure(400, 'The form expired or was sent too quickly. Reload it and try again.');
  return { requestId: token.id, email, goal, interest: input.interest, businessName, source: input.source, ipHash };
}
export async function saveLead(db, lead) {
  return db.transaction(async tx => {
    // A single short transaction protects both the global and per-IP quota and
    // the idempotency decision across concurrent requests and server instances.
    await tx.query("select pg_advisory_xact_lock(hashtextextended('launchstudio-leads',0))");
    const previous = await tx.query('select id from public.marketing_leads where request_id=$1', [lead.requestId]);
    if (previous.rows.length) return;
    const { rows: [limits] } = await tx.query(`select
      count(*) filter(where ip_hash=$1 and created_at>now()-interval '1 hour')::int as ip_count,
      count(*)::int as daily_count from public.marketing_leads where created_at>now()-interval '1 day'`, [lead.ipHash]);
    if (limits.ip_count >= 5 || limits.daily_count >= 1000) throw failure(429, 'Too many requests. Please try again later.');
    await tx.query(`insert into public.marketing_leads(request_id,email,goal,interest,business_name,source,consent,consent_version,ip_hash)
      values($1,$2,$3,$4,$5,$6,true,$7,$8)`, [lead.requestId,lead.email,lead.goal,lead.interest,lead.businessName || null,lead.source,consentVersion,lead.ipHash]);
  });
}
export function createLeadHandlers({ database }) {
  const response = (body,status=200) => Response.json(body,{status,headers:{'cache-control':'no-store',...(status===429?{'retry-after':'3600'}:{})}});
  const originAllowed = request => {
    const origin = request.headers.get('origin');
    return origin === new URL(request.url).origin || (process.env.LAUNCHSTUDIO_PUBLIC_SITE_URL && origin === new URL(process.env.LAUNCHSTUDIO_PUBLIC_SITE_URL).origin);
  };
  return {
    async GET(request) {
      try {
        if (request.headers.get('sec-fetch-site') === 'cross-site') return response({error:'Same-origin request required.'},403);
        return response({token:challenge(requesterHash(request))});
      } catch { return response({error:'Interest capture is temporarily unavailable. Please try again later.'},503); }
    },
    async POST(request) {
      try {
        if (!originAllowed(request) || request.headers.get('sec-fetch-site') === 'cross-site') return response({error:'Same-origin request required.'},403);
        if (!request.headers.get('content-type')?.startsWith('application/json')) return response({error:'JSON required.'},415);
        const reader = request.body?.getReader();
        if (!reader) return response({error:'Request body required.'},400);
        let bytes = 0; const chunks = [];
        for (;;) { const {done,value} = await reader.read(); if(done)break; bytes += value.byteLength;
          if(bytes>10000){await reader.cancel();return response({error:'Request too large.'},413);} chunks.push(Buffer.from(value)); }
        let input; try { input=JSON.parse(Buffer.concat(chunks).toString()); } catch { return response({error:'Check the form and try again.'},400); }
        const lead=validateLead(input,requesterHash(request));
        await saveLead(database(),lead);
        return response({message:'Your request has been recorded. This does not create an account, subscription or access entitlement.'},201);
      } catch(error) {
        const status=[400,429,503].includes(error.status)?error.status:503;
        // Never log submitted emails, goals, addresses, token contents or DB errors.
        return response({error:status===503?'Interest capture is temporarily unavailable. Please try again later.':error.message},status);
      }
    },
  };
}
