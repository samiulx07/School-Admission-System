import { expect, test } from "@playwright/test";
import { STUDENT_STORAGE_KEY } from "../src/features/admissions/identity/studentIdentity";

const firstStudent = "00123456789012345";
const secondStudent = "00987654321098765";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/classes", route => route.fulfill({ json: [] }));
  await page.route("**/api/me/holds", route => route.fulfill({ json: [] }));
});

test("sets and restores the Student ID from the top of the class page", async ({ page }) => {
  await page.goto("/classes");
  const bar = page.getByRole("region", { name: "Student identity", exact: true });
  const field = bar.getByLabel("Student ID", { exact: true });
  await expect(field).toBeEnabled();
  await expect(field).toHaveValue("");
  await field.fill(firstStudent);
  await bar.getByRole("button", { name: "Use ID", exact: true }).click();
  await expect(bar.getByRole("button", { name: "Update ID", exact: true })).toBeEnabled();
  await expect(field).toHaveValue(firstStudent);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), STUDENT_STORAGE_KEY)).toBe(JSON.stringify({ version: 1, studentId: firstStudent }));

  await page.reload();
  await expect(field).toBeEnabled();
  await expect(field).toHaveValue(firstStudent);
  await expect(bar.getByRole("button", { name: "Update ID", exact: true })).toBeEnabled();
});

test("rejects missing, non-ASCII and incorrectly sized IDs with an associated inline error", async ({ page }) => {
  await page.goto("/classes");
  const bar = page.getByRole("region", { name: "Student identity", exact: true });
  const field = bar.getByLabel("Student ID", { exact: true });
  const save = bar.getByRole("button", { name: "Use ID", exact: true });
  await expect(field).toBeEnabled();

  for (const invalid of ["", "1234567890123456", "123456789012345678", "\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed", "\uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18\uff19\uff10\uff11\uff12\uff13\uff14\uff15\uff16\uff17", " 1234567890123456", "1234567890123456a"]) {
    await field.fill(invalid);
    await save.click();
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(bar.getByRole("alert")).toHaveText("Enter exactly 17 digits (0-9).");
    const errorId = await bar.getByRole("alert").getAttribute("id");
    expect((await field.getAttribute("aria-describedby"))?.split(" ")).toContain(errorId);
    expect(await page.evaluate(key => localStorage.getItem(key), STUDENT_STORAGE_KEY)).toBeNull();
  }

  await field.fill(firstStudent);
  await save.click();
  await expect(field).toHaveValue(firstStudent);
  await expect(bar.getByRole("alert")).toHaveCount(0);
});

test("shares updates and clearing with the student page form", async ({ page }) => {
  await page.goto("/classes");
  const bar = page.getByRole("region", { name: "Student identity", exact: true });
  const field = bar.getByLabel("Student ID", { exact: true });
  await field.fill(firstStudent);
  await bar.getByRole("button", { name: "Use ID", exact: true }).click();
  await expect(bar.getByRole("button", { name: "Update ID", exact: true })).toBeEnabled();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Student number set", exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  const mainField = page.getByRole("main").getByLabel("Student registration number", { exact: true });
  await expect(mainField).toHaveValue(firstStudent);

  await field.fill(secondStudent);
  await bar.getByRole("button", { name: "Update ID", exact: true }).click();
  await expect(mainField).toHaveValue(secondStudent);
  await mainField.fill(firstStudent);
  await page.getByRole("main").getByRole("button", { name: "Update number", exact: true }).click();
  await expect(field).toHaveValue(firstStudent);
  await page.getByRole("main").getByRole("button", { name: "Clear number", exact: true }).click();
  await expect(field).toHaveValue("");
  await expect(bar.getByRole("button", { name: "Use ID", exact: true })).toBeEnabled();
  await expect(bar.getByText("Student ID applied.", { exact: true })).toHaveCount(0);
});

test("keeps the ID usable in this tab when storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new DOMException("Storage blocked", "SecurityError"); } });
  });
  await page.goto("/classes");
  const bar = page.getByRole("region", { name: "Student identity", exact: true });
  const field = bar.getByLabel("Student ID", { exact: true });
  await expect(bar.getByText("ID stays in this tab", { exact: false })).toBeVisible();
  await field.fill(firstStudent);
  await bar.getByRole("button", { name: "Use ID", exact: true }).click();
  await expect(field).toHaveValue(firstStudent);
  await expect(bar.getByRole("button", { name: "Update ID", exact: true })).toBeEnabled();
  await page.reload();
  await expect(field).toBeEnabled();
  await expect(field).toHaveValue("");
});

test("supports a phone keyboard and visible 44-pixel controls without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/classes");
  const bar = page.getByRole("region", { name: "Student identity", exact: true });
  const field = bar.getByLabel("Student ID", { exact: true });
  const save = bar.getByRole("button", { name: "Use ID", exact: true });
  await expect(field).toBeEnabled();
  await expect(field).toHaveAttribute("type", "text");
  await expect(field).toHaveAttribute("inputmode", "numeric");
  await expect(field).toBeInViewport();
  await field.focus();
  await page.keyboard.type(firstStudent);
  await page.keyboard.press("Tab");
  await expect(save).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(bar.getByRole("button", { name: "Update ID", exact: true })).toBeEnabled();
  await expect(field).toHaveValue(firstStudent);
  expect((await field.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect((await bar.getByRole("button", { name: "Update ID", exact: true }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
