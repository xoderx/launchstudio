const agents = { 'idea-validator': 'YL7LGN8AV2', 'market-intelligence': 'RYAET6419X' };
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function createWorkflow({ database, verifySession, runAgent }) {
  return async ({ token, projectId, requestId, agent }) => {
    const actor = await verifySession(token);
    if (!actor || !uuid.test(actor.id)) throw Object.assign(Error('Sign in required'), { status: 401 });
    if (!uuid.test(projectId) || !uuid.test(requestId) || !Object.hasOwn(agents, agent)) {
      throw Object.assign(Error('Invalid workflow request'), { status: 400 });
    }
    const authorize = async tx => {
      const { rows: [p] } = await tx.query(`
        select p.id, p.goal, b.name, b.profile
        from public.business_projects p join public.businesses b on b.id=p.business_id
        where p.id=$1 and p.status='active'
          and (b.owner_id=$2 or exists (
            select 1 from public.business_memberships m where m.business_id=b.id
            and m.user_id=$2 and m.role='editor'))
        for share of b
      `, [projectId, actor.id]);
      if (!p) throw Object.assign(Error('Project unavailable'), { status: 404 });
      return p;
    };
    const claimed = await database.transaction(async tx => {
      const project = await authorize(tx);
      const args = [projectId, actor.id, agent, requestId];
      const { rows: [existing] } = await tx.query('select id,status from public.agent_runs where project_id=$1 and actor_id=$2 and agent=$3 and request_id=$4', args);
      if (existing) return { existing };
      let approved;
      if (agent === 'market-intelligence') {
        const { rows: [version] } = await tx.query(`
          select assessment_id, version, result from public.assessment_versions
          where project_id=$1 and agent='idea-validator' and approval_status='approved'
          order by version desc limit 1
        `, [projectId]);
        if (!version) throw Object.assign(Error('Approve an Idea Validator assessment first'), { status: 409 });
        approved = version;
      }
      const { rows: [run] } = await tx.query(`
        insert into public.agent_runs(project_id,actor_id,agent,request_id,status,source_assessment_id,source_assessment_version)
        values($1,$2,$3,$4,'running',$5,$6) on conflict do nothing returning id
      `, [...args, approved?.assessment_id ?? null, approved?.version ?? null]);
      if (!run) throw Object.assign(Error('Request already in progress'), { status: 409 });
      const profile = Object.fromEntries(['industry','audience','offering','budget'].filter(k => Object.hasOwn(project.profile,k)).map(k => [k,project.profile[k]]));
      return { run, input: { name: project.name, goal: project.goal, profile, approvedIdea: approved?.result } };
    });
    if (claimed.existing) return { runId: claimed.existing.id, status: claimed.existing.status };
    const runId = claimed.run.id;
    try {
      const output = await runAgent(agents[agent], claimed.input);
      if (typeof output !== 'string' || output.trim().length === 0 || Buffer.byteLength(output) > 60000) throw Error('Invalid agent response');
      return await database.transaction(async tx => {
        await authorize(tx);
        const { rowCount } = await tx.query(
          "update public.agent_runs set status='succeeded' where id=$1 and status='running'", [runId]
        );
        if (!rowCount) throw Error('Agent run is no longer active');
        const { rows: [assessment] } = await tx.query(`
          insert into public.assessments(project_id,agent) values($1,$2)
          on conflict(project_id,agent) do update set agent=excluded.agent returning id
        `, [projectId,agent]);
        const { rows: [version] } = await tx.query(`
          insert into public.assessment_versions(assessment_id,project_id,agent,version,run_id,result)
          select $1,$2,$3,coalesce(max(version),0)+1,$4,$5 from public.assessment_versions
          where assessment_id=$1 returning version
        `, [assessment.id,projectId,agent,runId,{ markdown: output.trim() }]);
        await tx.query(`
          insert into public.workflow_progress(project_id,stage,next_agent,outstanding_tasks)
          values($1,$2,null,$3) on conflict(project_id) do update
          set stage=excluded.stage,next_agent=excluded.next_agent,outstanding_tasks=excluded.outstanding_tasks
        `,[projectId,agent==='idea-validator'?'approve':'review',JSON.stringify([agent==='idea-validator'?'Approve the validation assessment':'Review the market analysis'])]);
        return { runId, assessmentId: assessment.id, version: version.version, status: 'succeeded' };
      });
    } catch {
      await database.query("update public.agent_runs set status='failed' where id=$1 and status='running'",[runId]);
      throw Object.assign(Error('Agent run failed'), { status: 502 });
    }
  };
}

export function createSessionVerifier({ url, publishableKey, fetchImpl = fetch }) {
  return async token => {
    if (typeof token !== 'string' || token.length > 8192 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null;
    const response = await fetchImpl(new URL('/auth/v1/user', url), {
      headers: { apikey: publishableKey, authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user.is_anonymous === false && uuid.test(user.id) ? { id: user.id } : null;
  };
}
