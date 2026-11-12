import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mockWorkspace, projectId } from "./ui-fixture.mjs";
const origin = process.env.BASE_URL || "http://127.0.0.1:3000";
// Never intercept a hosted customer's database: synthetic tests are local only.
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const output = process.env.REVIEW_OUTPUT || "/workspace/work/redesign-review";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext(),
  page = await context.newPage(),
  errors = [],
  report = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await mockWorkspace(page);
try {
  await page.goto(origin);
  await page
    .getByLabel("Email", { exact: true })
    .fill("visual-test@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-only-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator(".app-shell").waitFor();
  for (const width of [1440, 390, 320])
    for (const theme of ["dark", "light"])
      for (const route of ["start-here", "qcue"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(origin + "/#" + route);
        await page.locator(".app-shell").waitFor();
        await page.waitForFunction(() =>
          document.querySelector(".metric-grid")?.textContent.includes("2"),
        );
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `Overflow ${width} ${theme} ${route}`,
        );
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        const violations = results.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        }));
        report.push({ width, theme, route, violations });
        if (width !== 320)
          await page.screenshot({
            path: `${output}/${route}-${width === 1440 ? "desktop" : "mobile"}-${theme}.png`,
          });
      }
  assert.deepEqual(
    report.flatMap((r) =>
      r.violations.map((v) => ({
        ...v,
        width: r.width,
        theme: r.theme,
        route: r.route,
      })),
    ),
    [],
    "Accessibility violations",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + "/#start-here");
  await page
    .getByRole("button", { name: "Generate 20 qualified leads", exact: true })
    .click();
  assert.equal(
    await page.locator("#navigator-goal").inputValue(),
    "Generate 20 qualified leads",
  );
  await page
    .getByRole("button", { name: "Find my next move", exact: true })
    .click();
  assert.match(
    await page.locator(".navigator-result").innerText(),
    /Start with Grow/,
  );
  assert.match(
    await page.locator(".navigator-result").innerText(),
    /Rule-based recommendation/,
  );
  assert.equal(await page.locator('.app-sidebar nav[aria-label="Main navigation"] a').nth(2).getAttribute('href'), '#ai-workspace');
  assert.equal(await page.locator('.mobile-bottom a').nth(1).getAttribute('href'), '#ai-workspace');
  assert.equal(await page.locator('#ai-workspace').evaluate(el => Boolean(el.compareDocumentPosition(document.getElementById('navigator')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
  assert.equal(await page.locator(".model-links a").count(), 4);
  assert.match(
    await page
      .getByRole("link", { name: /Open Universal AI/ })
      .getAttribute("href"),
    /ZEHJ2MG2K4Z022Y$/,
  );
  await page.keyboard.press("Control+k");
  await page.locator("#command-search").fill("Validate the studio");
  assert.equal(await page.locator(".command-results a").count(), 1);
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") === "Search workspace",
  );
  await page
    .getByRole("button", { name: "Search workspace", exact: true })
    .click();
  await page.locator("#command-search").fill("Profit & Pricing");
  await page.locator(".command-results a").click();
  await page.waitForTimeout(100);
  assert.match(
    await page.locator("#tool-studio").innerText(),
    /Profit & Pricing/,
  );
  assert.match(
    await page.locator("#tool-studio").innerText(),
    /Provider execution and usage cost are unverified/,
  );
  await page.goto(origin + "/#qcue");
  await page.locator("#workflow").waitFor({ state: "visible" });
  assert.equal(
    await page
      .getByRole("button", { name: "Run Market Intelligence", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Run Audience DNA Builder", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Run Idea Validator", exact: true })
      .isEnabled(),
    true,
  );
  await page
    .getByRole("button", { name: "New test project", exact: false })
    .click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator("#assessments .assessment").count(), 0);
  assert.equal(
    await page
      .getByRole("button", { name: "Run Market Intelligence", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("combobox", { name: "Switch workspace business" })
    .selectOption("other-business");
  await page.waitForTimeout(200);
  assert.equal(await page.locator("#workflow").count(), 0);
  assert.equal(await page.locator("#assessments").count(), 0);
  assert.equal(
    await page
      .locator("#qcue")
      .innerText()
      .then((x) => x.includes("Synthetic assessment")),
    false,
  );
  await page
    .getByRole("combobox", { name: "Switch workspace business" })
    .selectOption("22222222-2222-4222-8222-222222222222");
  await page.locator("#workflow").waitFor({ state: "visible" });
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  assert.equal(
    await page
      .locator(".app-shell")
      .evaluate((e) => e.classList.contains("nav-collapsed")),
    true,
  );
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Q/CUE assistant", exact: true })
    .click();
  assert.equal(
    await page.locator(".assistant-drawer").evaluate((e) => e.open),
    true,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: /Switch to .* theme/, exact: true })
    .first()
    .click();
  const theme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  await page.reload();
  await page.locator(".app-shell").waitFor();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    theme,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  assert.equal(
    await page.locator(".app-canvas").evaluate((e) => e.inert),
    true,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  assert.equal(
    await page.locator(".app-canvas").evaluate((e) => e.inert),
    false,
  );
  await page.locator('.mobile-bottom a[href="#start-here"]').click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#start-here").isVisible(), true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".app-sidebar")
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
  assert.deepEqual(errors, [], "Browser errors");
  writeFileSync(
    output + "/verification.json",
    JSON.stringify(
      {
        matrix: report,
        checks: [
          "Navigator goal chips and honest rule-based recommendations",
          "Universal AI and four individual model links",
          "command search, saved projects, focus restoration",
          "planned tool selection without provider execution",
          "approval and audience pilot gates",
          "project switching clears prior assessments",
          "business switching clears prior project data",
          "desktop sidebar and mobile keyboard navigation",
          "assistant dialog",
          "theme persistence",
          "reduced motion",
          "no console errors",
        ],
        fixture:
          "Synthetic responses intercepted in the browser; no remote records read or written.",
        limitations:
          "Live authenticated acceptance and provider execution are separate release gates.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: 12 accessibility/overflow combinations, 12 interaction checks, no console errors. Synthetic browser data only.",
  );
} finally {
  await browser.close();
}
