import { expect, test, type Page, type Route } from "@playwright/test";
import type { HoldStatus } from "../src/shared/types/holds";
import { STUDENT_STORAGE_KEY } from "../src/features/admissions/identity/studentIdentity";

const holdId = "a1111111-1111-4111-8111-111111111111";
const classId = "b2222222-2222-4222-8222-222222222222";
const studentId = "00123456789012345";
const nextStudentId = "00987654321098765";

async function application(page: Page, options: { status?: HoldStatus; owned?: boolean; duration?: number; action?: (route: Route, state: { status: HoldStatus; owned: boolean }) => Promise<void> } = {}) {
  const state = { status: options.status ?? "HELD" as HoldStatus, owned: options.owned ?? true };
  const deadline = new Date(Date.now() + (options.duration ?? 60_000)).toISOString();
  const createdAt = new Date().toISOString();
  const traffic = { actions: 0, identities: [] as (string | undefined)[], detailReads: 0, historyReads: 0, classReads: 0 };
  await page.addInitScript(({ key, id }) => localStorage.setItem(key, JSON.stringify({ version: 1, studentId: id })), { key: STUDENT_STORAGE_KEY, id: studentId });
  const record = () => ({ holdId, classId, status: state.status, createdAt, expiresAt: deadline, serverNow: new Date().toISOString() });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" || request.method() === "DELETE") {
      traffic.actions += 1;
      traffic.identities.push(request.headers()["x-student-id"]);
      if (options.action) return options.action(route, state);
      if (request.method() === "POST") {
        state.status = "CONFIRMED";
        return route.fulfill({ status: 200, json: { holdId, status: state.status } });
      }
      state.status = "CANCELLED";
      return route.fulfill({ status: 204 });
    }
    if (path === `/api/holds/${holdId}`) {
      traffic.detailReads += 1;
      return route.fulfill({ json: record() });
    }
    if (path === "/api/me/holds") {
      traffic.historyReads += 1;
      const owns = state.owned && request.headers()["x-student-id"] === studentId;
      return route.fulfill({ json: owns ? [{ ...record(), className: "Class seven" }] : [] });
    }
    if (path === `/api/classes/${classId}` || path === "/api/classes") {
      traffic.classReads += 1;
      const summary = { id: classId, name: "Class seven", totalSeats: 10, heldSeats: state.status === "HELD" ? 1 : 0, confirmedSeats: state.status === "CONFIRMED" ? 1 : 0, availableSeats: state.status === "HELD" || state.status === "CONFIRMED" ? 9 : 10 };
      return route.fulfill({ json: path === "/api/classes" ? [summary] : summary });
    }
    return route.fulfill({ status: 404, json: { title: "Not found" } });
  });
  await page.goto(`/applications/${holdId}`);
  await expect(page.getByRole("heading", { name: "Class seven" })).toBeVisible();
  return { state, traffic };
}

