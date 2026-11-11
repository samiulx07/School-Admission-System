import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const initialClasses = [
  { id: "a06c201d-dae9-4c47-ab22-990be9dd953c", name: "Science foundation", totalSeats: 30, heldSeats: 3, confirmedSeats: 7, availableSeats: 20 },
  { id: "540eb64e-26ad-46e5-916b-67f070616fbd", name: "Language and literature", totalSeats: 12, heldSeats: 4, confirmedSeats: 8, availableSeats: 0 },
];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function classRow(page: Page, name = "Science foundation") {
  return page.getByRole("article", { name, exact: true });
}

async function expectCount(row: Locator, label: string, value: string) {
  const count = row.locator("dl > div").filter({ has: row.page().getByText(label, { exact: true }) });
  await expect(count.locator("dd")).toHaveText(value);
}

test("shows real class data and all four seat counts", async ({ page }) => {
  await page.route("**/api/classes", route => json(route, initialClasses));
  await page.goto("/classes");

  await expect(page.getByRole("heading", { level: 1, name: "Find your open place." })).toBeVisible();
  const row = classRow(page);
  await expect(row).toBeVisible();
  await expectCount(row, "Total seats", "30");
  await expectCount(row, "Held", "3");
  await expectCount(row, "Confirmed", "7");
  await expectCount(row, "Available", "20");
  await expect(classRow(page, "Language and literature").getByText("No places available", { exact: true })).toBeVisible();
});

test("keeps maximum-capacity seat counts readable on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route("**/api/classes", route => json(route, [{
    ...initialClasses[0],
    totalSeats: 2_147_483_647,
    heldSeats: 0,
    confirmedSeats: 0,
    availableSeats: 2_147_483_647,
  }]));
  await page.goto("/classes");

  const row = classRow(page);
  await expectCount(row, "Total seats", "2,147,483,647");
  await expectCount(row, "Available", "2,147,483,647");
  for (const value of await row.locator("dd").all()) {
    expect(await value.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect((await value.boundingBox())!.height).toBeLessThan(30);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("shows loading until the API responds and then the empty state", async ({ page }) => {
  let finish: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await page.route("**/api/classes", async route => {
    await pending;
    await json(route, []);
  });
  await page.goto("/classes");
  await expect(page.getByRole("status")).toContainText("Opening the class register");
  finish?.();
  await expect(page.getByRole("heading", { name: "No classes on the register yet" })).toBeVisible();
  await expect(page.getByText("Create a class to open the first places for applications.", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("recovers from an initial API failure through the retry button", async ({ page }) => {
  let fail = true;
  await page.route("**/api/classes", route => fail
    ? json(route, { title: "Service unavailable" }, 503)
    : json(route, initialClasses));
  await page.goto("/classes");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("The class register could not load");
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(classRow(page)).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("polls new seat counts after three seconds without reloading", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/classes", route => {
    requests += 1;
    const classes = requests === 1 ? initialClasses : [
      { ...initialClasses[0], heldSeats: 5, confirmedSeats: 8, availableSeats: 17 },
      initialClasses[1],
    ];
    return json(route, classes);
  });
  await page.goto("/classes");
  await expectCount(classRow(page), "Available", "20");
  await expect.poll(() => requests, { timeout: 5_000 }).toBeGreaterThan(1);
  await expectCount(classRow(page), "Held", "5");
  await expectCount(classRow(page), "Confirmed", "8");
  await expectCount(classRow(page), "Available", "17");
});

test("keeps last received counts visible when a background refresh fails", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/classes", route => {
    requests += 1;
    return requests === 1 ? json(route, initialClasses) : json(route, { title: "Service unavailable" }, 503);
  });
  await page.goto("/classes");
  await expectCount(classRow(page), "Available", "20");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Seat availability could not refresh", { timeout: 5_000 });
  await expectCount(classRow(page), "Available", "20");
  await expect(page.getByText("Showing the last available counts", { exact: true })).toBeVisible();
});

test("keeps capacity visible under reduced motion and on a phone", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/classes", route => json(route, initialClasses));
  await page.goto("/classes");
  await expectCount(classRow(page), "Available", "20");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(classRow(page).getByText("Open for applications", { exact: true })).toBeVisible();
});
