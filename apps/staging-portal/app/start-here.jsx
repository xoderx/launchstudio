"use client";
import { useState } from "react";
import Icon from "./icons";
import { EmptyState, NextActionCard } from "./app-shell";
import { Badge, projectName } from "./command-center";
import registry from "../../../catalog/agent-registry.json";
import playbooks from "../../../catalog/flagship-playbooks.json";
const portal = "https://studio.pickaxe.co/STUDIOSAG26QENFZXNY0957VNT/launch/";
const models = [
  ["GPT", "KOEJIMYFST7VPG7"],
  ["Claude", "5X40O6LNOBFUY32"],
  ["Gemini", "ZF678T7OGE9A0TH"],
  ["Grok", "R02X6IY3A0918M3"],
];
const stages = ["Launch", "Grow", "Monetize", "Scale"];
const goals = [
  "Launch my business",
  "Get my first customers",
  "Generate 20 qualified leads",
  "Increase monthly revenue",
  "Automate repetitive work",
];
export function ToolCard({ tool }) {
  return (
    <article className="tool-card">
      <div className="card-top">
        <span className="tool-symbol">
          <Icon name="compass" />
        </span>
        <span className="badge">{tool.category}</span>
      </div>
      <h3>{tool.name}</h3>
      <p className="muted">{tool.description}</p>
      <a
        href="#tool-studio"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("launchstudio:tool", { detail: tool.name }),
          )
        }
      >
        Open tool workspace <Icon name="arrow" />
      </a>
    </article>
  );
}
export function StageSelector({ stage, onChange }) {
  return (
    <div className="stage-selector" role="group" aria-label="Business stage">
      {stages.map((s, i) => (
        <button
          type="button"
          className="secondary"
          key={s}
          aria-pressed={s === stage}
          onClick={() => onChange(s)}
        >
          <small>0{i + 1}</small>
          <span>
            {s}
            <small>
              {
                [
                  "Find your foundation",
                  "Build your audience",
                  "Unlock your revenue",
                  "Multiply your impact",
                ][i]
              }
            </small>
          </span>
          <Icon name="arrow" />
        </button>
      ))}
    </div>
  );
}
export default function StartHere({ business, project, view, displayName }) {
  const [goal, setGoal] = useState(""),
    [stage, setStage] = useState("Launch"),
    [recommendation, setRecommendation] = useState(null);
  const tools = registry.agents.filter(
    (t) => t.position >= 1 && t.position <= 52,
  );
  function navigate(e) {
    e.preventDefault();
    const q = goal.toLowerCase();
    const groups = [
      ["CoVibeCoder", /app|website|software|code|integration|ai agent/],
      ["Scale", /automat|system|delegat|operat|scale/],
      ["Grow", /customer|market|sales|lead|content|traffic|outreach/],
      ["Monetize", /revenue|profit|pric|monetiz|income|offer/],
    ];
    const category = (groups.find((g) => g[1].test(q)) || ["Launch"])[0];
    setRecommendation(category);
    if (stages.includes(category)) setStage(category);
  }
  const suggestions = tools.filter((t) => t.category === stage).slice(0, 3);
  return (
    <div id="start-here" className="launchpad">
      <div className="page-heading">
        <p className="eyebrow">
          {business ? business.name : "YOUR BUSINESS GROWTH WORKSPACE"}
        </p>
        <h1>
          {displayName
            ? `Welcome back, ${displayName}.`
            : "Welcome to your next chapter."}
        </h1>
        <p className="muted">
          Your next business breakthrough starts with one focused move.
        </p>
      </div>
      <section
        id="navigator"
        className="navigator-card"
        aria-labelledby="navigator-title"
      >
        <div className="card-top">
          <span className="navigator-symbol">
            <Icon name="compass" />
          </span>
          <span className="badge">YOUR NEXT MOVE</span>
        </div>
        <h2 id="navigator-title">Big ambition. Clear direction.</h2>
        <p className="muted">
          Tell Business Navigator what you want to achieve. Find the tools to
          turn it into action.
        </p>
        <div className="goal-chips" aria-label="Goal starters">
          {goals.map((g) => (
            <button
              key={g}
              type="button"
              className="secondary"
              onClick={() => {
                setGoal(g);
                document.getElementById("navigator-goal")?.focus();
              }}
            >
              {g} <Icon name="arrow" />
            </button>
          ))}
        </div>
        <form onSubmit={navigate}>
          <label htmlFor="navigator-goal">What are you working toward?</label>
          <div className="navigator-input">
            <textarea
              id="navigator-goal"
              required
              maxLength={1000}
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="For example, I need 20 new customers."
            />
            <button>
              Find my next move <Icon name="arrow" />
            </button>
          </div>
          <small>Goal matching · Review every output before acting</small>
        </form>
        <div role="status" aria-live="polite">
          {recommendation && (
            <div className="navigator-result">
              <h3>Start with {recommendation}</h3>
              <p>
                Rule-based recommendation.{" "}
                {recommendation === "CoVibeCoder"
                  ? "Use the existing build commander to plan your next step."
                  : "Explore tools in this stage, review their requirements, and choose one measurable action."}
              </p>
              {recommendation === "CoVibeCoder" ? (
                <a
                  href={portal + "launchstudio-covibecoder"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open CoVibeCoder (new tab)
                </a>
              ) : (
                <a
                  href="#tools"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("launchstudio:stage", {
                        detail: recommendation,
                      }),
                    )
                  }
                >
                  Explore {recommendation} tools <Icon name="arrow" />
                </a>
              )}
            </div>
          )}
        </div>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Choose your focus</p>
          <h2>Every stage. A way forward.</h2>
        </div>
        <a href="#tools">
          Explore the toolkit <Icon name="arrow" />
        </a>
      </div>
      <StageSelector stage={stage} onChange={setStage} />
      <section id="continue-working" className="plain-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Continue working</p>
            <h2>Make room for momentum.</h2>
          </div>
          <a href="#workspace">
            View projects <Icon name="arrow" />
          </a>
        </div>
        {project ? (
          <article className="sprint-card">
            <span className="sprint-symbol">
              <Icon name="rocket" />
            </span>
            <div>
              <Badge value={project.status} />
              <h3>{projectName(project)}</h3>
              <p className="muted">{project.goal}</p>
              {view && <NextActionCard>{view.next}</NextActionCard>}
            </div>
            <a href="#qcue" className="button-link secondary">
              Continue project <Icon name="arrow" />
            </a>
          </article>
        ) : (
          <EmptyState title="A fresh start for your next big idea.">
            Choose or create a project in Q/CUE to continue working with saved
            business context.
          </EmptyState>
        )}
      </section>
      <section className="plain-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tools to explore · {stage}</p>
            <h2>Find a focused starting point.</h2>
          </div>
          <a href="#tools">
            View all 52 tools <Icon name="arrow" />
          </a>
        </div>
        <div className="tool-card-grid">
          {suggestions.map((t) => (
            <ToolCard tool={t} key={t.id} />
          ))}
        </div>
      </section>
      <div className="launchpad-pair">
        <section id="ai-workspace">
          <p className="eyebrow">Think · Create · Solve</p>
          <h2>Your AI Workspace</h2>
          <p className="muted">
            Universal AI chooses a model for your task. Or bring your own
            preference.
          </p>
          <a
            className="button-link"
            href={portal + "ZEHJ2MG2K4Z022Y"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Universal AI <Icon name="arrow" />
            <span className="sr-only">(new tab)</span>
          </a>
          <h3>Choose an individual model</h3>
          <div className="model-links">
            {models.map(([name, id]) => (
              <a
                href={portal + id}
                key={id}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Chat with ${name} (new tab)`}
              >
                {name}
              </a>
            ))}
          </div>
        </section>
        <section id="recipes">
          <p className="eyebrow">From goal to execution</p>
          <h2>Outcome Recipes</h2>
          <p className="muted">
            Describe a problem and get a recipe with steps, tools, and a way to
            measure progress.
          </p>
          <a
            className="button-link secondary"
            href={portal + "I1JQOXIQ0UEKLP3"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Outcome Recipes <Icon name="arrow" />
            <span className="sr-only">(new tab)</span>
          </a>
          <details>
            <summary>Explore guided playbooks</summary>
            {playbooks.map((p) => (
              <div key={p.name}>
                <h3>{p.name}</h3>
                <p>{p.objective}</p>
                <a href="#tool-studio">View tools and sprint instructions</a>
              </div>
            ))}
          </details>
        </section>
      </div>
      <section id="recent-deliverables" className="plain-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent deliverables · Selected project</p>
            <h2>Your work, ready for what’s next.</h2>
          </div>
          <a href="#assessments">
            View assessments <Icon name="arrow" />
          </a>
        </div>
        {view?.versions.length ? (
          <div className="tool-card-grid">
            {view.versions.slice(0, 3).map((v) => (
              <article key={`${v.assessment_id}:${v.version}`}>
                <Badge value={v.approval_status} />
                <h3>
                  {v.agent.replaceAll("-", " ")} · Version {v.version}
                </h3>
                <p className="muted">
                  {new Date(v.created_at).toLocaleDateString()}
                </p>
                <a href={`#assessment-${v.assessment_id}-${v.version}`}>
                  Review saved assessment <Icon name="arrow" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Keep your best thinking close.">
            {project
              ? "Saved assessment versions will appear here when available."
              : "Select a project to see its saved assessments."}
          </EmptyState>
        )}
      </section>
    </div>
  );
}