test("confirms an owned held application only after the decision dialog and refreshes related data", async ({ page }) => {
  const { traffic } = await application(page);
  const confirm = page.getByRole("button", { name: "Pay fee & confirm", exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  const dialog = page.getByRole("dialog", { name: "Confirm admission?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep reviewing" })).toBeFocused();
  expect(traffic.actions).toBe(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(traffic.actions).toBe(0);
  await confirm.click();
  await dialog.getByRole("button", { name: "Confirm admission", exact: true }).click();
  await expect(page.getByText("Admission confirmed. Your place is secured.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A place secured." })).toBeVisible();
  await expect(confirm).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel hold", exact: true })).toBeDisabled();
  expect(traffic.actions).toBe(1);
  expect(traffic.identities).toEqual([studentId]);
  expect(traffic.detailReads).toBeGreaterThanOrEqual(2);
  expect(traffic.historyReads).toBeGreaterThanOrEqual(2);
  expect(traffic.classReads).toBeGreaterThanOrEqual(2);
});

test("accepts cancellation's empty 204 response and keeps terminal feedback visible", async ({ page }) => {
  const { traffic } = await application(page);
  await page.getByRole("button", { name: "Cancel hold", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this hold?" });
  await expect(dialog.getByRole("button", { name: "Keep hold" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel hold", exact: true }).click();
  await expect(page.getByText("Hold cancelled. The place is available again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This application is closed." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel hold", exact: true })).toBeDisabled();
  expect(traffic.actions).toBe(1);
  expect(traffic.identities).toEqual([studentId]);
});

for (const failure of [403, 409, 502]) {
  test(`explains HTTP ${failure} and refreshes the application after a rejected decision`, async ({ page }) => {
    const { traffic } = await application(page, {
      action: async (route, state) => {
        if (failure === 403) state.owned = false;
        if (failure === 409) state.status = "EXPIRED";
        await route.fulfill({ status: failure, json: { title: "Request rejected", detail: "A server detail" } });
      },
    });
    await page.getByRole("button", { name: "Pay fee & confirm", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm admission", exact: true }).click();
    const message = failure === 403
      ? "This registration number does not own this application. Check your student number."
      : failure === 409
        ? "This hold can no longer be confirmed. Check its current status before trying again."
        : "The admission service is unavailable. Check the application status before trying again.";
    await expect(page.getByRole("main").getByRole("alert").filter({ hasText: message })).toBeVisible();
    await expect.poll(() => traffic.detailReads).toBeGreaterThanOrEqual(2);
    if (failure !== 502) await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeDisabled();
    expect(traffic.actions).toBe(1);
  });
}

for (const state of [{ status: "HELD" as const, owned: false }, { status: "EXPIRED" as const }, { status: "CONFIRMED" as const }, { status: "CANCELLED" as const }]) {
  test(`disables decisions for ${state.owned === false ? "another student's" : state.status.toLowerCase()} application`, async ({ page }) => {
    const { traffic } = await application(page, state);
    await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Cancel hold", exact: true })).toBeDisabled();
    expect(traffic.actions).toBe(0);
  });
}

test("locks both decisions while one request is pending", async ({ page }) => {
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const { traffic } = await application(page, {
    action: async (route, state) => {
      await pending;
      state.status = "CONFIRMED";
      await route.fulfill({ status: 200, json: { holdId, status: state.status } });
    },
  });
  await page.getByRole("button", { name: "Pay fee & confirm", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm admission", exact: true }).click();
  await expect.poll(() => traffic.actions).toBe(1);
  await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel hold", exact: true })).toBeDisabled();
  release();
  await expect(page.getByText("Admission confirmed. Your place is secured.", { exact: true })).toBeVisible();
  expect(traffic.actions).toBe(1);
});

test("closes a decision dialog when the hold expires without sending a mutation", async ({ page }) => {
  const { traffic } = await application(page, { duration: 3500 });
  await page.getByRole("button", { name: "Pay fee & confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "This hold has ended." })).toBeVisible({ timeout: 7000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeDisabled();
  expect(traffic.actions).toBe(0);
});

test("identity switching aborts a pending decision and suppresses its previous student's feedback", async ({ page, context }) => {
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const { traffic } = await application(page, {
    action: async (route, state) => {
      await pending;
      state.status = "CONFIRMED";
      await route.fulfill({ status: 200, json: { holdId, status: state.status } }).catch(() => undefined);
    },
  });
  await page.getByRole("button", { name: "Pay fee & confirm", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm admission", exact: true }).click();
  await expect.poll(() => traffic.actions).toBe(1);
  const otherTab = await context.newPage();
  await otherTab.goto("/student");
  const registration = otherTab.getByLabel("Student registration number", { exact: true });
  // Wait for the controlled form to finish restoring its saved value before editing it.
  await expect(registration).toHaveValue(studentId);
  await registration.fill(nextStudentId);
  await expect(registration).toHaveValue(nextStudentId);
  await otherTab.getByRole("button", { name: "Update number" }).click();
  await expect(page.getByText("This application belongs to a different student number.", { exact: false })).toBeVisible();
  release();
  await expect(page.getByText("Admission confirmed. Your place is secured.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeDisabled();
  expect(traffic.identities).toEqual([studentId]);
});
