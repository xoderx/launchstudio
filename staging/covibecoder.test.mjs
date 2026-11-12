import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { planningOutline, codingHandoff, developmentProgress, artifactMarkdown } from './covibecoder.mjs';
import { validateDraft } from './tool-engine.mjs';
import { buildAdapters, externalActionRequest, executeExternalAction } from './build-adapters.mjs';

const tools = JSON.parse(readFileSync(new URL('../catalog/tool-specs/covibecoder.json', import.meta.url)));
const registry = JSON.parse(readFileSync(new URL('../catalog/agent-registry.json', import.meta.url))).agents;
const inputs = { field1: 'Observed need', field2: 'Named constraints', field3: 'Review criteria' };
const content = tool => validateDraft(planningOutline(tool, { inputs }), tool);

test('65 registered positions preserve 52 canonical specs and all 13 commander workflow identities', () => {
  const base = ['launch', 'grow', 'monetize', 'scale'].flatMap(stage => JSON.parse(readFileSync(new URL(`../catalog/tool-specs/${stage}.json`, import.meta.url))));
  assert.equal(base.length, 52);
  assert.equal(tools.length, 13);
  assert.equal(new Set([...base, ...tools].map(tool => tool.position)).size, 65);
  tools.forEach((tool, index) => {
    const source = registry.find(item => item.position === 53 + index);
    assert.equal(tool.position, source.position);
    assert.equal(tool.name, source.name);
    assert.equal(tool.commanderId, source.commanderId);
    assert.equal(tool.catalogId, source.id);
    assert.equal(tool.promptFile, source.promptFile);
    assert.ok(tool.starters.length >= 3 && new Set(tool.starters).size >= 3);
    assert.equal(tool.fields.length, 3);
    assert.equal(tool.outputs.length, 3);
    assert.equal(tool.executionAllowed, false);
    assert.equal(content(tool).inputs.field1, inputs.field1);
    assert.match(codingHandoff(tool, content(tool), {}), /explicit approval/);
    assert.match(artifactMarkdown(tool, { content: content(tool) }), /No external build/);
  });
  assert.throws(() => content({ ...tools[0], fields: [{ key: 'missing', label: 'Required field', required: true, maxLength: 10 }] }), /Complete/);
});

test('Q/CUE counts persisted approvals, identifies revision drafts, and never infers deployment', () => {
  const progress = developmentProgress(tools, [
    { tool_position: 53, version: 2, approved_at: null, has_approved: true },
    { tool_position: 54, version: 1, approved_at: 'now' },
  ]);
  assert.equal(progress.approved, 2);
  assert.equal(progress.steps[0].status, 'revision pending');
  assert.equal(progress.next, 53);
  const finished = developmentProgress(tools, tools.map(tool => ({ tool_position: tool.position, version: 1, approved_at: 'now' })));
  assert.match(finished.message, /Verify release evidence/);
});

test('all build adapters fail closed and describe exact approval targets', async () => {
  assert.equal(buildAdapters.length, 4);
  for (const adapter of buildAdapters) {
    const action = externalActionRequest({ provider: adapter.key, artifactId: 'artifact', version: 1,
      action: 'repository-write', target: 'selected/repo:reviewed-branch' });
    assert.equal(action.executed, false);
    assert.equal(action.approvalRequired, true);
    await assert.rejects(executeExternalAction(action), /unavailable/);
  }
});

