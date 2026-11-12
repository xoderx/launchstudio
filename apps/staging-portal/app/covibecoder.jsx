'use client';

import { useEffect, useState } from 'react';
import tools from '../../../catalog/tool-specs/covibecoder.json';
import { buildAdapters } from '../../../staging/build-adapters.mjs';
import { developmentProgress } from '../../../staging/covibecoder.mjs';
import { ToolWorkbench } from './tool-studio';

export default function CoVibeCoder({ db, actorId, business, project, projects, view, canEdit, onReturn, onSelectProject }) {
  const [position, setPosition] = useState(53);
  const [source, setSource] = useState(project?.id ?? '');
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(value => value + 1);

  useEffect(() => {
    if (!business || !project) return;
    let active = true;
    let timer;
    async function load() {
      try {
        const { data: entitlement, error: denied } = await db.from('business_suite_entitlements')
          .select('enabled,expires_at').eq('business_id', business.id).eq('suite', 'covibecoder').maybeSingle();
        if (denied) throw denied;
        const enabled = entitlement?.enabled && (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date());
        if (!enabled) {
          if (active) { setSnapshot({ projectId: project.id, entitled: false }); setError(''); }
          return;
        }
        const [progress, context] = await Promise.all([
          db.rpc('covibecoder_progress', { target: project.id }),
          db.from('covibecoder_contexts').select('source_project_id, imported_at, snapshot').eq('project_id', project.id).maybeSingle(),
        ]);
        if (progress.error || context.error) throw progress.error ?? context.error;
        if (active) {
          setSnapshot({ projectId: project.id, entitled: true, progress: developmentProgress(tools, progress.data), context: context.data });
          setError('');
        }
      } catch { if (active) { setSnapshot(null); setError('CoVibeCoder access or project state could not be verified. Retry to reload.'); } }
      finally { if (active) timer = setTimeout(load, 10000); }
    }
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [db, business?.id, project?.id, revision]);

  const current = snapshot?.projectId === project?.id ? snapshot : null;
  const tool = tools.find(item => item.position === position);

  async function importContext() {
    setBusy(true); setError(''); setNotice('');
    try {
      const { error } = await db.rpc('import_covibecoder_context', { target: project.id, source });
      if (error) throw error;
      setNotice('Approved source versions imported. Existing development versions retain their original source references.');
      refresh();
    } catch { setError('Import unavailable. Select a project in this business with approved work and verify editor access.'); }
    finally { setBusy(false); }
  }

  return <section id="covibecoder" aria-labelledby="covibecoder-title">
    <p className="brand">The fifth product suite · 13 development steps</p>
    <h2 id="covibecoder-title">CoVibeCoder project workspace</h2>
    <p>Turn an approved business idea into a product specification, development plan, test evidence, and release handoff.</p>
    <p className="notice">Planning outlines, saved drafts and manual exports are available with membership. External builds, repository writes, synchronization and deployments are not connected. Approval here records a planning review.</p>
    <button className="secondary" onClick={onReturn}>Return to the 52-tool business program</button>
    {!project || !business ? <p>Select a business project above to continue.</p> : <>
      <p><strong>Current project:</strong> {project.name} · {business.name}</p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button className="secondary" onClick={refresh}>Reload access and progress</button>
      {!current ? <p role="status">Verifying membership and loading development state…</p> : !current.entitled ?
        <p role="status">CoVibeCoder membership is not enabled for this business, or it has expired. The 52-tool business program remains available. Ask your administrator to configure the separate suite entitlement.</p> : <>
          <section aria-labelledby="development-progress-title">
            <h3 id="development-progress-title">Q/CUE development progress</h3>
            <p>{current.progress.approved} of 13 steps have an approved version. Newer drafts are shown separately.</p>
            <p>{current.progress.message}</p>
            <button onClick={() => setPosition(current.progress.next)}>Open next development step</button>
            <ol className="development-steps">{current.progress.steps.map(step => <li key={step.position}>
              <button className="secondary" aria-pressed={position === step.position} onClick={() => setPosition(step.position)}>
                {step.name}</button> <span>{step.status}{step.latest ? ` · v${step.latest.version}` : ''}</span>
            </li>)}</ol>
            <p className="muted">An approved deployment checklist records readiness review. It does not mean an application has been deployed.</p>
          </section>
          <details className="settings" open><summary>Import approved LaunchStudio context</summary>
            <p>Import approved plans, market research, audience profiles, or product specifications from a project in this business. Source versions are pinned at import time. Reimport explicitly to use newer approved work.</p>
            <label htmlFor="covibecoder-source">Source business project</label>
            <select id="covibecoder-source" value={source} onChange={event => setSource(event.target.value)}>
              {projects.filter(item => item.business_id === business.id).map(item => <option key={item.id} value={item.id}>{item.name} · {item.goal}</option>)}
            </select>
            {canEdit && <button disabled={busy || !source} onClick={importContext}>{busy ? 'Importing…' : 'Import approved context'}</button>}
            {current.context ? <>
              <p>Imported from {current.context.snapshot.sourceName} · <time dateTime={current.context.imported_at}>{new Date(current.context.imported_at).toLocaleString()}</time></p>
              <button className="text-button" onClick={() => { onSelectProject(current.context.source_project_id); onReturn(); }}>Open source business project</button>
              <ul>{current.context.snapshot.assessments.map(item => <li key={`${item.assessmentId}:${item.version}`}>
                {item.agent} · Approved version {item.version}<details><summary>Read imported assessment</summary><pre>{JSON.stringify(item.result, null, 2)}</pre></details></li>)}
                {current.context.snapshot.deliverables.map(item => <li key={item.deliverableId}>
                  Business tool {item.toolPosition} · Approved version {item.version}<details><summary>Read imported deliverable</summary><pre>{JSON.stringify(item.content, null, 2)}</pre></details></li>)}</ul>
            </> : <p>No approved business context imported yet. You can still draft the product concept using the saved project goal.</p>}
          </details>
          <label htmlFor="covibecoder-tool">Development tool</label>
          <select id="covibecoder-tool" value={position} onChange={event => setPosition(Number(event.target.value))}>
            {tools.map(item => <option key={item.key} value={item.position}>{item.position - 52}. {item.name}</option>)}
          </select>
          <ToolWorkbench key={`${project.id}:${tool.key}`} db={db} tool={tool} catalog={tools}
            project={project} business={business} view={view} canEdit={canEdit} onChange={refresh}
            importedContext={current.context?.snapshot}
            recoveryKey={`launchstudio:covibecoder:${actorId}:${project.id}:${tool.key}`} />
          <details className="settings"><summary>Authorized build environment handoffs</summary>
            <p>Copy the build prompt or export a saved artifact, then use it in your authorized environment. Never paste credentials into a draft. Review the target, artifact version and requested action before granting approval outside LaunchStudio.</p>
            {buildAdapters.map(adapter => <article key={adapter.key}><h4>{adapter.name} · {adapter.status}</h4>
              <p>{adapter.permission}</p><p>Manual prompt or artifact export is available. Automated execution has not passed credential, permission or execution tests.</p></article>)}
          </details>
          <details className="settings"><summary>CoVibeCoder readiness · separate from the 52-tool program</summary>
            <p>13 tailored workspaces and guided learning steps. Manual artifacts with versioning and approvals. 0 connected external build adapters; 0 verified deployments.</p>
            <ul>{tools.map(item => <li key={item.key}>{item.name}: manual workspace; provider execution not connected.</li>)}</ul>
          </details>
        </>}
    </>}
  </section>;
}
