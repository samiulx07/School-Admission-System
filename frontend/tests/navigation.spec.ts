import { expect, test } from "@playwright/test";

test("home links to the live class register", async ({ page }) => {
  await page.route("**/api/classes", route => route.fulfill({ json: [] }));
  await page.goto("/");
  await page.getByRole("link", { name: "Explore available classes" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Classes", exact: true })).toHaveAttribute("aria-current", "page");
});

test("phone navigation opens, supports Escape, and closes after choosing a page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/classes", route => route.fulfill({ json: [] }));
  await page.goto("/");
  const menu = page.getByRole("navigation", { name: "Primary" });
  await expect(menu).toBeHidden();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Classes", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await menu.getByRole("link", { name: "Classes", exact: true }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(menu).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
