import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinHistory, loadHistoryPage, visibleRequest } from './history.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const time = '2026-11-12T01:00:00.123456+00:00';
const runs = Array.from({ length: 53 }, (_, i) => ({ project_id: 'project', id: id(i + 1), created_at: time }));
const hidden = { project_id: 'other', id: id(999), created_at: time };

test('keyset pages preserve tied timestamps through interleaved inserts and updates', async () => {
  const dataset = [...runs, hidden];
  const db = {
    from(table) {
      assert.equal(table, 'agent_runs');
      let project, count, cursor;
      const order = [];
      const query = {
        select: () => query,
        eq(key, value) { assert.equal(key, 'project_id'); project = value; return query; },
        order(key, { ascending }) { assert.equal(ascending, false); order.push(key); return query; },
        limit(value) { count = value; return query; },
        or(value) {
          const match = value.match(/^created_at.lt.(.+),and\(created_at.eq.\1,id.lt.(.+)\)$/);
          assert.ok(match);
          cursor = { time: match[1], id: match[2] };
          return query;
        },
        then(resolve) {
          assert.deepEqual(order, ['created_at', 'id']);
          assert.equal(count, 13);
          const data = dataset.filter(item => item.project_id === project && (!cursor ||
            item.created_at < cursor.time || (item.created_at === cursor.time && item.id < cursor.id)))
            .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)).slice(0, count);
          return Promise.resolve({ data }).then(resolve);
        },
      };
      return query;
    },
  };
  let page = await loadHistoryPage(db, 'project', 'runs');
  dataset.push({ project_id: 'project', id: id(1000), created_at: time });
  dataset[4].status = 'succeeded';
  while (page.next) page = joinHistory(page, await loadHistoryPage(db, 'project', 'runs', page.next));
  assert.deepEqual(page.items.map(row => row.id), runs.map(row => row.id).reverse());
  assert.equal(page.items.find(row => row.id === id(5)).status, 'succeeded');
  assert.equal((await loadHistoryPage(db, 'project', 'runs')).items[0].id, id(1000));
});

test('stale reservations display unknown without changing known terminal states', () => {
  const now = Date.parse(time) + 301000;
  for (const status of ['queued', 'running']) {
    assert.equal(visibleRequest({ status, updated_at: time }, now).status, 'unknown');
  }
  assert.equal(visibleRequest({ status: 'completed', updated_at: time }, now).status, 'completed');
});
