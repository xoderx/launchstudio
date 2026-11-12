export function createRequestHandler(workflow) {
  return async request => {
    const json = (value, status) => Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return json({ error: 'Sign in required' }, 401);
    let payload;
    try {
      if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'JSON required' }, 415);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'Request body required' }, 400);
      const chunks = [];
      let bytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 2048) {
          await reader.cancel();
          return json({ error: 'Request too large' }, 413);
        }
        chunks.push(Buffer.from(value));
      }
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!payload || typeof payload !== 'object' || Object.keys(payload).some(key => !['projectId','requestId','agent','operation'].includes(key))) throw Error();
    } catch {
      return json({ error: 'Invalid workflow request' }, 400);
    }
    try {
      return json(await workflow({ token, ...payload }), 200);
    } catch (error) {
      const statuses = { 400:'Invalid workflow request',401:'Sign in required',404:'Project unavailable',409:'Workflow conflict',502:'Agent run failed' };
      const status = Object.hasOwn(statuses,error.status) ? error.status : 500;
      return json({ error: statuses[status] ?? 'Workflow unavailable' }, status);
    }
  };
}
