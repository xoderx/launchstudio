"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import ToolStudio from "./tool-studio";
import {
  AppShell,
  DashboardMetric,
  EmptyState,
  LoadingSkeleton,
  WorkflowCard,
} from "./app-shell";
import StartHere from "./start-here";
import { joinHistory, loadHistoryPage } from "../lib/history.mjs";
import {
  agentNames,
  loadProject,
  projectView,
  workflowState,
} from "../lib/command-center.mjs";
import {
  Activity,
  AssessmentLibrary,
  Badge,
  ProjectProgress,
  SavedContext,
  StageNavigation,
  projectName,
} from "./command-center";

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export default function Portal() {
  const [client, setClient] = useState(null);
  const [audienceDNA, setAudienceDNA] = useState(false);
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let subscription;
    let active = true;
    fetch("/api/config")
      .then(async (response) => {
        if (!response.ok) throw Error("Staging configuration is unavailable.");
        const { url, publishableKey, audienceDNA } = await response.json();
        if (!active) return;
        const db = createClient(url, publishableKey, {
          auth: { detectSessionInUrl: false },
        });
        subscription = db.auth.onAuthStateChange((_event, current) =>
          setSession(current),
        ).data.subscription;
        setAudienceDNA(audienceDNA === true);
        setClient(db);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      unwrap(
        await client.auth.signInWithPassword({
          email: form.get("email"),
          password: form.get("password"),
        }),
      );
    } catch {
      setMessage(
        "Sign-in failed. Check your staging credentials and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!session && (
        <header className="login-heading">
          <p className="brand">LaunchStudio · Staging</p>
          <h1>Your next chapter starts here.</h1>
          <p className="muted">Sign in to your business growth workspace.</p>
        </header>
      )}
      {!client &&
        (message ? (
          <p className="notice" role="alert">
            {message}
          </p>
        ) : (
          <LoadingSkeleton label="Connecting to staging" />
        ))}
      {client && !session && (
        <form className="login-form" onSubmit={login}>
          <h2>Sign in</h2>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <p role="status">{message}</p>
        </form>
      )}
      {session && (
        <Workspace
          key={session.user.id}
          db={client}
          session={session}
          audienceDNA={audienceDNA}
        />
      )}
    </>
  );
}

