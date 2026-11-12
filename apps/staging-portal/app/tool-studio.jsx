'use client';

import { useEffect, useRef, useState } from 'react';
import launch from '../../../catalog/tool-specs/launch.json';
import grow from '../../../catalog/tool-specs/grow.json';
import monetize from '../../../catalog/tool-specs/monetize.json';
import scale from '../../../catalog/tool-specs/scale.json';
import playbooks from '../../../catalog/flagship-playbooks.json';
import { draftFields, validateDraft } from '../../../staging/tool-engine.mjs';
import { artifactMarkdown, codingHandoff, planningOutline } from '../../../staging/covibecoder.mjs';

const tools = [...launch, ...grow, ...monetize, ...scale];
const groups = ['All stages', 'Launch', 'Grow', 'Monetize', 'Scale'];
const pageSize = 12;
const empty = () => ({ deliverables: ['', '', ''] });

function download(tool, row) {
  const file = new Blob([JSON.stringify({ tool: tool.key, ...row }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${tool.key}-v${row.version}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadText(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AcademySprint({ tool, next, approved }) {
  return <details className="settings"><summary>Academy · Sprint {tool.position}: {tool.name}{approved ? ' · Deliverable approved' : ''}</summary>
    <h3>Learning objectives</h3><p>Explain the project decision this sprint supports. Produce {tool.outputs.join(', ').toLowerCase()} and identify one assumption that needs testing.</p>
    <h3>Lesson and tutorial</h3><ol>
      <li>Review the project goal and the approved evidence. {tool.input}.</li>
      <li>{tool.exercise}</li>
      <li>Record the observation under evidence and label any inference as an assumption.</li>
      <li>Use the tool workspace below to document {tool.outputs.join(', ').toLowerCase()}. Assign an owner and a date to the first action.</li>
    </ol>
    <h3>Exercise and deliverable</h3><p>Complete the exercise, save a version, and ask a teammate to review your evidence and decision. Track: {tool.metric}.</p>
    <h3>Discussion and community challenge</h3><p>Which finding would change your decision? Share an anonymized hypothesis with a peer and ask them to identify a counterexample.</p>
    <h3>Completion checklist</h3><ul><li>Record evidence and assumptions separately.</li><li>Complete all three deliverable sections.</li>
      <li>Record a baseline or explain why it is missing.</li><li>Approve the reviewed version.</li></ul>
    {next && <p>Recommended next sprint: {next.name}.</p>}
  </details>;
}

export default function ToolStudio({ db, project, business, view, canEdit, audienceEnabled }) {
  const [stage, setStage] = useState('All stages');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState(1);
  const matching = tools.filter(tool => (stage === 'All stages' || tool.category === stage) &&
    tool.name.toLowerCase().includes(search.trim().toLowerCase()));
  const tool = matching.find(item => item.position === position) ?? matching[0];
  return <section id="tool-studio" aria-labelledby="tool-studio-title">
    <h2 id="tool-studio-title">Tool workspace and academy</h2>
    <div className="dashboard-grid">
      <label>Filter by stage<select value={stage} onChange={event => setStage(event.target.value)}>
        {groups.map(group => <option key={group}>{group}</option>)}</select></label>
      <label>Find a tool<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
    </div>
    {tool ? <>
      <label>Tool<select value={tool.position} onChange={event => setPosition(Number(event.target.value))}>
        {matching.map(item => <option value={item.position} key={item.key}>{item.position}. {item.name}</option>)}
      </select></label>
      <ToolWorkbench key={`${project?.id ?? 'none'}:${tool.key}`} db={db} tool={tool}
        project={project} business={business} view={view} canEdit={canEdit} audienceEnabled={audienceEnabled} />
    </> : <p>No tools match this search.</p>}
    <details className="settings"><summary>Guided playbooks · {playbooks.length}</summary>
      {playbooks.map(playbook => <article key={playbook.name}><h3>{playbook.name}</h3>
        <p>{playbook.objective}</p><p>Inputs: {playbook.inputs}.</p>
        <ol>{playbook.tools.map(step => <li key={step}>{step}</li>)}</ol>
        <p>{playbook.criteria}</p><p>{playbook.approval}</p><p>{playbook.timeline}</p></article>)}
    </details>
  </section>;
}

export function ToolWorkbench({ db, tool, project, business, view, canEdit, audienceEnabled,
  catalog = tools, importedContext, onChange, recoveryKey }) {
  const [draft, setDraft] = useState(empty);
  const [rows, setRows] = useState(null);
  const [queue, setQueue] = useState([]);
  const [prior, setPrior] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const request = useRef(null);
  const next = catalog.find(item => item.position === tool.position + 1);
  const coVibe = tool.category === 'CoVibeCoder';
  const connected = tool.providerStatus === 'verified_existing_workflow' || (tool.key === 'audience-dna' && audienceEnabled);
  const fetchRows = async before => {
    let query = db.from('tool_deliverables').select('id, request_id, version, content, sources, approved_at, created_at')
      .eq('project_id', project.id).eq('tool_position', tool.position).order('version', { ascending: false }).limit(pageSize + 1);
    if (before) query = query.lt('version', before);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };
  useEffect(() => {
    if (!project) return;
    let live = true;
    if (recoveryKey) {
      try {
        const pending = JSON.parse(sessionStorage.getItem(recoveryKey) ?? 'null');
        if (pending) {
          setDraft(validateDraft(pending.content, tool)); request.current = pending.requestId;
          setMessage('Recovered an unconfirmed draft. Check saved versions or save again to confirm the same request.');
        }
      } catch { sessionStorage.removeItem(recoveryKey); }
    }
    Promise.all([fetchRows(), db.from('tool_deliverables').select('id, tool_position, version')
      .eq('project_id', project.id).gte('tool_position', coVibe ? 53 : 1).lte('tool_position', coVibe ? 65 : 52)
      .is('approved_at', null).order('created_at', { ascending: false }).limit(12),
      db.from('tool_deliverables').select('tool_position,version,content').eq('project_id', project.id)
        .gte('tool_position', coVibe ? 53 : 1)
        .lt('tool_position',tool.position).not('approved_at','is',null)
        .order('tool_position',{ascending:false}).order('version',{ascending:false}).limit(1).maybeSingle()])
      .then(([data, inbox, source]) => { if (live) {
        if (recoveryKey && request.current && data.some(row => row.request_id === request.current)) {
          request.current = null; sessionStorage.removeItem(recoveryKey);
          setMessage('Recovered save confirmed in version history.');
        }
        setRows(data.slice(0, pageSize)); setHasMore(data.length > pageSize);
        setQueue(inbox.data ?? []);
        setPrior(source.data ?? null);
      } }).catch(() => { if (live) setError('Could not load saved drafts.'); });
    return () => { live = false; };
  }, [db, project?.id, tool.position, recoveryKey]);

  async function save(event) {
    event.preventDefault();
    setError(''); setMessage('');
    let content;
    try { content = validateDraft(draft, tool); } catch (error) { setError(error.message); return; }
    setBusy(true);
    request.current ??= crypto.randomUUID();
    try {
      if (recoveryKey) sessionStorage.setItem(recoveryKey, JSON.stringify({ requestId: request.current, content }));
      const { error } = await db.rpc('save_tool_deliverable', {
        target: project.id, tool: tool.position, request: request.current, draft: content,
      });
      if (error) throw error;
      request.current = null;
      if (recoveryKey) sessionStorage.removeItem(recoveryKey);
      const data = await fetchRows();
      setRows(data.slice(0, pageSize)); setHasMore(data.length > pageSize);
      setMessage('Draft version saved.');
      onChange?.();
    } catch { setError('The save could not be confirmed. Submit again to check the same request.'); }
    finally { setBusy(false); }
  }

  async function approve(row) {
    setBusy(true); setError('');
    try {
      const { error } = await db.rpc('approve_tool_deliverable', { target: row.id });
      if (error) throw error;
      const data = await fetchRows();
      setRows(data.slice(0, pageSize)); setHasMore(data.length > pageSize);
      setQueue(items => items.filter(item => item.id !== row.id));
      setMessage('Version approved.');
      onChange?.();
    } catch { setError('Could not approve this version.'); }
    finally { setBusy(false); }
  }

  async function more() {
    setBusy(true); setError('');
    try {
      const data = await fetchRows(rows.at(-1)?.version);
      setRows([...rows, ...data.slice(0, pageSize)]);
      setHasMore(data.length > pageSize);
    } catch { setError('Could not load older versions.'); }
    finally { setBusy(false); }
  }

  return <div>
    <h3>{tool.name}</h3><p>{tool.input}.</p>
    <p>Produces {tool.outputs.join(', ').toLowerCase()}.</p>
    <p className="muted">{connected ? 'Provider workflow available in the selected project.' :
      'Draft workspace available. Provider execution and usage cost are unverified.'} {connected && <a href="#workflow">Open workflow controls</a>}</p>
    {coVibe ? <details className="settings"><summary>CoVibeCoder pathway · Step {tool.position - 52} of 13</summary>
      <p><strong>Learning objective:</strong> {tool.input}.</p>
      <p><strong>Guided exercise:</strong> {tool.exercise}</p>
      <ol><li>Review the imported approved context and prior development step.</li>
        <li>Complete the tailored inputs and draft the three deliverables.</li>
        <li>Check evidence and assumptions, save a version, and request review.</li>
        <li>Approve the planning artifact before using it in the next step.</li></ol>
      {next && <p>Next step: {next.name}.</p>}
    </details> : <AcademySprint tool={tool} next={next} approved={rows?.some(row => row.approved_at)} />}
    {!project ? <p>Select a project to view or save drafts.</p> : <>
      <p><strong>Saved context:</strong> {business.name} · {project.goal}</p>
      {view?.approvedIdea && <p>Approved Idea Validator · Version {view.approvedIdea.version}</p>}
      {view?.approvedMarket && <p>Approved Market Intelligence · Version {view.approvedMarket.version}</p>}
      {view?.summary?.approvedAudience && <p>Approved Audience DNA · Version {view.summary.approvedAudience.version}</p>}
      {prior && <details><summary>Approved prior tool: {catalog.find(item => item.position === prior.tool_position)?.name} · Version {prior.version}</summary>
        <p>{prior.content.summary}</p><ul>{prior.content.deliverables.map((value, index) => <li key={index}>{value}</li>)}</ul>
      </details>}
      <details className="settings"><summary>Approval inbox · {queue.length} recent</summary>
        {queue.length ? <ul>{queue.map(row => <li key={row.id}>
          {catalog.find(item => item.position === row.tool_position)?.name} · Version {row.version}
        </li>)}</ul> : <p>No pending tool drafts loaded.</p>}
      </details>
      {canEdit && <form onSubmit={save}>
        <fieldset disabled={coVibe && Boolean(request.current)}>
        {tool.fields?.map(field => <div key={field.key}><label htmlFor={`${tool.key}-${field.key}`}>{field.label}</label>
          <textarea id={`${tool.key}-${field.key}`} required={field.required} maxLength={field.maxLength} value={draft.inputs?.[field.key] ?? ''}
            onChange={event => setDraft({ ...draft, inputs: { ...draft.inputs, [field.key]: event.target.value } })} />
        </div>)}
        <div className="actions">
          {(tool.starters ?? [`Start with the inputs: ${tool.input}`, `Use the exercise: ${tool.exercise}`,
            `Use the saved project goal and measure: ${tool.metric}.`]).map(starter =>
            <button type="button" className="secondary" key={starter} onClick={() => setDraft({ ...draft, input: starter })}>{starter}</button>)}
        </div>
        {coVibe && <div className="actions"><button type="button" className="secondary" onClick={() => {
          try { setDraft(planningOutline(tool, draft)); setError(''); setMessage('Planning outline prepared from your inputs. Review and complete it before approval.'); }
          catch (error) { setError(error.message); }
        }}>Prepare planning outline</button>
          <button type="button" className="secondary" onClick={async () => {
            try {
              await navigator.clipboard.writeText(codingHandoff(tool, draft, { business: business.name,
                project: { id: project.id, goal: project.goal }, imports: importedContext ? [importedContext] : [], prior }));
              setMessage('Build prompt copied. Use it in an authorized coding environment.');
            } catch { setError('Clipboard unavailable. Export the draft and copy it manually.'); }
          }}>Copy build prompt with context</button></div>}
        {Object.entries(draftFields).map(([field, label]) => <div key={field}><label htmlFor={`${tool.key}-${field}`}>{label}</label>
          <textarea id={`${tool.key}-${field}`} required={['input', 'summary'].includes(field)} maxLength={3000} value={draft[field] ?? ''}
            onChange={event => setDraft({ ...draft, [field]: event.target.value })} /></div>)}
        {tool.outputs.map((label, i) => <div key={label}><label htmlFor={`${tool.key}-output-${i}`}>{label}</label>
          <textarea id={`${tool.key}-output-${i}`} required maxLength={4000} value={draft.deliverables[i]}
            onChange={event => setDraft({ ...draft, deliverables: draft.deliverables.map((value, index) =>
              index === i ? event.target.value : value) })} /></div>)}
        </fieldset>
        {coVibe && request.current && <p role="status">Confirm the pending save before revising this draft. Saving again uses the same request.</p>}
        <button disabled={busy}>Save draft version</button>
      </form>}
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      <h4>Saved versions</h4>
      {rows === null ? <p>{error ? 'History unavailable.' : 'Loading saved versions…'}</p> :
        !rows.length ? <p>No tool drafts saved for this project.</p> : rows.map(row => <article key={row.id}>
          <h5>Version {row.version} · {row.approved_at ? 'Approved' : 'Draft'}</h5>
          <p>{row.content.summary}</p>
          <details><summary>Read deliverable</summary>
            {tool.fields?.map(field => <div key={field.key}><h6>{field.label}</h6><pre>{row.content.inputs?.[field.key]}</pre></div>)}
            {tool.outputs.map((label, i) => <div key={label}><h6>{label}</h6><pre>{row.content.deliverables[i]}</pre></div>)}
            {Object.entries(draftFields).filter(([key]) => row.content[key]).map(([key,label]) =>
              <div key={key}><h6>{label}</h6><pre>{row.content[key]}</pre></div>)}
          </details>
          {row.sources.length > 0 && <ul>{row.sources.map((source, index) => <li key={`${source.assessmentId ?? source.deliverableId}:${source.version}:${index}`}>
            {source.agent ?? catalog.find(item => item.position === source.toolPosition)?.name ?? `Tool ${source.toolPosition}`} · Version {source.version}</li>)}</ul>}
          <div className="actions">
            <button className="secondary" onClick={() => download(tool, row)}>Export JSON</button>
            {coVibe && <>
              <button className="secondary" onClick={() => downloadText(`${tool.key}-v${row.version}.md`, artifactMarkdown(tool, row), 'text/markdown')}>Export Markdown</button>
              <button className="secondary" onClick={async () => {
                try { await navigator.clipboard.writeText(artifactMarkdown(tool, row)); setMessage('Artifact copied.'); }
                catch { setError('Clipboard unavailable. Use Markdown export.'); }
              }}>Copy artifact</button>
              {tool.outputs.map((label, index) => <button key={label} className="secondary" onClick={() =>
                downloadText(`${tool.key}-v${row.version}-${index + 1}.${tool.formats[index]}`, row.content.deliverables[index])}>
                Export {label} (.{tool.formats[index]})</button>)}
            </>}
            {canEdit && <button className="secondary" disabled={busy}
              onClick={() => { setDraft(row.content); setMessage('Version loaded into the draft editor.'); }}>Edit as new version</button>}
            {canEdit && !row.approved_at && <button disabled={busy} onClick={() => approve(row)}>Approve version {row.version}</button>}
          </div>
        </article>)}
      {hasMore && <button className="secondary" disabled={busy} onClick={more}>Load older drafts</button>}
    </>}
  </div>;
}
