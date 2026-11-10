import { expect, test } from "@playwright/test";
import { STUDENT_STORAGE_KEY } from "../src/features/admissions/identity/studentIdentity";

const firstStudent = "00123456789012345";
const secondStudent = "00987654321098765";

test("validates exact ASCII digits, preserves leading zeros, changes and clears a remembered number", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  await page.goto("/student");
  const field = page.getByLabel("Student registration number", { exact: true });
  const save = page.getByRole("button", { name: "Use this number" });
  await save.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Enter exactly 17 digits (0-9).");
  await expect(field).toBeFocused();

  for (const invalid of ["1234567890123456", "123456789012345678", "１２３４５６７８９０１２３４５６７", "১২৩৪৫৬৭৮৯০১২৩৪৫৬৭৮", " 1234567890123456", "1234567890123456a"]) {
    await field.fill(invalid);
    await save.click();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("main").getByText("Not set", { exact: true })).toBeVisible();
  }
  await field.fill(firstStudent);
  await save.click();
  await expect(page.getByText(firstStudent, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Student number set" })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STUDENT_STORAGE_KEY)).toBe(JSON.stringify({ version: 1, studentId: firstStudent }));

  await page.reload();
  await expect(field).toHaveValue(firstStudent);
  await expect(page.getByText(firstStudent, { exact: true })).toBeVisible();
  await field.fill(secondStudent);
  await page.getByRole("button", { name: "Update number" }).click();
  await expect(page.getByText(secondStudent, { exact: true })).toBeVisible();
  await expect(page.getByText(firstStudent, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear number" }).click();
  await expect(page.getByRole("link", { name: "Set student number" })).toBeVisible();
  await expect(field).toHaveValue("");
  expect(await page.evaluate((key) => localStorage.getItem(key), STUDENT_STORAGE_KEY)).toBeNull();
  await page.reload();
  await expect(field).toBeEnabled();
  await expect(field).toHaveValue("");
  expect(browserErrors).toEqual([]);
});

for (const invalidStored of ["broken-json", JSON.stringify({ version: 2, studentId: firstStudent }), JSON.stringify({ version: 1, studentId: 12345678901234567 }), JSON.stringify({ version: 1, studentId: "1234567890123456" })]) {
  test(`rejects invalid browser identity: ${invalidStored}`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: STUDENT_STORAGE_KEY, value: invalidStored });
    await page.goto("/student");
    await expect(page.getByText("The saved registration number could not be read. Please enter it again.")).toBeVisible();
    await expect(page.getByLabel("Student registration number", { exact: true })).toHaveValue("");
    expect(await page.evaluate((key) => localStorage.getItem(key), STUDENT_STORAGE_KEY)).toBeNull();
  });
}

test("continues in this tab when browser storage is blocked", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new DOMException("Storage blocked", "SecurityError"); } });
  });
  await page.goto("/student");
  await expect(page.getByRole("main").getByText("Browser storage is unavailable.", { exact: false })).toBeVisible();
  await page.getByLabel("Student registration number", { exact: true }).fill(firstStudent);
  await page.getByRole("button", { name: "Use this number" }).click();
  await expect(page.getByText(firstStudent, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Student registration number", { exact: true })).toHaveValue("");
  await expect(page.getByRole("main").getByText("Browser storage is unavailable.", { exact: false })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("keeps the current tab usable when saving or clearing browser storage fails", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); };
    Storage.prototype.removeItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  });
  await page.goto("/student");
  await page.getByLabel("Student registration number", { exact: true }).fill(firstStudent);
  await page.getByRole("button", { name: "Use this number" }).click();
  await expect(page.getByText(firstStudent, { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Browser storage is unavailable.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Clear number" }).click();
  await expect(page.getByText(firstStudent, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Student registration number", { exact: true })).toHaveValue("");
});

test("synchronizes registration changes and clearing across browser tabs", async ({ page, context }) => {
  await page.goto("/student");
  await page.getByLabel("Student registration number", { exact: true }).fill(firstStudent);
  await page.getByRole("button", { name: "Use this number" }).click();
  const otherTab = await context.newPage();
  await otherTab.goto("/student");
  await expect(otherTab.getByText(firstStudent, { exact: true })).toBeVisible();
  await otherTab.getByLabel("Student registration number", { exact: true }).fill(secondStudent);
  await otherTab.getByRole("button", { name: "Update number" }).click();
  await expect(page.getByText(secondStudent, { exact: true })).toBeVisible();
  await expect(page.getByText(firstStudent, { exact: true })).toHaveCount(0);
  await otherTab.getByRole("button", { name: "Clear number" }).click();
  await expect(page.getByLabel("Student registration number", { exact: true })).toHaveValue("");
  await expect(page.getByRole("link", { name: "Set student number" })).toBeVisible();
});

test("student identity remains usable at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/student");
  await page.getByLabel("Student registration number", { exact: true }).fill(firstStudent);
  await page.getByRole("button", { name: "Use this number" }).click();
  await expect(page.getByText(firstStudent, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Clear number" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Clear number" })).toBeInViewport();
});
