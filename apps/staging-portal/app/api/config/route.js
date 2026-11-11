import { publicConfig } from '../../../lib/config.mjs';

export function GET() {
  try {
    return Response.json(publicConfig(), { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Staging is not configured' }, { status: 503 });
  }
}
