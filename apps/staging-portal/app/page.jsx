'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export default function Portal() {
  const [client, setClient] = useState(null);
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let subscription;
    let active = true;
    fetch('/api/config').then(async response => {
      if (!response.ok) throw Error('Staging configuration is unavailable.');
      const { url, publishableKey } = await response.json();
      if (!active) return;
      const db = createClient(url, publishableKey, { auth: { detectSessionInUrl: false } });
      subscription = db.auth.onAuthStateChange((_event, current) => setSession(current)).data.subscription;
      setClient(db);
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      unwrap(await client.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') }));
    } catch {
      setMessage('Sign-in failed. Check your staging credentials and try again.');
    } finally { setBusy(false); }
  }
  return <>
    <header><p className="brand">LaunchStudio Staging</p><h1>Business workspace</h1></header>
    {!client && <p role="status">{message || 'Connecting to staging…'}</p>}
    {client && !session && <form onSubmit={login}>
      <h2>Sign in</h2>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <p role="status">{message}</p>
    </form>}
    {session && <Workspace key={session.user.id} db={client} session={session} />}
  </>;
}

function Workspace({ db, session }) {
  const [businesses, setBusinesses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [businessId, selectBusiness] = useState('');
  const [projectId, selectProject] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const actor = session.user.id;
  const business = businesses.find(item => item.id === businessId);
  const project = projects.find(item => item.id === projectId);

  async function refresh() {
    const [owned, available] = await Promise.all([
      db.from('businesses').select('id, owner_id, name, profile').order('created_at'),
      db.from('business_projects').select('id, business_id, goal, status').order('created_at'),
    ]);
    setBusinesses(unwrap(owned));
    setProjects(unwrap(available));
  }
  useEffect(() => { refresh().catch(() => setMessage('Could not load your workspace.')); }, [db]);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    async function load() {
      try {
        const [versions, runs, progress] = await Promise.all([
          db.from('assessment_versions').select('assessment_id, agent, version, result, approval_status, created_at')
            .eq('project_id', projectId).order('created_at', { ascending: false }),
          db.from('agent_runs').select('id, actor_id, request_id, agent, status, source_assessment_id, source_assessment_version')
            .eq('project_id', projectId).order('created_at', { ascending: false }),
          db.from('workflow_progress').select('stage, next_agent, outstanding_tasks').eq('project_id', projectId).maybeSingle(),
        ]);
        const next = { projectId, versions: unwrap(versions), runs: unwrap(runs), progress: unwrap(progress) };
        if (!active) return;
        setSnapshot(next);
      } catch {
        if (active) setMessage('Could not refresh project activity.');
      }
    }
    load();
    const timer = setInterval(load, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [db, projectId]);

  const current = snapshot?.projectId === projectId ? snapshot : null;
  const pendingRun = pending && current?.runs.find(run => run.request_id === pending.requestId && run.actor_id === actor);
  const waiting = pending?.projectId === projectId && !['failed', 'succeeded'].includes(pendingRun?.status);

  async function action(callback) {
    setBusy(true);
    setMessage('');
    try { await callback(); }
    catch { setMessage('The action could not be completed. Check your access and try again.'); }
    finally { setBusy(false); }
  }
  function saveBusiness(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    action(async () => {
      const values = { name: data.get('name'), profile: {
        ...business?.profile, industry: data.get('industry'), audience: data.get('audience'), offering: data.get('offering'),
      } };
      if (business) {
        unwrap(await db.from('businesses').update(values).eq('id', business.id).select('id').single());
      } else {
        const profile = unwrap(await db.from('customer_profiles').select('user_id').eq('user_id', actor).maybeSingle());
        if (!profile) {
          unwrap(await db.from('customer_profiles').insert({ user_id: actor, display_name: data.get('displayName') }));
        }
        const created = unwrap(await db.from('businesses').insert({ ...values, owner_id: actor }).select('id').single());
        selectBusiness(created.id);
      }
      await refresh();
      setMessage('Business profile saved.');
    });
  }
  function createProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const goal = new FormData(form).get('goal');
    action(async () => {
      const created = unwrap(await db.from('business_projects').insert({ business_id: businessId, goal }).select('id').single());
      await refresh();
      selectProject(created.id);
      form.reset();
    });
  }
  function runAgent(agent, retry = null) {
    const input = retry ?? { projectId, agent, requestId: crypto.randomUUID() };
    setPending(input);
    action(async () => {
      const response = await fetch('/api/workflow', { method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(input) });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || 'The request could not be queued.');
        if (response.status < 500) setPending(null);
        return;
      }
      setMessage('Request accepted. Saved results appear below.');
    });
  }
  return <>
    <button className="secondary" onClick={() => action(async () => unwrap(await db.auth.signOut()))} disabled={busy}>Sign out</button>
    <p role="status">{message}</p>
    <section><h2>Business profile</h2>
      <label>Business<select value={businessId} onChange={event => { selectBusiness(event.target.value); selectProject(''); }}>
        <option value="">New business</option>
        {businesses.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select></label>
      <form key={businessId} onSubmit={saveBusiness}>
        {!business && <label>Your display name<input name="displayName" required maxLength={120} /></label>}
        <label>Business name<input name="name" required maxLength={160} defaultValue={business?.name} /></label>
        <label>Industry<input name="industry" defaultValue={business?.profile.industry} /></label>
        <label>Audience<input name="audience" defaultValue={business?.profile.audience} /></label>
        <label>Offering<textarea name="offering" defaultValue={business?.profile.offering} /></label>
        <button disabled={busy}>Save business profile</button>
      </form>
    </section>
    {business && <section><h2>Projects</h2>
      <label>Project<select value={projectId} onChange={event => selectProject(event.target.value)}>
        <option value="">Choose a project</option>
        {projects.filter(item => item.business_id === businessId).map(item => <option value={item.id} key={item.id}>{item.goal}</option>)}
      </select></label>
      <form onSubmit={createProject}>
        <label>New project goal<textarea name="goal" required maxLength={2000} /></label>
        <button disabled={busy}>Create project</button>
      </form>
    </section>}
    {project && <section><h2>Project activity</h2><p>{project.goal}</p>
      <p>Status: {project.status}{current?.progress && ` · Stage: ${current.progress.stage}`}</p>
      {current?.progress?.outstanding_tasks.map(task => <p key={task}>{task}</p>)}
      <div className="actions">
        <button disabled={busy || waiting} onClick={() => runAgent('idea-validator')}>Run Idea Validator</button>
        <button disabled={busy || waiting || !current?.versions.some(v => v.agent === 'idea-validator' && v.approval_status === 'approved')}
          onClick={() => runAgent('market-intelligence')}>Run Market Intelligence</button>
      </div>
      {waiting && <div><p role="status">Request {pendingRun?.status ?? 'queued'}.</p>
        <button className="secondary" disabled={busy} onClick={() => runAgent(pending.agent, pending)}>Check or resend same request</button></div>}
      {pendingRun?.status === 'failed' && <p role="status">Agent run failed. Run the agent again to start a new request.</p>}
      <h3>Saved assessments</h3>
      {!current && <p>Loading project activity…</p>}
      {current?.versions.length === 0 && <p>No assessments saved.</p>}
      {current?.versions.map(version => <article key={`${version.assessment_id}:${version.version}`}>
        <h4>{version.agent === 'idea-validator' ? 'Idea Validator' : 'Market Intelligence'} · Version {version.version}</h4>
        <p>{version.approval_status}</p><pre>{version.result.markdown}</pre>
        {version.agent === 'idea-validator' && version.approval_status === 'pending' &&
          <button disabled={busy} onClick={() => action(async () => {
            unwrap(await db.rpc('approve_idea_assessment', { target: version.assessment_id, target_version: version.version }));
            setMessage('Assessment approved.');
          })}>Approve version {version.version}</button>}
      </article>)}
    </section>}
  </>;
}