test('CoVibeCoder database lifecycle, pinned imports, membership and tenant boundaries survive restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'covibecoder-'));
  let db = await PGlite.create(directory);
  const a = '10000000-0000-4000-8000-000000000001', b = '10000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    for (const file of readdirSync(new URL('./supabase/migrations/', import.meta.url)).sort()) {
      await db.exec(readFileSync(new URL('./supabase/migrations/' + file, import.meta.url), 'utf8'));
    }
    const as = (actor, sql, args = []) => db.transaction(async tx => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]);
      return tx.query(sql, args);
    });
    await db.query('insert into auth.users values($1),($2)', [a, b]);
    for (const actor of [a, b]) await as(actor, "insert into public.customer_profiles(user_id,display_name) values($1,'Synthetic tester')", [actor]);
    const bizA = (await as(a, "insert into public.businesses(owner_id,name) values($1,'A') returning id", [a])).rows[0].id;
    const bizB = (await as(b, "insert into public.businesses(owner_id,name) values($1,'B') returning id", [b])).rows[0].id;
    const project = async (actor, biz) => (await as(actor, "insert into public.business_projects(business_id,goal) values($1,'Build a useful app') returning id", [biz])).rows[0].id;
    const source = await project(a, bizA), target = await project(a, bizA), other = await project(b, bizB);
    const save = async (actor, target, position, draft = content(tools[0]), request = crypto.randomUUID()) =>
      (await as(actor, 'select public.save_tool_deliverable($1,$2,$3,$4) as id', [target, position, request, draft])).rows[0].id;
    await assert.rejects(save(a, target, 53), { code: '42501' });
    await assert.rejects(as(a, "insert into public.business_suite_entitlements(business_id,suite,enabled) values($1,'covibecoder',true)", [bizA]), { code: '42501' });
    await db.query("insert into public.business_suite_entitlements(business_id,suite,enabled) values($1,'covibecoder',true),($2,'covibecoder',true)", [bizA, bizB]);
    await assert.rejects(as(a, 'select public.import_covibecoder_context($1,$2)', [target, source]), { code: '22023' });
    const businessDraft = { ...content(tools[0]) };
    delete businessDraft.inputs;
    const approved = await save(a, source, 1, businessDraft);
    await as(a, 'select public.approve_tool_deliverable($1)', [approved]);
    const pending = await save(a, source, 1, { ...businessDraft, summary: 'Unapproved newer source' });
    await assert.rejects(as(b, 'select public.import_covibecoder_context($1,$2)', [other, source]), { code: '42501' });
    await as(a, 'select public.import_covibecoder_context($1,$2)', [target, source]);
    let snapshot = (await as(a, 'select snapshot from public.covibecoder_contexts where project_id=$1', [target])).rows[0].snapshot;
    assert.equal(snapshot.deliverables.length, 1);
    assert.equal(snapshot.deliverables[0].deliverableId, approved);
    const request = crypto.randomUUID();
    const first = await save(a, target, 53, content(tools[0]), request);
    assert.equal(await save(a, target, 53, content(tools[0]), request), first);
    await as(a, 'select public.approve_tool_deliverable($1)', [first]);
    for (const tool of tools.slice(1)) assert.ok(await save(a, target, tool.position, content(tool)));
    await assert.rejects(save(a, target, 66), { code: '22023' });
    await assert.rejects(save(a, target, 53, businessDraft), { code: '22023' });
    await assert.rejects(save(b, target, 53), { code: '42501' });
    assert.equal((await as(b, 'select id from public.tool_deliverables where project_id=$1', [target])).rows.length, 0);
    assert.equal((await as(b, 'select project_id from public.covibecoder_contexts where project_id=$1', [target])).rows.length, 0);
    assert.equal((await as(b, 'select * from public.covibecoder_progress($1)', [target])).rows.length, 0);
    await assert.rejects(as(b, 'select public.approve_tool_deliverable($1)', [first]), { code: '42501' });
    const copiedSources = (await as(a, 'select sources from public.tool_deliverables where id=$1', [first])).rows[0].sources;
    assert.ok(copiedSources.some(item => item.deliverableId === approved && item.version === 1 && item.projectId === source));
    await as(a, 'select public.approve_tool_deliverable($1)', [pending]);
    snapshot = (await as(a, 'select snapshot from public.covibecoder_contexts where project_id=$1', [target])).rows[0].snapshot;
    assert.equal(snapshot.deliverables[0].version, 1);
    const revised = await save(a, target, 53, { ...content(tools[0]), summary: 'Revision' });
    let progress = (await as(a, 'select * from public.covibecoder_progress($1)', [target])).rows;
    assert.equal(progress.length, 13);
    assert.equal(progress.find(item => item.tool_position === 53).version, 2);
    assert.equal(developmentProgress(tools, progress).steps[0].status, 'revision pending');
    await as(a, 'select public.import_covibecoder_context($1,$2)', [target, source]);
    assert.deepEqual((await as(a, 'select sources from public.tool_deliverables where id=$1', [first])).rows[0].sources, copiedSources);
    await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'viewer')", [bizA, b]);
    assert.equal((await as(b, 'select * from public.covibecoder_progress($1)', [target])).rows.length, 13);
    await assert.rejects(save(b, target, 53), { code: '42501' });
    await assert.rejects(as(b, 'select public.approve_tool_deliverable($1)', [revised]), { code: '42501' });
    await assert.rejects(as(b, 'select public.import_covibecoder_context($1,$2)', [target, source]), { code: '42501' });
    await db.query('update public.business_suite_entitlements set enabled=false where business_id=$1', [bizA]);
    assert.equal((await as(a, 'select * from public.covibecoder_progress($1)', [target])).rows.length, 0);
    assert.equal((await as(a, 'select project_id from public.covibecoder_contexts where project_id=$1', [target])).rows.length, 0);
    await assert.rejects(save(a, target, 53), { code: '42501' });
    await assert.rejects(as(a, 'select public.approve_tool_deliverable($1)', [revised]), { code: '42501' });
    assert.ok(await save(a, target, 1, businessDraft)); // original program unaffected
    await db.query("update public.business_suite_entitlements set enabled=true,expires_at=now()-interval '1 second' where business_id=$1", [bizA]);
    await assert.rejects(save(a, target, 53), { code: '42501' });
    await db.query('update public.business_suite_entitlements set expires_at=null where business_id=$1', [bizA]);
    await db.query('delete from public.business_memberships where business_id=$1 and user_id=$2', [bizA, b]);
    await db.close(); db = await PGlite.create(directory);
    assert.equal((await as(a, 'select content from public.tool_deliverables where id=$1', [revised])).rows[0].content.summary, 'Revision');
    assert.equal((await as(b, 'select id from public.tool_deliverables where project_id=$1', [target])).rows.length, 0);
    assert.equal((await as(a, 'select * from public.covibecoder_progress($1)', [source])).rows.length, 0);
  } finally { await db.close(); rmSync(directory, { recursive: true, force: true }); }
});