function Workspace({ db, session, audienceDNA }) {
  const [businesses, setBusinesses] = useState([]);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [projects, setProjects] = useState([]);
  const [editorBusinessIds, setEditorBusinessIds] = useState([]);
  const [businessId, selectBusiness] = useState("");
  const [projectId, selectProject] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingByProject, setPendingByProject] = useState({});
  const [recent, setRecent] = useState(null);
  const [activityError, setActivityError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const actor = session.user.id;
  const business = businesses.find((item) => item.id === businessId);
  const project = projects.find(
    (item) => item.id === projectId && item.business_id === businessId,
  );
  const canEditProjects =
    business?.owner_id === actor || editorBusinessIds.includes(businessId);

  async function refresh(initial = false) {
    const [owned, available, memberships] = await Promise.all([
      db
        .from("businesses")
        .select("id, owner_id, name, profile")
        .order("created_at"),
      db
        .from("business_projects")
        .select("id, business_id, name, goal, status")
        .order("created_at"),
      db
        .from("business_memberships")
        .select("business_id")
        .eq("user_id", actor)
        .eq("role", "editor"),
    ]);
    const nextBusinesses = unwrap(owned);
    const nextProjects = unwrap(available);
    const nextEditors = unwrap(memberships).map((item) => item.business_id);
    setBusinesses(nextBusinesses);
    setProjects(nextProjects);
    setEditorBusinessIds(nextEditors);
    setWorkspaceError("");
    setWorkspaceLoaded(true);
    if (initial && nextBusinesses.length) {
      const initialBusiness = nextBusinesses[0].id;
      selectBusiness(initialBusiness);
      selectProject(
        nextProjects.find(
          (item) =>
            item.business_id === initialBusiness && item.status === "active",
        )?.id ?? "",
      );
    }
  }
  useEffect(() => {
    refresh(true).catch(() =>
      setWorkspaceError("Could not load your workspace. Reload to try again."),
    );
  }, [db, actor]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    let timer;
    setProjectError("");
    async function load() {
      try {
        const next = await loadProject(db, projectId);
        if (active) {
          setSnapshot(next);
          setPendingByProject((previous) => {
            const pending = previous[projectId];
            return pending &&
              next.requests.some(
                (item) =>
                  item.request_id === pending.requestId &&
                  item.actor_id === actor,
              )
              ? { ...previous, [projectId]: null }
              : previous;
          });
          setProjectError("");
        }
      } catch (error) {
        if (active && error.status === 404) {
          setSnapshot(null);
          setHistory((previous) => ({ ...previous, [projectId]: undefined }));
          setProjectError("This project is unavailable.");
        } else if (active) {
          setProjectError(
            "Project data could not be refreshed. Showing the last available data.",
          );
        }
      } finally {
        if (active) timer = setTimeout(load, 3000);
      }
    }
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [db, projectId]);

  const businessProjects = projects.filter(
    (item) => item.business_id === businessId,
  );
  useEffect(() => {
    if (!businessId || !businessProjects.length) return;
    let active = true;
    let timer;
    const ids = businessProjects.map((item) => item.id);
    async function load() {
      try {
        const runs = unwrap(
          await db
            .from("agent_runs")
            .select("id, project_id, agent, status, created_at")
            .in("project_id", ids)
            .order("created_at", { ascending: false })
            .limit(12),
        );
        if (active) {
          setRecent({
            businessId,
            runs: runs.filter((run) => ids.includes(run.project_id)),
          });
          setActivityError("");
        }
      } catch {
        if (active) setActivityError("Recent activity could not be refreshed.");
      } finally {
        if (active) timer = setTimeout(load, 10000);
      }
    }
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [db, businessId, projects]);

  const scoped = snapshot?.projectId === project?.id ? snapshot : null;
  const pages = scoped && { ...scoped.pages, ...history[projectId] };
  const current =
    scoped &&
    projectView(
      {
        ...scoped,
        audienceDNA,
        pages,
        versions: pages.versions.items,
        runs: pages.runs.items,
      },
      project?.id,
    );
  const pending = pendingByProject[projectId];
  const activeRequest = current?.activeRequest;
  const status =
    activeRequest?.status ?? workflowState(scoped?.runs, pending, actor);
  const waiting = [
    "submitting",
    "unconfirmed",
    "queued",
    "running",
    "unknown",
  ].includes(status);
  const canRun =
    canEditProjects &&
    project?.status === "active" &&
    Boolean(current) &&
    !projectError;

  async function moreHistory(type) {
    const page = pages?.[type];
    if (!page?.next || historyLoading) return;
    const target = projectId;
    setHistoryLoading({ target, type });
    setHistoryError(null);
    try {
      const next = await loadHistoryPage(db, target, type, page.next);
      setHistory((previous) => ({
        ...previous,
        [target]: { ...previous[target], [type]: joinHistory(page, next) },
      }));
    } catch {
      setHistoryError({ target, type });
    } finally {
      setHistoryLoading(null);
    }
  }

  function historyControls(type) {
    const frozen = history[projectId]?.[type];
    const loading =
      historyLoading?.target === projectId && historyLoading.type === type;
    return (
      <div className="actions">
        {historyError?.target === projectId && historyError.type === type && (
          <p role="alert">Could not load older history.</p>
        )}
        {pages?.[type].next && (
          <button
            className="secondary"
            disabled={Boolean(historyLoading)}
            onClick={() => moreHistory(type)}
          >
            {loading
              ? "Loading…"
              : type === "runs"
                ? "Load older runs"
                : "Load older assessments"}
          </button>
        )}
        {frozen && (
          <button
            className="secondary"
            disabled={Boolean(historyLoading)}
            onClick={() =>
              setHistory((previous) => ({
                ...previous,
                [projectId]: Object.fromEntries(
                  Object.entries(previous[projectId]).filter(
                    ([key]) => key !== type,
                  ),
                ),
              }))
            }
          >
            Show newest {type === "runs" ? "runs" : "assessments"}
          </button>
        )}
      </div>
    );
  }

  async function action(callback) {
    setBusy(true);
    setMessage("");
    try {
      await callback();
    } catch {
      setMessage(
        "The action could not be completed. Check your access and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function saveBusiness(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    action(async () => {
      const values = {
        name: data.get("name"),
        profile: {
          ...business?.profile,
          industry: data.get("industry"),
          audience: data.get("audience"),
          offering: data.get("offering"),
        },
      };
      if (business) {
        unwrap(
          await db
            .from("businesses")
            .update(values)
            .eq("id", business.id)
            .select("id")
            .single(),
        );
      } else {
        const profile = unwrap(
          await db
            .from("customer_profiles")
            .select("user_id")
            .eq("user_id", actor)
            .maybeSingle(),
        );
        if (!profile) {
          unwrap(
            await db.from("customer_profiles").insert({
              user_id: actor,
              display_name: data.get("displayName"),
            }),
          );
        }
        const created = unwrap(
          await db
            .from("businesses")
            .insert({ ...values, owner_id: actor })
            .select("id")
            .single(),
        );
        selectBusiness(created.id);
      }
      await refresh();
      setMessage("Business profile saved.");
    });
  }
  function saveProject(event, target) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const name = fields.get("name").trim();
    const goal = fields.get("goal").trim();
    if (!name || !goal) {
      setMessage("Enter a project name and goal.");
      return;
    }
    action(async () => {
      const table = db.from("business_projects");
      const query = target
        ? table
            .update({ name, goal })
            .eq("id", target.id)
            .eq("business_id", businessId)
        : table.insert({ business_id: businessId, name, goal });
      const saved = unwrap(await query.select("id").single());
      await refresh();
      selectProject(saved.id);
      if (!target) form.reset();
      setMessage(target ? "Project updated." : "Project created.");
    });
  }
  function runAgent(agent, recover) {
    if (!canRun || busy || (waiting && !recover)) return;
    const input = recover
      ? {
          projectId,
          agent,
          requestId: recover.request_id,
          operation: "reconcile",
        }
      : { projectId, agent, requestId: crypto.randomUUID() };
    const mark = (status) =>
      setPendingByProject((previous) => ({
        ...previous,
        [input.projectId]: status ? { ...input, status } : null,
      }));
    mark("submitting");
    action(async () => {
      try {
        const response = await fetch("/api/workflow", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(input),
        });
        if (response.ok) {
          mark(recover ? null : "queued");
        } else if (response.status >= 500) {
          mark("unconfirmed");
        } else {
          mark(null);
          setMessage(
            "The workflow request was declined. Check project access and prerequisites.",
          );
        }
      } catch {
        mark("unconfirmed");
      }
    });
  }

  function approve(version) {
    action(async () => {
      const rpc =
        version.agent === "idea-validator"
          ? "approve_idea_assessment"
          : "approve_targeting_assessment";
      unwrap(
        await db.rpc(rpc, {
          target: version.assessment_id,
          target_version: version.version,
        }),
      );
      setMessage("Assessment approved.");
    });
  }

  function changeBusiness(id) {
    selectBusiness(id);
    selectProject(
      projects.find(
        (item) => item.business_id === id && item.status === "active",
      )?.id ?? "",
    );
    setActivityError("");
    setMessage("");
  }

  return (
    <AppShell
      businesses={businesses}
      businessId={businessId}
      onBusinessChange={changeBusiness}
      onProjectSelect={selectProject}
      projects={businessProjects}
      view={current}
      email={session.user.email}
      busy={busy}
      signOut={() => action(async () => unwrap(await db.auth.signOut()))}
      startHere={
        <StartHere
          business={business}
          project={project}
          view={current}
          displayName={null}
        />
      }
    >
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="hero">
        <div>
          <p className="brand">LaunchStudio · Staging</p>
          <h1>Q/CUE Command Center</h1>
          <p className="muted">
            Track projects, review assessments, and see what comes next.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => action(async () => unwrap(await db.auth.signOut()))}
          disabled={busy}
        >
          Sign out
        </button>
      </header>
      <nav className="section-nav legacy-nav" aria-label="Command center">
        <a href="#workspace">Workspace</a>
        {project && (
          <>
            <a href="#workflow">Workflows</a>
            <a href="#assessments">Assessments</a>
          </>
        )}
        {business && <a href="#activity">Recent activity</a>}
        <a href="#tools">Tool roadmap</a>
        <a href="#tool-studio">Tools and academy</a>
      </nav>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {workspaceError && (
        <p className="notice" role="alert">
          {workspaceError}
        </p>
      )}
      <div className="metric-grid" aria-label="Workspace overview">
        <DashboardMetric
          label="Active projects"
          value={
            workspaceLoaded
              ? businessProjects.filter((p) => p.status === "active").length
              : null
          }
          detail="Current business"
        />
        <DashboardMetric
          label="Pending approvals"
          value={
            current
              ? current.versions.filter((v) => v.approval_status === "pending")
                  .length
              : null
          }
          detail="Loaded assessment versions"
        />
        <DashboardMetric
          label="Successful workflows"
          value={
            recent?.businessId === businessId
              ? recent.runs.filter((r) => r.status === "succeeded").length
              : null
          }
          detail="Among 12 most recent business runs"
        />
        <DashboardMetric
          label="Failed workflows"
          value={
            recent?.businessId === businessId
              ? recent.runs.filter((r) => r.status === "failed").length
              : null
          }
          detail="Among 12 most recent business runs"
        />
      </div>
      {project && (
        <>
          <div className="project-heading">
            <div>
              <p className="brand">Selected project</p>
              <h2>{projectName(project)}</h2>
            </div>
            <Badge value={project.status} />
          </div>
          {projectError && (
            <p className="notice" role="alert">
              {projectError}
            </p>
          )}
          <div className="dashboard-grid">
            <ProjectProgress view={current} project={project} />
            <SavedContext
              business={business}
              project={project}
              view={current}
            />
          </div>
        </>
      )}
      <section id="workspace" aria-labelledby="workspace-title">
        <h2 id="workspace-title">{business?.name ?? "Business workspace"}</h2>
        <label>
          Current business
          <select
            value={businessId}
            onChange={(event) => changeBusiness(event.target.value)}
          >
            <option value="">New business</option>
            {businesses.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {!business && !workspaceError && (
          <p className="muted">
            Select a business or save a business profile to get started.
          </p>
        )}
        {business && (
          <>
            <h3>
              Projects{" "}
              <span className="muted">
                ·{" "}
                {
                  businessProjects.filter((item) => item.status === "active")
                    .length
                }{" "}
                active
              </span>
            </h3>
            {businessProjects.length ? (
              <ul className="project-list">
                {businessProjects.map((item) => (
                  <li key={item.id}>
                    <button
                      aria-pressed={item.id === projectId}
                      className="secondary"
                      onClick={() => selectProject(item.id)}
                    >
                      <span>{projectName(item)}</span>
                      <Badge value={item.status} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                No projects yet. Create one with a name and a goal.
              </p>
            )}
          </>
        )}
      </section>
      <details
        id="business-settings"
        className="settings"
        open={business ? undefined : true}
      >
        <summary>Business profile</summary>
        <form key={businessId} onSubmit={saveBusiness}>
          {!business && (
            <label>
              Your display name
              <input name="displayName" required maxLength={120} />
            </label>
          )}
          <label>
            Business name
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={business?.name}
            />
          </label>
          <label>
            Industry
            <input name="industry" defaultValue={business?.profile.industry} />
          </label>
          <label>
            Audience
            <input name="audience" defaultValue={business?.profile.audience} />
          </label>
          <label>
            Offering
            <textarea
              name="offering"
              defaultValue={business?.profile.offering}
            />
          </label>
          <button disabled={busy}>Save business profile</button>
        </form>
      </details>
      {business && canEditProjects && (
        <details className="settings">
          <summary>Manage projects</summary>
          {canEditProjects && (
            <form onSubmit={(event) => saveProject(event)}>
              <label>
                Project Name
                <input name="name" required maxLength={160} />
              </label>
              <label>
                Project Goal
                <textarea name="goal" required maxLength={2000} />
              </label>
              <button disabled={busy}>Create project</button>
            </form>
          )}
          {project && canEditProjects && (
            <form
              key={project.id}
              onSubmit={(event) => saveProject(event, project)}
            >
              <h3>Edit project</h3>
              <label>
                Project Name
                <input
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={project.name}
                />
              </label>
              <label>
                Project Goal
                <textarea
                  name="goal"
                  required
                  maxLength={2000}
                  defaultValue={project.goal}
                />
              </label>
              <button disabled={busy}>Save project changes</button>
            </form>
          )}
        </details>
      )}
      {project && (
        <>
          <section id="workflow" aria-labelledby="workflow-title">
            <h2 id="workflow-title">Workflow execution</h2>
            <div className="workflow-grid">
              <WorkflowCard
                title="Idea Validator"
                description="Validate your idea and save a versioned assessment."
              >
                <button
                  disabled={!canRun || busy || waiting}
                  onClick={() => runAgent("idea-validator")}
                >
                  Run Idea Validator
                </button>
              </WorkflowCard>
              <WorkflowCard
                title="Market Intelligence"
                description="Build on the exact approved Idea Validator version."
              >
                <button
                  disabled={
                    !canRun || busy || waiting || !current?.approvedIdea
                  }
                  onClick={() => runAgent("market-intelligence")}
                >
                  Run Market Intelligence
                </button>
              </WorkflowCard>
              <WorkflowCard
                title="Audience DNA Builder"
                description="Requires approved market evidence and staging pilot access."
              >
                <button
                  disabled={
                    !audienceDNA ||
                    !canRun ||
                    busy ||
                    waiting ||
                    !current?.approvedMarket
                  }
                  onClick={() => runAgent("audience-dna")}
                >
                  Run Audience DNA Builder
                </button>
              </WorkflowCard>
            </div>
            {!current?.approvedIdea && current && (
              <p className="muted">
                Market Intelligence requires an approved Idea Validator version.
              </p>
            )}
            {!audienceDNA && (
              <p className="muted">
                Audience DNA execution is pending staging provider verification.
              </p>
            )}
            {audienceDNA && current && !current.approvedMarket && (
              <p className="muted">
                Audience DNA requires an approved Market Intelligence version
                linked to approved Idea Validator evidence.
              </p>
            )}
            <div role="status">
              {status !== "idle" && (
                <p>
                  <Badge value={status} />{" "}
                  {agentNames[activeRequest?.agent ?? pending?.agent]}
                </p>
              )}
              {status === "unknown" && (
                <p>
                  {activeRequest?.can_reconcile
                    ? "Check the existing provider submission to recover its result."
                    : "No provider acknowledgment was saved. Contact support before starting another run."}
                </p>
              )}
              {status === "unconfirmed" && (
                <p>
                  LaunchStudio could not confirm the request. Watch the run
                  history and verify the previous request before starting
                  another.
                </p>
              )}
            </div>
            {status === "unknown" &&
              activeRequest?.can_reconcile &&
              activeRequest.actor_id === actor && (
                <button
                  className="secondary"
                  disabled={!canRun || busy || Boolean(pending)}
                  onClick={() => runAgent(activeRequest.agent, activeRequest)}
                >
                  Check existing submission
                </button>
              )}
            {current?.requests.length > 0 && (
              <details>
                <summary>Request history</summary>
                <ul className="activity-list">
                  {current.requests.map((item) => (
                    <li key={item.request_id}>
                      <span>{agentNames[item.agent]}</span>
                      <div className="activity-meta">
                        <Badge value={item.status} />
                        <time dateTime={item.created_at}>
                          {new Date(item.created_at).toLocaleString()}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {!waiting && current?.runs[0]?.status === "failed" && (
              <p className="notice">
                The latest run failed. Confirm the prior submission ended before
                starting a new run. If its outcome is unclear, contact support.
              </p>
            )}
            {current?.runs.length ? (
              <ul className="activity-list">
                {current.runs.map((run) => {
                  const request = current.requests.find(
                    (item) =>
                      item.request_id === run.request_id &&
                      item.actor_id === run.actor_id &&
                      item.agent === run.agent,
                  );
                  return (
                    <li key={run.id}>
                      <span>{agentNames[run.agent]}</span>
                      <div className="activity-meta">
                        <Badge
                          value={
                            run.status === "succeeded"
                              ? run.status
                              : (request?.status ?? run.status)
                          }
                        />
                        <time dateTime={run.created_at}>
                          {new Date(run.created_at).toLocaleString()}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              current && <p className="muted">No runs for this project yet.</p>
            )}
            {historyControls("runs")}
          </section>
          <AssessmentLibrary
            view={current}
            canApprove={canRun}
            busy={busy}
            approve={approve}
            historyControls={historyControls("versions")}
          />
        </>
      )}
      {business && (
        <>
          {activityError && (
            <p className="notice" role="alert">
              {activityError}
            </p>
          )}
          <Activity
            runs={
              !businessProjects.length
                ? []
                : recent?.businessId === businessId
                  ? recent.runs
                  : null
            }
            projects={businessProjects}
            onSelect={(id) => {
              selectProject(id);
              document.getElementById("workspace")?.scrollIntoView();
            }}
          />
        </>
      )}
      {!project && (
        <EmptyState title="One project. A clear path forward.">
          Select or create a project to view its journey, approvals, workflows,
          and saved assessments.
        </EmptyState>
      )}
      <StageNavigation />
      <ToolStudio
        db={db}
        project={project}
        business={business}
        view={current}
        canEdit={canEditProjects && project?.status === "active"}
        audienceEnabled={audienceDNA}
      />
    </AppShell>
  );
}
