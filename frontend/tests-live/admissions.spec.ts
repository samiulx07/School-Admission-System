import { randomInt, randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";

// These tests deliberately use the real UI, same-origin API proxy, API and PostgreSQL.
// Run against the isolated admissions-e2e Compose project, with 20-second holds.
function uniqueApplication(scenario: string) {
  const digits = () => String(randomInt(100_000_000)).padStart(8, "0");
  return {
    className: `Live ${scenario} ${randomUUID()}`,
    studentId: `0${digits()}${digits()}`,
  };
}

function classRow(page: Page, className: string) {
  return page.getByRole("article", { name: className, exact: true });
}

async function expectSeats(row: Locator, counts: { total: number; held: number; confirmed: number; available: number }) {
  for (const [label, count] of [
    ["Total seats", counts.total],
    ["Held", counts.held],
    ["Confirmed", counts.confirmed],
    ["Available", counts.available],
  ] as const) {
    await expect(row.getByText(label, { exact: true }).locator("..").locator("dd")).toHaveText(String(count));
  }
}

async function createClassAndSetStudent(page: Page, application: ReturnType<typeof uniqueApplication>) {
  await page.goto("/admin/classes/new");
  await page.getByLabel("Class name", { exact: true }).fill(application.className);
  await page.getByLabel("Total seats", { exact: true }).fill("1");
  const created = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classes" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create class", exact: true }).click();
  expect((await created).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Class created", exact: true })).toBeVisible();

  await page.goto("/student");
  const registration = page.getByLabel("Student registration number", { exact: true });
  await registration.fill(application.studentId);
  await page.getByRole("button", { name: "Use this number", exact: true }).click();
  await expect(page.getByRole("main").getByText(application.studentId, { exact: true })).toBeVisible();
  await expect(registration).toHaveValue(application.studentId);

  await page.goto("/classes");
  await expectSeats(classRow(page, application.className), { total: 1, held: 0, confirmed: 0, available: 1 });
}

async function reservePlace(page: Page, application: ReturnType<typeof uniqueApplication>) {
  const reserved = page.waitForResponse(response => /\/api\/classes\/[^/]+\/holds$/.test(new URL(response.url()).pathname) && response.request().method() === "POST");
  await classRow(page, application.className).getByRole("button", { name: "Reserve a place", exact: true }).click();
  const response = await reserved;
  expect(response.status()).toBe(201);
  expect(response.request().headers()["x-student-id"]).toBe(application.studentId);
  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: application.className, exact: true })).toBeVisible();
  await expect(page.getByText("Place held", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeEnabled();
  return page.url();
}

function applicationHistory(page: Page, className: string) {
  return page.getByRole("list", { name: "Your applications", exact: true }).getByRole("article", { name: className, exact: true });
}

test("creates a class, preserves a leading-zero student number and persists a confirmed admission", async ({ page }) => {
  const application = uniqueApplication("confirmation");
  await createClassAndSetStudent(page, application);
  const applicationUrl = await reservePlace(page, application);

  await page.getByRole("button", { name: "Pay fee & confirm", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Confirm admission?", exact: true });
  await expect(dialog).toContainText("does not collect a payment");
  const confirmed = page.waitForResponse(response => /\/api\/holds\/[^/]+\/confirm$/.test(new URL(response.url()).pathname) && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Confirm admission", exact: true }).click();
  expect((await confirmed).status()).toBe(200);
  await expect(page.getByText("Admission confirmed", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(applicationUrl);
  await expect(page.getByText("Admission confirmed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay fee & confirm", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel hold", exact: true })).toBeDisabled();

  await page.goto("/applications");
  await expect(page.getByRole("main").getByText(application.studentId, { exact: true })).toBeVisible();
  const history = applicationHistory(page, application.className);
  await expect(history).toHaveCount(1);
  await expect(history.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(history.getByRole("link", { name: `View application for ${application.className}`, exact: true })).toHaveAttribute("href", new URL(applicationUrl).pathname);

  await page.goto("/classes");
  await expectSeats(classRow(page, application.className), { total: 1, held: 0, confirmed: 1, available: 0 });
  await expect(classRow(page, application.className).getByRole("button", { name: "Class is full", exact: true })).toBeDisabled();
  await page.goto("/student");
  await expect(page.getByLabel("Student registration number", { exact: true })).toHaveValue(application.studentId);
});

test("cancels a hold, releases its seat and keeps both applications after reserving again", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const application = uniqueApplication("cancellation");
  await createClassAndSetStudent(page, application);
  const firstApplicationUrl = await reservePlace(page, application);

  await page.getByRole("button", { name: "Cancel hold", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this hold?", exact: true });
  const cancelled = page.waitForResponse(response => /\/api\/holds\/[^/]+$/.test(new URL(response.url()).pathname) && response.request().method() === "DELETE");
  await dialog.getByRole("button", { name: "Cancel hold", exact: true }).click();
  expect((await cancelled).status()).toBe(204);
  await expect(page.getByText("Application cancelled", { exact: true })).toBeVisible();

  await page.goto("/classes");
  await expectSeats(classRow(page, application.className), { total: 1, held: 0, confirmed: 0, available: 1 });
  const secondApplicationUrl = await reservePlace(page, application);
  expect(secondApplicationUrl).not.toBe(firstApplicationUrl);

  await page.goto("/classes");
  await expectSeats(classRow(page, application.className), { total: 1, held: 1, confirmed: 0, available: 0 });
  await page.goto("/applications");
  await page.reload();
  const history = applicationHistory(page, application.className);
  await expect(history).toHaveCount(2);
  await expect(history.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(history.getByText("Held", { exact: true })).toBeVisible();
  await expect(history.getByRole("link", { name: `Review hold for ${application.className}`, exact: true })).toHaveAttribute("href", new URL(secondApplicationUrl).pathname);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("naturally expires a hold, disables payment at 00:00 and persists the released seat", async ({ page }) => {
  const application = uniqueApplication("expiry");
  await createClassAndSetStudent(page, application);
  await reservePlace(page, application);
  const payment = page.getByRole("button", { name: "Pay fee & confirm", exact: true });

  // Let the real 20-second server deadline pass; no clock or network mocking.
  await expect(page.getByText("Hold expired", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Time remaining 00:00", { exact: true })).toBeVisible();
  await expect(payment).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel hold", exact: true })).toBeDisabled();

  await page.reload();
  await expect(page.getByText("Hold expired", { exact: true })).toBeVisible();
  await expect(payment).toBeDisabled();
  await page.goto("/classes");
  await expectSeats(classRow(page, application.className), { total: 1, held: 0, confirmed: 0, available: 1 });
  await expect(classRow(page, application.className).getByRole("button", { name: "Reserve a place", exact: true })).toBeEnabled();
  await page.goto("/applications");
  const history = applicationHistory(page, application.className);
  await expect(history).toHaveCount(1);
  await expect(history.getByText("Expired", { exact: true })).toBeVisible();
  await expect(history.getByRole("link", { name: `Apply again for ${application.className}`, exact: true })).toHaveAttribute("href", "/classes");
});
