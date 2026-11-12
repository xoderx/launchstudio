'use client';

import { useState } from 'react';
import registry from '../../../catalog/agent-registry.json';
import { agentNames } from '../lib/command-center.mjs';

const stages = ['Launch', 'Grow', 'Monetize', 'Scale'];
const labels = {
  active: 'Active', completed: 'Completed', archived: 'Archived',
  approved: 'Approved', pending: 'Pending approval', rejected: 'Rejected',
  queued: 'Queued', running: 'Running', succeeded: 'Succeeded', failed: 'Failed',
  submitting: 'Submitting', unconfirmed: 'Submission unconfirmed', unknown: 'Status unknown',
};

export const projectName = project => project.name === 'Untitled project' ? project.goal : project.name;

export function Badge({ value }) {
  return <span className="badge" data-status={value}>{labels[value] ?? value}</span>;
}

function DateLabel({ value }) {
  if (!value) return null;
  return <time dateTime={value}>{new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>;
}

export function StageNavigation() {
  const [stage, setStage] = useState('Launch');
  const tools = registry.agents.filter(item => item.category === stage);
  return <section id="tools" aria-labelledby="tools-title">
    <h2 id="tools-title">Tool roadmap</h2>
    <p className="muted">52 tools across four stages. Idea Validator and Market Intelligence are available in the selected project.</p>
    <nav className="stage-nav" aria-label="Business stages">
      {stages.map(item => <button type="button" key={item} aria-pressed={item === stage}
        className="secondary" onClick={() => setStage(item)}>{item}</button>)}
    </nav>
    <h3>{stage}</h3>
    <ul className="tool-list">
      {tools.map(tool => <li key={tool.id}>
        {['YL7LGN8AV2', 'RYAET6419X'].includes(tool.id)
          ? <a href="#workflow">{tool.name}</a> : <span>{tool.name}</span>}
        <small>{['YL7LGN8AV2', 'RYAET6419X'].includes(tool.id) ? 'Available in Q/CUE' : 'Planned for Q/CUE'}</small>
      </li>)}
    </ul>
  </section>;
}

export function Activity({ runs, projects, onSelect }) {
  return <section id="activity" aria-labelledby="activity-title">
    <h2 id="activity-title">Recent workflow activity</h2>
    {runs === null ? <p className="muted">Loading activity…</p> :
      !runs.length ? <p className="muted">No workflow activity for this business yet.</p> :
        <ul className="activity-list">{runs.map(run => {
          const project = projects.find(item => item.id === run.project_id);
          return <li key={run.id}>
            <div><strong>{agentNames[run.agent]}</strong>
              {project && <button className="text-button" onClick={() => onSelect(project.id)}>{projectName(project)}</button>}
            </div>
            <div className="activity-meta"><Badge value={run.status} /><DateLabel value={run.created_at} /></div>
          </li>;
        })}</ul>}
  </section>;
}

export function ProjectProgress({ view, project }) {
  return <section aria-labelledby="progress-title">
    <h2 id="progress-title">Project progress</h2>
    {!view ? <p className="muted">Loading project progress…</p> : <>
      {view.progress && <p className="muted">Current stage: <strong>{({
        intake: 'Intake', validate: 'Validation', approve: 'Approval', research: 'Research', review: 'Review',
      })[view.progress.stage]}</strong></p>}
      <h3>Completed steps</h3>
      {view.completed.length ? <ul>{view.completed.map(step => <li key={step}>{step}</li>)}</ul> :
        <p className="muted">Completed steps appear when assessments are saved or approved.</p>}
      <h3>Outstanding tasks</h3>
      {view.progress?.outstanding_tasks?.length
        ? <ul>{view.progress.outstanding_tasks.filter(task => typeof task === 'string').map((task, index) => <li key={index}>{task}</li>)}</ul>
        : <p className="muted">No tasks recorded.</p>}
      <p className="next-action"><strong>Next recommended action</strong><br />
        {project.status === 'active' ? view.next : 'Review the saved project and assessments'}</p>
    </>}
  </section>;
}

export function SavedContext({ business, project, view }) {
  const profile = business.profile ?? {};
  return <section aria-labelledby="context-title">
    <h2 id="context-title">Saved context</h2>
    <dl>
      <dt>Business</dt><dd>{business.name}</dd>
      {['industry', 'audience', 'offering', 'budget'].map(key => typeof profile[key] === 'string' && profile[key].trim()
        ? <div key={key}><dt>{key[0].toUpperCase() + key.slice(1)}</dt><dd>{profile[key]}</dd></div> : null)}
      <dt>Project goal</dt><dd>{project.goal}</dd>
      <dt>Market Intelligence source</dt>
      <dd>{!view ? 'Loading approved assessment…' : view.approvedIdea
        ? <a href={`#assessment-${view.approvedIdea.assessment_id}-${view.approvedIdea.version}`}>Approved Idea Validator · Version {view.approvedIdea.version}</a>
        : 'Approve an Idea Validator version to make it available for Market Intelligence.'}</dd>
    </dl>
  </section>;
}

export function AssessmentLibrary({ view, canApprove, busy, approve, historyControls }) {
  return <section id="assessments" aria-labelledby="assessments-title">
    <h2 id="assessments-title">Assessment library</h2>
    {!view ? <p className="muted">Loading assessments…</p> :
      !view.versions.length ? <p className="muted">Saved Idea Validator and Market Intelligence versions will appear here.</p> :
        view.versions.map(version => {
          const id = `assessment-${version.assessment_id}-${version.version}`;
          const source = view.runById.get(version.run_id);
          return <article className="assessment" id={id} key={id}>
            <h3>{agentNames[version.agent]} · Version {version.version}</h3>
            <div className="actions"><Badge value={version.approval_status} /><DateLabel value={version.created_at} /></div>
            {version.approved_at && <p className="muted">Approved <DateLabel value={version.approved_at} /></p>}
            {version.agent === 'market-intelligence' && <p>
              {source?.source_assessment_id
                ? <a href={`#assessment-${source.source_assessment_id}-${source.source_assessment_version}`}>Source: Idea Validator version {source.source_assessment_version}</a>
                : 'No source version is available.'}
            </p>}
            <details><summary>Read assessment</summary>
              {version.result?.markdown ? <pre>{version.result.markdown}</pre> : <p className="muted">No assessment text is available.</p>}
            </details>
            {canApprove && version.agent === 'idea-validator' && version.approval_status === 'pending' &&
              <button disabled={busy} onClick={() => approve(version)}>Approve version {version.version}</button>}
          </article>;
        })}
    {historyControls}
  </section>;
}
