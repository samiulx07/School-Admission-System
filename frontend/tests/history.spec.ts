import { expect, test, type Page, type Route } from "@playwright/test";
import { STUDENT_STORAGE_KEY } from "../src/features/admissions/identity/studentIdentity";

test.use({ timezoneId: "UTC" });

const firstStudent = "00123456789012345";
const secondStudent = "00987654321098765";
const history = [
  { holdId: "237df946-8175-4a27-9b2d-d56978d314c6", classId: "9b98f72b-ad20-42dd-a48b-8de685ea7330", className: "Science foundation", status: "HELD", createdAt: "2026-11-05T00:01:00Z", expiresAt: "2026-11-10T20:00:00Z", serverNow: "2026-11-10T10:00:00Z" },
  { holdId: "7bdfb9c1-175b-44c8-a9d5-8d3614a2105e", classId: "45d40d1e-4bf6-4b3b-a1fe-979d7e0941af", className: "Language and literature", status: "CONFIRMED", createdAt: "2026-11-05T23:59:00Z", expiresAt: "2026-11-06T00:09:00Z", serverNow: "2026-11-10T10:00:00Z" },
  { holdId: "3fa257e1-c336-4d71-948f-10520f7c1316", classId: "d19c4125-5bc2-413a-a017-cd7157ec771a", className: "Creative arts", status: "EXPIRED", createdAt: "2026-11-06T12:00:00Z", expiresAt: "2026-11-06T12:10:00Z", serverNow: "2026-11-10T10:00:00Z" },
  { holdId: "fd82d1c0-49d5-450e-895c-60f4c8b3313b", classId: "e89d320b-6cca-416e-bfaf-903cdf1bfe39", className: "Mathematics", status: "CANCELLED", createdAt: "2026-11-04T12:00:00Z", expiresAt: "2026-11-04T12:10:00Z", serverNow: "2026-11-10T10:00:00Z" },
];
const secondHistory = [{ ...history[0], className: "Arts studio", status: "HELD" }];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function seedStudent(page: Page) {
  await page.addInitScript(({ key, studentId }) => localStorage.setItem(key, JSON.stringify({ version: 1, studentId })), { key: STUDENT_STORAGE_KEY, studentId: firstStudent });
}

