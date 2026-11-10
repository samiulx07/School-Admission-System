# Frontend development

Use the root README for Docker startup and API configuration. This frontend uses Next.js App Router, React, React Bootstrap and colocated Sass modules.

For native development, install the versions in `.nvmrc` and `packageManager`, then run:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. The server API proxy uses `API_BASE_URL`, defaulting to `http://localhost:8080` for native development. Docker supplies `http://backend:8080`. Browser Axios requests use `/api`; database configuration stays in the backend.

Metadata, social image URLs, robots and the sitemap use `SITE_URL` during the production build. Set it before `npm run build` for native deployments. Docker Compose passes `FRONTEND_ORIGIN` as the build value, defaulting to `http://localhost:3000`; rebuild the frontend image after changing that origin.

Before committing a feature:

```sh
npm run lint
npm run typecheck
npm run build
```

Reusable visual components, layouts, menus and main views have paired `.tsx` and `.module.scss` files. Keep page entrypoints thin. Use imported React Icons; authored SVG markup/assets are excluded. Client identity belongs in Context, while server state and request cancellation belong in TanStack Query and Axios.

The `/student` page validates and remembers a 17-digit registration number. Changing or clearing it cancels private requests and clears student-specific caches. Blocked browser storage keeps the current tab usable.

The **Student ID** input at the top of every page accepts the same 17-digit birth registration number. Both controls share Context and stay synchronized. The dedicated page also clears the number for shared devices.

With the Docker app running, install Chromium once and run the identity checks:

```sh
npx playwright install chromium
npx playwright test tests/student-identity.spec.ts tests/student-queries.spec.ts
```

Set `PLAYWRIGHT_BASE_URL` to test a different running frontend. Browser tests use fresh browser contexts; query-isolation checks run directly against TanStack Query.

The `/classes` register polls every three seconds while active, displays all four seat counts, and retains the last counts with a warning if refresh fails. Run `npx playwright test tests/catalogue.spec.ts tests/navigation.spec.ts` for polling, recovery, reduced-motion and phone-menu checks. These tests use controlled API fixtures.

Use **Create class** in the navigation to open `/admin/classes/new`. Enter a class name and positive whole-number capacity; successful creation links back to the catalogue. Run `npx playwright test tests/class-creation.spec.ts` for validation, pending, success and service-error checks.

After setting a student number, choose **Reserve a place** in the register. `/applications/{holdId}` shows the public status and deadline, and checks ownership against the current student's history. Its countdown uses server time and a monotonic browser clock. Run `npx playwright test tests/reservation.spec.ts` for reservation, expiry and identity-switch checks.

For an owned, unexpired hold, **Pay fee & confirm** simulates successful fee payment and confirms admission; no money is collected. **Cancel hold** releases a pending place. Both actions ask for a decision and disable opposing actions while pending. Run `npx playwright test tests/hold-actions.spec.ts` for lifecycle, ownership, error and race checks.

**My applications** opens the current student's history at `/applications`. Filter by status, class and inclusive application dates in this device's timezone. The catalogue also supports debounced name search and an available-seat range. Run `npx playwright test tests/history.spec.ts tests/filters.spec.ts` for history isolation, filtering, polling and keyboard checks.

## Complete browser verification

Frontend browser checks additionally require the pinned Node/npm toolchain and Chromium. From the repository root, start a disposable local stack with Docker Compose 2.24.4 or newer:

```sh
docker compose -p admissions-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --wait frontend
```

Its frontend is at `http://127.0.0.1:3001`, API at `http://127.0.0.1:8081`, and PostgreSQL volume belongs only to `admissions-e2e`. The override always selects local PostgreSQL and uses 20-second holds.

From `frontend`, install Chromium once and run both suites. In PowerShell:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3001"
npx playwright test
npx playwright test --config=playwright.live.config.ts
```

For Bash, set the same variable with `export PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001`. On Linux, `npx playwright install --with-deps chromium` also installs browser system dependencies.

The regular suite uses controlled API fixtures and direct query-cache checks. The separate live suite creates classes, sets leading-zero IDs, reserves, confirms, cancels, reapplies and waits for real expiry through the UI without network mocking. It checks persistence, history, seat counts and disabled expired payment controls.

Remove only this disposable project from the repository root:

```sh
docker compose -p admissions-e2e -f docker-compose.yml -f docker-compose.e2e.yml down --volumes --remove-orphans
```

Keep the explicit project name when starting or cleaning up. The frontend GitHub Actions workflow runs these same checks on an isolated hosted runner after a repository push; hosted execution is not yet verified locally.
