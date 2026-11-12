"use client";
import { Component, useEffect, useRef, useState } from "react";
import Icon from "./icons";
import registry from "../../../catalog/agent-registry.json";
const projectName = (p) => (p.name === "Untitled project" ? p.goal : p.name);

const destinations = [
  ["Overview", "qcue", "grid"],
  ["Start Here", "start-here", "compass"],
  ["AI Workspace", "ai-workspace", "spark"],
  ["Projects", "workspace", "folder"],
  ["Workflows", "workflow", "workflow"],
  ["Assessments", "assessments", "check"],
  ["52 Tools", "tools", "grid"],
  ["CoVibeCoder", "covibecoder", "workflow"],
  ["Growth Sprints", "tool-studio", "rocket"],
  ["Activity", "activity", "activity"],
  ["Settings", "account-settings", "settings"],
];
const startSections = new Set([
  "start-here",
  "navigator",
  "ai-workspace",
  "recipes",
  "continue-working",
  "recent-deliverables",
]);
export function EmptyState({ title, children, icon = "folder" }) {
  return (
    <div className="empty-state">
      <Icon name={icon} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function LoadingSkeleton({ label = "Loading workspace" }) {
  return (
    <div className="loading-skeleton" role="status" aria-label={label}>
      <span />
      <span />
      <span />
      <span className="sr-only">{label}…</span>
    </div>
  );
}
export class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="error-panel" role="alert">
        <h2>This view could not be displayed.</h2>
        <p>Reload to retrieve the latest saved workspace.</p>
        <button onClick={() => window.location.reload()}>
          Reload workspace
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function DashboardMetric({ label, value, detail }) {
  return (
    <div className="dashboard-metric">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function WorkflowCard({ title, description, children }) {
  return (
    <article className="workflow-card">
      <Icon name="workflow" />
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {children}
    </article>
  );
}
export function NextActionCard({ children }) {
  return (
    <div className="next-action">
      <Icon name="compass" />
      <div>
        <small>NEXT RECOMMENDED ACTION</small>
        <p>{children}</p>
      </div>
    </div>
  );
}
export function AppShell({
  businesses = [],
  businessId = "",
  onBusinessChange,
  onProjectSelect,
  projects = [],
  view,
  children,
  startHere,
  email,
  signOut,
  busy,
}) {
  const [route, setRoute] = useState("start-here"),
    [collapsed, setCollapsed] = useState(false),
    [navOpen, setNavOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [theme, setTheme] = useState("dark"),
    [query, setQuery] = useState("");
  const palette = useRef(null),
    assistant = useRef(null),
    sidebar = useRef(null),
    menuButton = useRef(null),
    searchButton = useRef(null),
    assistantButton = useRef(null);
  useEffect(() => {
    const media = matchMedia("(max-width:800px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setNavOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("launchstudio-theme");
      if (saved === "light") setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("launchstudio-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    const update = () => {
      setRoute(location.hash.slice(1) || "start-here");
      setNavOpen(false);
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const keyboard = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!palette.current.open && !assistant.current.open) {
          setQuery("");
          palette.current.showModal();
        }
      }
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (navOpen) sidebar.current.querySelector("a").focus();
  }, [navOpen]);
  useEffect(() => {
    const timer = requestAnimationFrame(() =>
      document.getElementById(route)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(timer);
  }, [route]);
  const isStart = startSections.has(route),
    business = businesses.find((b) => b.id === businessId),
    label =
      destinations.find((d) => d[1] === route)?.[0] ||
      (isStart ? "Start Here" : "Q/CUE");
  const entries = [
    ...destinations.map(([name, id]) => ({
      name,
      href: "#" + id,
      type: "Page",
    })),
    ...projects.map((p) => ({
      name: projectName(p),
      href: "#workspace",
      projectId: p.id,
      type: "Saved project",
    })),
    ...(view?.versions ?? []).map((v) => ({
      name: `${v.agent} · Version ${v.version}`,
      href: `#assessment-${v.assessment_id}-${v.version}`,
      type: "Saved assessment",
    })),
    ...registry.agents
      .filter((t) => t.position >= 1 && t.position <= 52)
      .map((t) => ({
        name: t.name,
        href: "#tool-studio",
        tool: t.name,
        type: t.showLink ? "Portal tool" : "Provider preview",
      })),
  ].filter((x) =>
    (x.name + " " + x.type).toLowerCase().includes(query.toLowerCase().trim()),
  );
  function navigateTool(name) {
    window.dispatchEvent(
      new CustomEvent("launchstudio:tool", { detail: name }),
    );
  }
  function closeNavigation() {
    setNavOpen(false);
    menuButton.current?.focus();
  }
  function navClick() {
    if (navOpen) closeNavigation();
  }
  return (
    <div
      className={`app-shell ${collapsed ? "nav-collapsed" : ""} ${navOpen ? "nav-open" : ""}`}
    >
      <a className="skip-link" href={isStart ? "#start-here" : "#qcue"}>
        Skip to content
      </a>
      {navOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={closeNavigation}
        />
      )}
      <aside
        ref={sidebar}
        className="app-sidebar"
        aria-label="Workspace navigation"
        onKeyDown={(e) => {
          if (e.key !== "Tab" || !navOpen) return;
          const items = [
            ...sidebar.current.querySelectorAll("a,button,select"),
          ].filter((n) => !n.disabled);
          const first = items[0],
            last = items.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <a
          className="app-brand"
          href="#start-here"
          onClick={navClick}
          aria-label="LaunchStudio Start Here"
        >
          <span className="brand-mark">
            <Icon name="rocket" />
          </span>
          <span>
            Launch<span>Studio</span>
            <small>BUSINESS GROWTH OS</small>
          </span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">
            {(business?.name ?? "LS").slice(0, 2).toUpperCase()}
          </span>
          <label>
            <span>Current business</span>
            <select
              aria-label="Switch workspace business"
              value={businessId}
              onChange={(e) => onBusinessChange?.(e.target.value)}
              disabled={!onBusinessChange}
            >
              <option value="">
                {onBusinessChange ? "New business" : "Sign in to connect"}
              </option>
              {businesses.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {destinations.map(([name, id, icon]) => (
            <a
              href={"#" + id}
              key={id}
              title={collapsed ? name : undefined}
              aria-label={name}
              aria-current={route === id ? "page" : undefined}
              onClick={navClick}
            >
              <Icon name={icon} />
              <span>{name}</span>
              {route === id && <i />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <Icon name="spark" />
            <strong>One goal. Real momentum.</strong>
            <p>Find your next move with Business Navigator.</p>
            <a href="#navigator" onClick={navClick}>
              Find my next move <Icon name="arrow" />
            </a>
          </div>
          <a
            className="profile-link"
            href="#account-settings"
            onClick={navClick}
          >
            <span className="workspace-avatar">
              <Icon name="settings" />
            </span>
            <span>
              Account & preferences<small>{email ?? "Staging workspace"}</small>
            </span>
          </a>
        </div>
      </aside>
      <header className="app-topbar" inert={navOpen ? true : undefined}>
        <div>
          <button
            ref={menuButton}
            className="icon-button nav-toggle"
            aria-label="Toggle navigation"
            aria-expanded={mobile ? navOpen : !collapsed}
            onClick={() => {
              if (matchMedia("(max-width:800px)").matches) setNavOpen(!navOpen);
              else setCollapsed(!collapsed);
            }}
          >
            <Icon name="panel" />
          </button>
          <span className="breadcrumb">
            Workspace <span>/</span> <strong>{label}</strong>
          </span>
        </div>
        <div>
          <button
            ref={searchButton}
            className="search-trigger"
            aria-label="Search workspace"
            onClick={() => {
              setQuery("");
              palette.current.showModal();
            }}
          >
            <Icon name="search" />
            <span>Search your workspace</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="icon-button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Icon name="sun" />
          </button>
          <button
            ref={assistantButton}
            className="assistant-trigger"
            aria-label="Open Q/CUE assistant"
            onClick={() => assistant.current.showModal()}
          >
            <Icon name="spark" />
            <span>Q/CUE</span>
          </button>
        </div>
      </header>
      <div className="app-canvas" inert={navOpen ? true : undefined}>
        <ErrorBoundary>
          <div hidden={!isStart}>{startHere}</div>
          <div hidden={isStart} id="qcue">
            {children}
            <section id="account-settings">
              <p className="eyebrow">Account & preferences</p>
              <h2>Your workspace, your way.</h2>
              <p className="muted">
                {email ?? "Sign in to manage your workspace."}
              </p>
              <button
                className="secondary"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                Switch to {theme === "dark" ? "light" : "dark"} theme
              </button>
              {signOut && (
                <button className="secondary" disabled={busy} onClick={signOut}>
                  Sign out
                </button>
              )}
            </section>
          </div>
        </ErrorBoundary>
      </div>
      <nav
        className="mobile-bottom"
        aria-label="Core navigation"
        inert={navOpen ? true : undefined}
      >
        {[
          ["start-here", "compass", "Start"],
          ["ai-workspace", "spark", "AI"],
          ["qcue", "grid", "Q/CUE"],
          ["tools", "grid", "Tools"],
        ].map(([id, icon, name]) => (
          <a
            href={"#" + id}
            key={id}
            aria-current={route === id ? "page" : undefined}
          >
            <Icon name={icon} />
            {name}
          </a>
        ))}
      </nav>
      <dialog
        ref={palette}
        className="command-palette"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            palette.current.close();
          }
        }}
        aria-labelledby="command-title"
        onClose={() => searchButton.current?.focus()}
      >
        <div className="dialog-heading">
          <h2 id="command-title">Find your next move</h2>
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => palette.current.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <label htmlFor="command-search">
          Search tools, projects, assessments, and pages
        </label>
        <input
          autoFocus
          id="command-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try Idea Validator or a project name"
        />
        <p className="muted" role="status">
          {entries.length
            ? `${entries.length} results`
            : "No matches. Try another name."}
        </p>
        <div className="command-results">
          {entries.map((e, i) => (
            <a
              href={e.href}
              key={e.type + ":" + i}
              onClick={() => {
                if (e.tool) navigateTool(e.tool);
                if (e.projectId) onProjectSelect?.(e.projectId);
                palette.current.close();
              }}
            >
              <span>{e.name}</span>
              <small>{e.type}</small>
            </a>
          ))}
        </div>
        <small>Tab to a result · Enter to open · Esc to close</small>
      </dialog>
      <dialog
        ref={assistant}
        className="assistant-drawer"
        aria-labelledby="assistant-title"
        onClose={() => assistantButton.current?.focus()}
      >
        <div className="dialog-heading">
          <h2 id="assistant-title">
            <Icon name="spark" /> Q/CUE
          </h2>
          <button
            className="icon-button"
            aria-label="Close assistant"
            onClick={() => assistant.current.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <span className="badge">Saved project context</span>
        <h3>A little clarity goes a long way.</h3>
        <p className="muted">
          {view?.next ??
            "Select a business and project to see your next recommended action."}
        </p>
        <p className="muted">
          Recommendations here follow saved workflow prerequisites.
        </p>
        <a
          className="button-link"
          href="#workflow"
          onClick={() => assistant.current.close()}
        >
          Open workflow controls <Icon name="arrow" />
        </a>
        <a href="#ai-workspace" onClick={() => assistant.current.close()}>
          Open AI Workspace
        </a>
      </dialog>
    </div>
  );
}
