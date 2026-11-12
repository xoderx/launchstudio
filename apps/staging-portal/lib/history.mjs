const pageSize = 12;
const histories = {
  versions: {
    table: 'assessment_versions', key: 'run_id',
    fields: 'project_id, assessment_id, run_id, agent, version, result, approval_status, approved_at, created_at',
  },
  runs: {
    table: 'agent_runs', key: 'id',
    fields: 'project_id, id, actor_id, request_id, agent, status, source_assessment_id, source_assessment_version, market_assessment_id, market_assessment_version, created_at',
  },
};

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export async function loadHistoryPage(db, projectId, type, cursor) {
  const { table, key, fields } = histories[type];
  let query = db.from(table).select(fields).eq('project_id', projectId)
    .order('created_at', { ascending: false }).order(key, { ascending: false }).limit(pageSize + 1);
  if (cursor) {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(cursor.time) ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(cursor.id)) throw Error('Invalid history cursor');
    query = query.or(`created_at.lt.${cursor.time},and(created_at.eq.${cursor.time},${key}.lt.${cursor.id})`);
  }
  const data = unwrap(await query).filter(row => row.project_id === projectId);
  const items = data.slice(0, pageSize);
  const last = items.at(-1);
  let sources = [];
  if (type === 'versions' && items.length) {
    sources = unwrap(await db.from('agent_runs').select('id, project_id, source_assessment_id, source_assessment_version, market_assessment_id, market_assessment_version')
      .eq('project_id', projectId).in('id', items.map(item => item.run_id))).filter(row => row.project_id === projectId);
  }
  return { items, sources, next: data.length > pageSize ? { time: last.created_at, id: last[key] } : null };
}

export function joinHistory(previous, next) {
  return { items: [...previous.items, ...next.items], sources: [...previous.sources, ...next.sources], next: next.next };
}

export function visibleRequest(request, now = Date.now()) {
  if (['queued', 'running'].includes(request.status) &&
      now - Date.parse(request.updated_at) >= 5 * 60 * 1000) return { ...request, status: 'unknown' };
  return request;
}
