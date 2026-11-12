// Browser-only synthetic responses. This file is never imported by the application.
export const actor = "11111111-1111-4111-8111-111111111111";
export const businessId = "22222222-2222-4222-8222-222222222222";
export const projectId = "33333333-3333-4333-8333-333333333333";
const created_at = "2026-11-11T17:00:00.000Z";
export const fixture = {
  businesses: [
    {
      id: businessId,
      owner_id: actor,
      name: "Example Studio · Test data",
      profile: {
        industry: "Design services",
        audience: "Independent founders",
        offering: "Brand strategy and design",
      },
    },
    {
      id: "other-business",
      owner_id: actor,
      name: "Second test business",
      profile: {},
    },
  ],
  business_projects: [
    {
      id: projectId,
      business_id: businessId,
      name: "Validate the studio offer",
      goal: "Test a focused brand strategy offer with five founders.",
      status: "active",
    },
    {
      id: "empty-project",
      business_id: businessId,
      name: "New test project",
      goal: "Define the next experiment.",
      status: "active",
    },
  ],
  business_memberships: [],
  assessment_versions: [
    {
      project_id: projectId,
      assessment_id: "44444444-4444-4444-8444-444444444444",
      run_id: "55555555-5555-4555-8555-555555555555",
      agent: "idea-validator",
      version: 1,
      result: {
        markdown:
          "Synthetic assessment for visual regression testing. Interview five founders before expanding the offer.",
      },
      approval_status: "pending",
      approved_at: null,
      created_at,
    },
  ],
  agent_runs: [
    {
      project_id: projectId,
      id: "55555555-5555-4555-8555-555555555555",
      actor_id: actor,
      request_id: "66666666-6666-4666-8666-666666666666",
      agent: "idea-validator",
      status: "succeeded",
      created_at,
    },
  ],
  workflow_progress: [
    {
      project_id: projectId,
      stage: "approve",
      next_agent: "market-intelligence",
      outstanding_tasks: ["Review and approve the Idea Validator assessment"],
    },
  ],
  workflow_requests: [],
  tool_deliverables: [],
};
export async function mockWorkspace(page) {
  await page.route("**/api/config", (r) =>
    r.fulfill({
      json: {
        url: "https://exghrllltefuhsgnagym.supabase.co",
        publishableKey: "sb_publishable_synthetic_ui_test",
        audienceDNA: false,
      },
    }),
  );
  await page.route(
    "https://exghrllltefuhsgnagym.supabase.co/**",
    async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname;
      if (path.includes("/auth/v1/token")) {
        const user = {
          id: actor,
          email: "visual-test@example.invalid",
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at,
        };
        return route.fulfill({
          json: {
            access_token: "synthetic-browser-test-token",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: "synthetic-refresh-token",
            user,
          },
        });
      }
      if (request.method() !== "GET")
        return route.fulfill({
          status: 400,
          json: {
            message: "Synthetic visual fixture does not execute actions",
          },
        });
      const table = path.split("/").at(-1);
      let rows = [...(fixture[table] ?? [])];
      for (const [key, value] of url.searchParams) {
        if (value.startsWith("eq."))
          rows = rows.filter((r) => String(r[key]) === value.slice(3));
        if (value.startsWith("in.("))
          rows = rows.filter((r) =>
            value.slice(4, -1).split(",").includes(String(r[key])),
          );
        if (value === "is.null") rows = rows.filter((r) => r[key] == null);
        if (value === "not.is.null") rows = rows.filter((r) => r[key] != null);
      }
      if (url.searchParams.get("limit"))
        rows = rows.slice(0, Number(url.searchParams.get("limit")));
      const single = request.headers()["accept"]?.includes("vnd.pgrst.object");
      return route.fulfill({ json: single ? (rows[0] ?? null) : rows });
    },
  );
}
