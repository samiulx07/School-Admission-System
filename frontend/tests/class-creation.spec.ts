import { expect, test, type Page, type Route } from "@playwright/test";

const createdClass = { id: "6f1d02e3-4e77-4ea6-83f3-5a3664ae2827", name: "Class 6 Morning", totalSeats: 30 };

async function json(route: Route, body: unknown, status = 201) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function fillClass(page: Page) {
  await page.getByLabel("Class name", { exact: true }).fill(createdClass.name);
  await page.getByLabel("Total seats", { exact: true }).fill(String(createdClass.totalSeats));
}

test("validates required fields and positive whole int32 capacity before sending", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/classes", route => {
    requests += 1;
    return json(route, createdClass);
  });
  await page.goto("/admin/classes/new");
  const name = page.getByLabel("Class name", { exact: true });
  const seats = page.getByLabel("Total seats", { exact: true });
  const submit = page.getByRole("button", { name: "Create class", exact: true });

  await submit.click();
  await expect(name).toBeFocused();
  await expect(page.getByText("Enter a class name.", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter the total number of seats.", { exact: true })).toBeVisible();
  await name.fill("   ");
  await submit.click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill(createdClass.name);

  for (const invalid of ["0", "-1", "1.5", "2147483648"]) {
    await seats.fill(invalid);
    await submit.click();
    await expect(seats).toHaveAttribute("aria-invalid", "true");
    await expect(seats).toBeFocused();
  }
  expect(requests).toBe(0);
});

test("rejects NUL and names beyond the backend character limit", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/classes", route => {
    requests += 1;
    return json(route, createdClass);
  });
  await page.goto("/admin/classes/new");
  const name = page.getByLabel("Class name", { exact: true });
  await page.getByLabel("Total seats", { exact: true }).fill("30");
  await name.fill("Class\0Name");
  await page.getByRole("button", { name: "Create class", exact: true }).click();
  await expect(page.getByText("Remove the unsupported character from the class name.", { exact: true })).toBeVisible();
  await name.evaluate((element) => element.removeAttribute("maxlength"));
  await name.fill("😀".repeat(101));
  await page.getByRole("button", { name: "Create class", exact: true }).click();
  await expect(page.getByText("Use 200 characters or fewer.", { exact: true })).toBeVisible();
  expect(requests).toBe(0);
});

test("submits trimmed details, announces success and opens the created class in the catalogue", async ({ page }) => {
  const requests: unknown[] = [];
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  await page.route("**/api/classes", route => {
    if (route.request().method() === "POST") {
      requests.push(route.request().postDataJSON());
      return json(route, createdClass);
    }
    return json(route, [{ ...createdClass, heldSeats: 0, confirmedSeats: 0, availableSeats: 30 }], 200);
  });
  await page.goto("/admin/classes/new");
  await page.getByLabel("Class name", { exact: true }).fill(`  ${createdClass.name}  `);
  await page.getByLabel("Total seats", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Create class", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Class created", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toBeFocused();
  await expect(page.getByRole("status")).toContainText(createdClass.name);
  await expect(page.getByRole("status")).toContainText("Capacity: 30 places");
  expect(requests).toEqual([{ name: createdClass.name, totalSeats: 30 }]);
  await page.getByRole("link", { name: "View classes", exact: true }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole("article", { name: createdClass.name, exact: true })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("disables form controls while creation is pending", async ({ page }) => {
  let release: (() => void) | undefined;
  let requests = 0;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classes", async route => {
    requests += 1;
    await pending;
    await json(route, createdClass);
  });
  await page.goto("/admin/classes/new");
  await fillClass(page);
  await page.getByRole("button", { name: "Create class", exact: true }).click();
  await expect(page.getByRole("button", { name: "Creating class...", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Class name", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Total seats", { exact: true })).toBeDisabled();
  expect(requests).toBe(1);
  release?.();
  await expect(page.getByRole("heading", { name: "Class created", exact: true })).toBeVisible();
});

for (const problem of [
  { status: 400, body: { title: "Invalid class details", errors: { TotalSeats: ["A class must have a positive capacity."] } }, message: "A class must have a positive capacity." },
  { status: 409, body: { title: "Class conflict", detail: "A class with these details is already on the register." }, message: "A class with these details is already on the register." },
  { status: 502, body: { title: "Admission API unavailable", detail: "The admission API could not be reached." }, message: "The admission API could not be reached." },
]) {
  test(`presents HTTP ${problem.status} problem details and preserves the form for retry`, async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/classes", route => {
      attempts += 1;
      return attempts === 1 ? json(route, problem.body, problem.status) : json(route, createdClass);
    });
    await page.goto("/admin/classes/new");
    await fillClass(page);
    await page.getByRole("button", { name: "Create class", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(problem.message);
    await expect(page.getByLabel("Class name", { exact: true })).toHaveValue(createdClass.name);
    await expect(page.getByLabel("Total seats", { exact: true })).toHaveValue("30");
    await expect(page.getByRole("button", { name: "Create class", exact: true })).toBeEnabled();
    expect(attempts).toBe(1);
    await page.getByRole("button", { name: "Create class", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Class created", exact: true })).toBeVisible();
    expect(attempts).toBe(2);
  });
}

test("does not claim success when the creation response is malformed", async ({ page }) => {
  await page.route("**/api/classes", route => json(route, { name: createdClass.name }));
  await page.goto("/admin/classes/new");
  await fillClass(page);
  await page.getByRole("button", { name: "Create class", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Check the class catalogue before trying again.");
  await expect(page.getByRole("heading", { name: "Class created", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Class name", { exact: true })).toHaveValue(createdClass.name);
});

test("supports a keyboard submission at phone width with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/classes", route => json(route, createdClass));
  await page.goto("/admin/classes/new");
  const name = page.getByLabel("Class name", { exact: true });
  await name.focus();
  await page.keyboard.type(createdClass.name);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Total seats", { exact: true })).toBeFocused();
  await page.keyboard.type("30");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Create class", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Class created", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View classes", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
