import { expect, test, type Route } from "@playwright/test";

const classes = [
  { id: "a06c201d-dae9-4c47-ab22-990be9dd953c", name: "Science foundation", totalSeats: 30, heldSeats: 3, confirmedSeats: 7, availableSeats: 20 },
  { id: "540eb64e-26ad-46e5-916b-67f070616fbd", name: "Language and literature", totalSeats: 12, heldSeats: 4, confirmedSeats: 8, availableSeats: 0 },
  { id: "662cc1fe-02af-499e-88b3-e3fcf45737e3", name: "Creative arts", totalSeats: 10, heldSeats: 2, confirmedSeats: 4, availableSeats: 4 },
];

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

test("debounces case-insensitive class search and can clear it", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/classes", route => json(route, classes));
  await page.goto("/classes");
  const register = page.getByRole("list", { name: "Classes and seat availability", exact: true });
  await expect(register.getByRole("article")).toHaveCount(3);
  await page.getByRole("searchbox", { name: "Search classes", exact: true }).fill("  SCIENCE  ");
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: /^Updating results\.\.\.$/ })).toHaveText("Updating results...");
  await expect(register.getByRole("article")).toHaveCount(3);
  await page.clock.fastForward(300);
  await expect(register.getByRole("article")).toHaveCount(1);
  await expect(register.getByRole("article", { name: "Science foundation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(register.getByRole("article")).toHaveCount(3);
});

test("filters both ends of the available-seat range using the keyboard", async ({ page }) => {
  await page.route("**/api/classes", route => json(route, classes));
  await page.goto("/classes");
  const register = page.getByRole("list", { name: "Classes and seat availability", exact: true });
  await expect(register.getByRole("article")).toHaveCount(3);
  const minimum = page.getByRole("slider", { name: "Minimum available seats", exact: true });
  await minimum.focus();
  await minimum.press("ArrowRight");
  await expect(minimum).toHaveAttribute("aria-valuenow", "1");
  await expect(register.getByRole("article")).toHaveCount(2);
  const maximum = page.getByRole("slider", { name: "Maximum available seats", exact: true });
  await maximum.focus();
  for (let index = 0; index < 26; index += 1) await maximum.press("ArrowLeft");
  await expect(maximum).toHaveAttribute("aria-valuenow", "4");
  await expect(register.getByRole("article")).toHaveCount(1);
  await expect(register.getByRole("article", { name: "Creative arts", exact: true })).toBeVisible();
});

test("explains no results and resets search and range together", async ({ page }) => {
  await page.route("**/api/classes", route => json(route, classes));
  await page.goto("/classes");
  await page.getByRole("searchbox", { name: "Search classes", exact: true }).fill("No matching classroom");
  await expect(page.getByRole("heading", { name: "No classes match these filters", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all classes", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search classes", exact: true })).toHaveValue("");
  await expect(page.getByRole("list", { name: "Classes and seat availability", exact: true }).getByRole("article")).toHaveCount(3);
});

test("applies a chosen range to fresh polled counts without admitting full classes", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/classes", route => {
    requests += 1;
    return json(route, requests === 1 ? classes : classes.map(admissionClass => ({ ...admissionClass, heldSeats: 0, confirmedSeats: admissionClass.totalSeats, availableSeats: 0 })));
  });
  await page.goto("/classes");
  await expect(page.getByRole("list", { name: "Classes and seat availability", exact: true }).getByRole("article")).toHaveCount(3);
  await page.getByRole("slider", { name: "Minimum available seats", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("list", { name: "Classes and seat availability", exact: true }).getByRole("article")).toHaveCount(2);
  await expect.poll(() => requests, { timeout: 5_000 }).toBeGreaterThan(1);
  await expect(page.getByRole("heading", { name: "No classes match these filters", exact: true })).toBeVisible();
});

test("keeps filters usable on a phone and shows range help on focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/classes", route => json(route, classes));
  await page.goto("/classes");
  const help = page.getByRole("button", { name: "About the available seat range", exact: true });
  await help.focus();
  await expect(page.getByRole("tooltip")).toContainText("Choose a minimum and maximum");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("searchbox", { name: "Search classes", exact: true }).fill("arts");
  await expect(page.getByRole("list", { name: "Classes and seat availability", exact: true }).getByRole("article")).toHaveCount(1);
});