test("asks for a student number without requesting private history", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/me/holds", route => { requests += 1; return json(route, history); });
  await page.goto("/applications");
  await expect(page.getByRole("heading", { name: "Connect your applications", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Set student number", exact: true })).toHaveAttribute("href", "/student");
  expect(requests).toBe(0);
});

test("loads only the current student's history with all lifecycle states and record links", async ({ page }) => {
  await seedStudent(page);
  const requestStudents: Array<string | undefined> = [];
  await page.route("**/api/me/holds", route => {
    requestStudents.push(route.request().headers()["x-student-id"]);
    return json(route, history);
  });
  await page.goto("/applications");
  await expect(page.getByRole("main").getByText(firstStudent, { exact: true })).toBeVisible();
  const list = page.getByRole("list", { name: "Your applications", exact: true });
  await expect(list.getByRole("article")).toHaveCount(4);
  for (const hold of history) {
    const row = list.getByRole("article", { name: hold.className, exact: true });
    await expect(row.getByRole("link", { name: new RegExp(`for ${hold.className}$`) }).first()).toHaveAttribute("href", `/applications/${hold.holdId}`);
    await expect(row.getByText(hold.status[0] + hold.status.slice(1).toLowerCase(), { exact: true })).toBeVisible();
  }
  await expect(list.getByRole("link", { name: "Apply again for Creative arts", exact: true })).toHaveAttribute("href", "/classes");
  expect(requestStudents).toEqual([firstStudent]);
});

test("shows loading and then a useful empty history", async ({ page }) => {
  await seedStudent(page);
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/me/holds", async route => { await pending; await json(route, []); });
  await page.goto("/applications");
  await expect(page.getByRole("heading", { name: "Opening your applications", exact: true })).toBeVisible();
  release?.();
  await expect(page.getByRole("heading", { name: "No applications yet", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Browse classes", exact: true })).toHaveAttribute("href", "/classes");
});

test("can retry a history service failure without losing the identity", async ({ page }) => {
  await seedStudent(page);
  let failing = true;
  await page.route("**/api/me/holds", route => failing ? json(route, { title: "Unavailable" }, 503) : json(route, history));
  await page.goto("/applications");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Your applications could not load");
  await expect(page.getByRole("main").getByText(firstStudent, { exact: true })).toBeVisible();
  failing = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article")).toHaveCount(4);
});

test("combines status, class and inclusive application dates, then clears the filters", async ({ page }) => {
  await seedStudent(page);
  await page.route("**/api/me/holds", route => json(route, history));
  await page.goto("/applications");
  const list = page.getByRole("list", { name: "Your applications", exact: true });
  await expect(list.getByRole("article")).toHaveCount(4);
  const toggle = page.getByRole("button", { name: "Filter applications", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("group", { name: "Filter applications", exact: true })).toHaveCount(0);
  await toggle.click();
  await page.getByLabel("Applied from", { exact: true }).fill("2026-11-05");
  await page.getByLabel("Applied from", { exact: true }).press("Tab");
  await page.getByLabel("Applied through", { exact: true }).fill("2026-11-05");
  await page.getByLabel("Applied through", { exact: true }).press("Tab");
  await expect(list.getByRole("article")).toHaveCount(2);
  await page.getByRole("group", { name: "Filter applications", exact: true }).getByText("All statuses", { exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Application status", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("option", { name: "Confirmed", exact: true }).click();
  await expect(list.getByRole("article")).toHaveCount(1);
  await expect(list.getByRole("article", { name: "Language and literature", exact: true })).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("group", { name: "Filter applications", exact: true })).toHaveCount(0);
  await expect(page.getByText("Filters active", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toBeVisible();
  await expect(list.getByRole("article")).toHaveCount(1);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("group", { name: "Filter applications", exact: true }).getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Applied from", { exact: true })).toHaveValue("2026-11-05");
  await expect(page.getByLabel("Applied through", { exact: true })).toHaveValue("2026-11-05");
  await page.getByRole("combobox", { name: "Class", exact: true }).click();
  await page.getByRole("option", { name: "Science foundation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No applications match these filters", exact: true })).toBeVisible();
  await toggle.click();
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().click();
  await expect(list.getByRole("article")).toHaveCount(4);
  await expect(page.getByText("Filters active", { exact: true })).toHaveCount(0);
  await toggle.click();
  await expect(page.getByLabel("Applied from", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Applied through", { exact: true })).toHaveValue("");
});

test("isolates private history and resets filters when another tab changes or clears the student", async ({ page, context }) => {
  await seedStudent(page);
  let releaseSecond: (() => void) | undefined;
  const pendingSecond = new Promise<void>(resolve => { releaseSecond = resolve; });
  const requests: string[] = [];
  await page.route("**/api/me/holds", async route => {
    const student = route.request().headers()["x-student-id"];
    requests.push(student);
    if (student === secondStudent) await pendingSecond;
    await json(route, student === secondStudent ? secondHistory : history);
  });
  await page.goto("/applications");
  await expect(page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article")).toHaveCount(4);
  await page.getByRole("button", { name: "Filter applications", exact: true }).click();
  await page.getByRole("group", { name: "Filter applications", exact: true }).getByText("All statuses", { exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Application status", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("option", { name: "Confirmed", exact: true }).click();
  await expect(page.getByRole("article", { name: "Language and literature", exact: true })).toBeVisible();
  const otherTab = await context.newPage();
  await otherTab.goto("/student");
  await otherTab.getByLabel("Student registration number", { exact: true }).fill(secondStudent);
  await otherTab.getByRole("button", { name: "Update number", exact: true }).click();
  await expect.poll(() => requests.includes(secondStudent)).toBe(true);
  await expect(page.getByRole("article", { name: "Language and literature", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Opening your applications", exact: true })).toBeVisible();
  releaseSecond?.();
  await expect(page.getByRole("article", { name: "Arts studio", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Filter applications", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("main").getByText(firstStudent, { exact: true })).toHaveCount(0);
  await otherTab.getByRole("button", { name: "Clear number", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Connect your applications", exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Arts studio", exact: true })).toHaveCount(0);
});

test("retains last records when a background refresh fails", async ({ page }) => {
  await seedStudent(page);
  let requests = 0;
  await page.route("**/api/me/holds", route => { requests += 1; return requests === 1 ? json(route, history) : json(route, { title: "Unavailable" }, 503); });
  await page.goto("/applications");
  await expect(page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article")).toHaveCount(4);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Your applications could not refresh", { timeout: 5_000 });
  await expect(page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article")).toHaveCount(4);
});

test("keeps phone history readable with reduced motion", async ({ page }) => {
  await seedStudent(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/me/holds", route => json(route, history));
  await page.goto("/applications");
  await expect(page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Filter applications", exact: true }).click();
  await page.getByRole("combobox", { name: "Application status", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article")).toHaveCount(1);
});
