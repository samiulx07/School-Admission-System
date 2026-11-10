import { expect, test, type Page, type Route } from "@playwright/test";

const studentId = "12345678901234567";
const otherStudentId = "76543210987654321";
const classId = "a06c201d-dae9-4c47-ab22-990be9dd953c";
const holdId = "cb533125-e760-4e47-8844-28094dbe594c";
const admissionClass = { id: classId, name: "Science foundation", totalSeats: 30, heldSeats: 3, confirmedSeats: 7, availableSeats: 20 };

function hold(lifetime = 60_000, status = "HELD") {
  const now = Date.now();
  return { holdId, classId, status, createdAt: new Date(now - 1_000).toISOString(), serverNow: new Date(now).toISOString(), expiresAt: new Date(now + lifetime).toISOString() };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function identity(page: Page) {
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, JSON.stringify({ version: 1, studentId: value })), { key: "seatwise.student.v1", value: studentId });
}

async function mockDetails(page: Page, details = hold(), owns = true) {
  await page.route(`**/api/holds/${holdId}`, route => json(route, details));
  await page.route(`**/api/classes/${classId}`, route => json(route, admissionClass));
  await page.route("**/api/me/holds", route => json(route, owns ? [{ ...details, className: admissionClass.name }] : []));
}

test("requires a student number before reserving a place", async ({ page }) => {
  await page.route("**/api/classes", route => json(route, [admissionClass]));
  await page.goto("/classes");
  const row = page.getByRole("article", { name: admissionClass.name, exact: true });
  await expect(row.getByRole("link", { name: "Set student number" })).toHaveAttribute("href", "/student");
  await expect(row.getByRole("button", { name: "Reserve a place" })).toHaveCount(0);
});

test("reserves using the captured student header and opens the application", async ({ page }) => {
  await identity(page);
  await page.route("**/api/classes", route => json(route, [admissionClass]));
  await mockDetails(page);
  let sentStudent: string | undefined;
  await page.route(`**/api/classes/${classId}/holds`, route => {
    sentStudent = route.request().headers()["x-student-id"];
    return json(route, { ...hold(), studentId }, 201);
  });
  await page.goto("/classes");
  await page.getByRole("button", { name: "Reserve a place", exact: true }).click();
  await expect(page).toHaveURL(`/applications/${holdId}`);
  expect(sentStudent).toBe(studentId);
  await expect(page.getByText("This application belongs to your current student number.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay fee & confirm" })).toBeEnabled();
});

for (const failure of [
  { status: 409, code: "class_full", message: "All places in this class are now held or confirmed." },
  { status: 409, code: "active_application_exists", message: "You already have an active application for this class." },
  { status: 403, code: "hold_not_owned", message: "This application belongs to a different student number." },
  { status: 502, code: "upstream_unavailable", message: "The admissions service is unavailable." },
]) {
  test(`explains reservation failure ${failure.status} ${failure.code}`, async ({ page }) => {
    await identity(page);
    await page.route("**/api/classes", route => json(route, [admissionClass]));
    await page.route(`**/api/classes/${classId}/holds`, route => json(route, { code: failure.code }, failure.status));
    await page.goto("/classes");
    await page.getByRole("button", { name: "Reserve a place", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(failure.message);
    await expect(page).toHaveURL("/classes");
  });
}

test("expires at the server deadline without a reload and keeps payment disabled", async ({ page }) => {
  await identity(page);
  await mockDetails(page, hold(1_200));
  await page.goto(`/applications/${holdId}`);
  await expect(page.getByText("Hold expired", { exact: true })).toBeVisible({ timeout: 3_000 });
  await expect(page.getByLabel("Time remaining 00:00", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay fee & confirm" })).toBeDisabled();
});

test("uses the server clock and accounts conservatively for response latency", async ({ page }) => {
  const details = hold(2_500);
  await page.addInitScript(() => { Date.now = () => 9_999_999_999_999; });
  await mockDetails(page, details);
  await page.unroute(`**/api/holds/${holdId}`);
  await page.route(`**/api/holds/${holdId}`, async route => {
    await new Promise(resolve => setTimeout(resolve, 1_000));
    await json(route, details);
  });
  await page.goto(`/applications/${holdId}`);
  await expect(page.getByText("Place held", { exact: true })).toBeVisible();
  // A fresh 2.5 second clock at receipt would still be held after this wait.
  await expect(page.getByText("Hold expired", { exact: true })).toBeVisible({ timeout: 2_000 });
});

test("rejects an invalid server timestamp before showing application decisions", async ({ page }) => {
  await identity(page);
  await mockDetails(page, { ...hold(), expiresAt: "not-a-timestamp" });
  await page.goto(`/applications/${holdId}`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Application details could not load");
  await expect(page.getByText("Place held", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pay fee & confirm" })).toHaveCount(0);
});

test("does not navigate for a late reservation after the student number changes", async ({ page }) => {
  await identity(page);
  await page.route("**/api/classes", route => json(route, [admissionClass]));
  let release: (() => void) | undefined;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/classes/${classId}/holds`, async route => {
    await blocked;
    await json(route, { ...hold(), studentId }, 201).catch(() => undefined);
  });
  await page.goto("/classes");
  await page.getByRole("button", { name: "Reserve a place", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reserving your place" })).toBeDisabled();
  await page.evaluate(value => {
    const key = "seatwise.student.v1";
    const newValue = JSON.stringify({ version: 1, studentId: value });
    window.localStorage.setItem(key, newValue);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
  }, otherStudentId);
  await expect(page.getByRole("button", { name: "Reserve a place", exact: true })).toBeEnabled();
  release?.();
  await page.waitForTimeout(250);
  await expect(page).toHaveURL("/classes");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});
