"use client";

import { useEffect, useState } from "react";
import registry from "../../../catalog/agent-registry.json";
import { audienceSections } from "../../../staging/audience-dna.mjs";
import { agentNames } from "../lib/command-center.mjs";
import { EmptyState, LoadingSkeleton, NextActionCard } from "./app-shell";
import Icon from "./icons";

const stages = ["Launch", "Grow", "Monetize", "Scale"];
const labels = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
  approved: "Approved",
  pending: "Pending approval",
  rejected: "Rejected",
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  submitting: "Submitting",
  unconfirmed: "Submission unconfirmed",
  unknown: "Status unknown",
};

export const projectName = (project) =>
  project.name === "Untitled project" ? project.goal : project.name;

export function Badge({ value }) {
  return (
    <span className="badge" data-status={value}>
      {labels[value] ?? value}
    </span>
  );
}

function DateLabel({ value }) {
  if (!value) return null;
  return (
    <time dateTime={value}>
      {new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </time>
  );
}

export function StageNavigation() {
  const [stage, setStage] = useState("Launch");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const change = (e) => {
      if (stages.includes(e.detail)) {
        setStage(e.detail);
        setSearch("");
      }
    };
    window.addEventListener("launchstudio:stage", change);
    return () => window.removeEventListener("launchstudio:stage", change);
  }, []);
  const tools = registry.agents.filter(
    (item) =>
      item.category === stage &&
      (item.name + " " + item.description)
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  return (
    <section id="tools" aria-labelledby="tools-title">
      <p className="eyebrow">The growth toolkit</p>
      <h2 id="tools-title">52 specialists. Four stages. Your next move.</h2>
      <p className="muted">
        52 tools across four stages. Project workflows use saved context and
        approved assessment versions.
      </p>
      <nav className="stage-nav" aria-label="Business stages">
        {stages.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={item === stage}
            className="secondary"
            onClick={() => setStage(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <label>
        Search tools
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or purpose"
        />
      </label>
      <p role="status" className="muted">
        {tools.length} {stage} tools shown
      </p>
      <ul className="tool-list">
        {tools.map((tool) => (
          <li key={tool.id}>
            {["YL7LGN8AV2", "RYAET6419X"].includes(tool.id) ? (
              <a href="#workflow">{tool.name}</a>
            ) : (
              <span>{tool.name}</span>
            )}
            <p className="muted">{tool.description}</p>
            <small>
              {["YL7LGN8AV2", "RYAET6419X"].includes(tool.id)
                ? "Available in Q/CUE"
                : tool.id === "SCV7PECQF3"
                  ? "Staging pilot"
                  : "Planned for Q/CUE"}
            </small>
            <details>
              <summary>Requirements & deliverables</summary>
              <p>
                Bring a business goal, audience, constraints, and supporting
                evidence. Review outputs before reuse.
              </p>
              {tool.id === "RYAET6419X" && (
                <p>
                  Requires an approved Idea Validator assessment in this
                  project.
                </p>
              )}
              <p>
                Draft workspaces include structured outputs, prompt starters,
                versioned saving, and an academy sprint. Provider availability
                is separate.
              </p>
              <a
                href="#tool-studio"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("launchstudio:tool", { detail: tool.name }),
                  )
                }
              >
                Open draft workspace
              </a>
            </details>
          </li>
        ))}
      </ul>
      {!tools.length && (
        <EmptyState title="No tools match this search.">
          Try another name, purpose, or stage.
        </EmptyState>
      )}
    </section>
  );
}

export function Activity({ runs, projects, onSelect }) {
  const [projectFilter, setProjectFilter] = useState("");
  const selected = projects.some((p) => p.id === projectFilter)
    ? projectFilter
    : "";
  const visible = runs?.filter((r) => !selected || r.project_id === selected);
  return (
    <section id="activity" aria-labelledby="activity-title">
      <h2 id="activity-title">Recent workflow activity</h2>
      <label className="activity-filter">
        Filter by project
        <select
          value={selected}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All business projects</option>
          {projects.map((p) => (
            <option value={p.id} key={p.id}>
              {projectName(p)}
            </option>
          ))}
        </select>
      </label>
      {runs === null ? (
        <p className="muted">Loading activity…</p>
      ) : !visible.length ? (
        <EmptyState title="A clean timeline.">
          No workflow activity for this selection yet.
        </EmptyState>
      ) : (
        <ul className="activity-list">
          {visible.map((run) => {
            const project = projects.find((item) => item.id === run.project_id);
            return (
              <li key={run.id}>
                <div>
                  <strong>{agentNames[run.agent]}</strong>
                  {project && (
                    <button
                      className="text-button"
                      onClick={() => onSelect(project.id)}
                    >
                      {projectName(project)}
                    </button>
                  )}
                </div>
                <div className="activity-meta">
                  <Badge value={run.status} />
                  <DateLabel value={run.created_at} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ProjectProgress({ view, project }) {
  return (
    <section aria-labelledby="progress-title">
      <p className="eyebrow">Project journey</p>
      <h2 id="progress-title">From idea to next milestone.</h2>
      {!view ? (
        <LoadingSkeleton label="Loading project progress" />
      ) : (
        <>
          <ProjectJourney view={view} />
          {view.progress && (
            <p className="muted">
              Current stage:{" "}
              <strong>
                {
                  {
                    intake: "Intake",
                    validate: "Validation",
                    approve: "Approval",
                    research: "Research",
                    review: "Review",
                  }[view.progress.stage]
                }
              </strong>
            </p>
          )}
          <h3>Completed steps</h3>
          {view.completed.length ? (
            <ul>
              {view.completed.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Completed steps appear when assessments are saved or approved.
            </p>
          )}
          <h3>Outstanding tasks</h3>
          {view.progress?.outstanding_tasks?.length ? (
            <ul>
              {view.progress.outstanding_tasks
                .filter((task) => typeof task === "string")
                .map((task, index) => (
                  <li key={index}>{task}</li>
                ))}
            </ul>
          ) : (
            <p className="muted">No tasks recorded.</p>
          )}
          <NextActionCard>
            {project.status === "active"
              ? view.next
              : "Review the saved project and assessments"}
          </NextActionCard>
        </>
      )}
    </section>
  );
}

export function SavedContext({ business, project, view }) {
  const profile = business.profile ?? {};
  return (
    <section aria-labelledby="context-title">
      <p className="eyebrow">Business context</p>
      <h2 id="context-title">The foundation for every action.</h2>
      <dl>
        <dt>Business</dt>
        <dd>{business.name}</dd>
        {["industry", "audience", "offering", "budget"].map((key) =>
          typeof profile[key] === "string" && profile[key].trim() ? (
            <div key={key}>
              <dt>{key[0].toUpperCase() + key.slice(1)}</dt>
              <dd>{profile[key]}</dd>
            </div>
          ) : null,
        )}
        <dt>Project goal</dt>
        <dd>{project.goal}</dd>
        <dt>Market Intelligence source</dt>
        <dd>
          {!view ? (
            "Loading approved assessment…"
          ) : view.approvedIdea ? (
            <a
              href={`#assessment-${view.approvedIdea.assessment_id}-${view.approvedIdea.version}`}
            >
              Approved Idea Validator · Version {view.approvedIdea.version}
            </a>
          ) : (
            "Approve an Idea Validator version to make it available for Market Intelligence."
          )}
        </dd>
      </dl>
    </section>
  );
}

export function AssessmentLibrary({
  view,
  canApprove,
  busy,
  approve,
  historyControls,
}) {
  return (
    <section id="assessments" aria-labelledby="assessments-title">
      <p className="eyebrow">Approval center</p>
      <h2 id="assessments-title">
        Review the thinking. Approve the next step.
      </h2>
      {view && (
        <p className="muted">
          {view.versions.filter((v) => v.approval_status === "pending").length}{" "}
          pending in loaded versions · All versions retain their approval status
          and source links.
        </p>
      )}
      {!view ? (
        <p className="muted">Loading assessments…</p>
      ) : !view.versions.length ? (
        <EmptyState title="Your assessment library starts here.">
          Saved Idea Validator, Market Intelligence, and Audience DNA versions
          will appear here.
        </EmptyState>
      ) : (
        view.versions.map((version) => {
          const id = `assessment-${version.assessment_id}-${version.version}`;
          const source = view.runById.get(version.run_id);
          return (
            <article className="assessment" id={id} key={id}>
              <h3>
                {agentNames[version.agent]} · Version {version.version}
              </h3>
              <div className="actions">
                <Badge value={version.approval_status} />
                <DateLabel value={version.created_at} />
              </div>
              {version.approved_at && (
                <p className="muted">
                  Approved <DateLabel value={version.approved_at} />
                </p>
              )}
              {["market-intelligence", "audience-dna"].includes(
                version.agent,
              ) && (
                <p>
                  {source?.source_assessment_id ? (
                    <a
                      href={`#assessment-${source.source_assessment_id}-${source.source_assessment_version}`}
                    >
                      Source: Idea Validator version{" "}
                      {source.source_assessment_version}
                    </a>
                  ) : (
                    "No source version is available."
                  )}
                </p>
              )}
              {version.agent === "audience-dna" &&
                source?.market_assessment_id && (
                  <p>
                    <a
                      href={`#assessment-${source.market_assessment_id}-${source.market_assessment_version}`}
                    >
                      Source: Market Intelligence version{" "}
                      {source.market_assessment_version}
                    </a>
                  </p>
                )}
              <details>
                <summary>Read assessment</summary>
                {version.result?.sections &&
                  Object.entries(audienceSections).map(([key, label]) => (
                    <div key={key}>
                      <h4>{label}</h4>
                      <ul>
                        {version.result.sections[key]?.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                {version.result?.markdown ? (
                  <pre>{version.result.markdown}</pre>
                ) : (
                  !version.result?.sections && (
                    <p className="muted">No assessment text is available.</p>
                  )
                )}
              </details>
              {canApprove && version.approval_status === "pending" && (
                <button disabled={busy} onClick={() => approve(version)}>
                  Approve version {version.version}
                </button>
              )}
            </article>
          );
        })
      )}
      {historyControls}
    </section>
  );
}

export function ProjectJourney({ view }) {
  const milestones = [
    [
      "Validate idea",
      Boolean(
        view.summary?.idea ??
          view.versions.find((v) => v.agent === "idea-validator"),
      ),
    ],
    ["Approve evidence", Boolean(view.approvedIdea)],
    [
      "Research market",
      Boolean(
        view.summary?.market ??
          view.versions.find((v) => v.agent === "market-intelligence"),
      ),
    ],
  ];
  const first = milestones.findIndex(([, done]) => !done);
  return (
    <ol className="journey" aria-label="Saved project milestones">
      {milestones.map(([name, done], i) => (
        <li
          key={name}
          data-state={done ? "complete" : i === first ? "current" : "blocked"}
        >
          <span>{done ? <Icon name="check" /> : `0${i + 1}`}</span>
          {name}
          <small>
            {done
              ? "Completed"
              : i === first
                ? "Next milestone"
                : "Waiting on prerequisites"}
          </small>
        </li>
      ))}
    </ol>
  );
}
