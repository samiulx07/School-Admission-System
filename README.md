# School Admission System

A concurrency-safe admission API and React portal for reserving and confirming limited school seats.

## Application

The backend and frontend implement class creation, live seat availability, temporary reservations, simulated fee confirmation, cancellation, and student application history. Enter a 17-digit birth registration number in the input at the top of any page; the dedicated student page also manages and clears the saved number.

The backend was completed and reviewed before frontend implementation. Work is recorded in small feature commits. Supabase connectivity awaits the user's separately supplied credentials; the local Docker application and tests require no cloud account.

The backend solution now contains Domain, Application, Infrastructure, and API projects, plus separate unit and PostgreSQL integration test projects. Package versions are centrally pinned and restore lockfiles are committed.

The SDK is pinned to .NET 10.0.403 (stable patch roll-forward). Verify the backend with:

```sh
dotnet restore backend/SchoolAdmission.slnx --locked-mode
dotnet build backend/SchoolAdmission.slnx --configuration Release --no-restore
dotnet format backend/SchoolAdmission.slnx --no-restore --verify-no-changes
```

`/health/live` checks that the HTTP host is running; `/health/ready` verifies the database schema and applied migrations.

## Run with Docker

Use current Docker Engine or Docker Desktop with Compose v2. On Windows with a WSL-only engine, keep the WSL distribution running while using the application.

```sh
docker compose up --build --wait
```

Open the frontend at **http://localhost:3000**. The API is available at **http://localhost:8080**. Compose starts PostgreSQL 18.6, applies the committed EF migrations, and waits for healthy backend and frontend services. A fresh clone needs only Docker with Compose; no private environment file is required.

Start with **Create class**, then **Classes** to reserve a place using your saved student number. Open the reservation to confirm its simulated fee or cancel it. **My applications** keeps previous and current applications. No real money is collected.

PostgreSQL uses a named volume; ordinary `docker compose down` preserves data. `docker compose down --volumes` deliberately deletes local database data. To start just the backend and its dependencies, use `docker compose up --build -d backend`.

### Windows with Docker inside WSL

Pass your repository's WSL path to `--cd`. For example, a checkout at `G:\test\school-admission-system` uses `/mnt/g/test/school-admission-system`.

From PowerShell:

```powershell
wsl.exe -d Ubuntu-24.04 --cd /mnt/g/test/school-admission-system --exec docker compose up --build
```

From Git Bash, disable its automatic path conversion for this command:

```bash
MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu-24.04 --cd /mnt/g/test/school-admission-system --exec docker compose up --build
```

Keep the foreground command running while using the app; press Ctrl+C to stop it. If WSL reports `ERROR_PATH_NOT_FOUND` only in Git Bash, first check that the conversion-disabling prefix is present.

## Frontend

The frontend uses pinned Next.js 16 / React 19 dependencies, React Bootstrap, Sass modules, Context and TanStack Query with Axios. Forms use React Hook Form and Zod. React Select, Day.js, React Datepicker, Radix Slider, use-debounce, React Icons, react-scroll, react-tooltip, and SweetAlert2 support the admission workflows. Its toolchain uses Node 26 LTS and npm 12. TypeScript and ESLint versions match the framework's lint peer constraints.

Seat counts refresh every three seconds. Holds use a server-calibrated countdown, and payment is disabled when a hold expires. Saved identity survives reloads; changing it cancels private requests and clears the previous student's cache. Loading, empty, conflict, unavailable-service and retry states accompany the features. Search, available-seat ranges, and history filters are optional conveniences.

The frontend reads `API_BASE_URL` on the server at request time. Its Docker default is `http://backend:8080`; use that hostname in the root Compose `.env` file. Native frontend development defaults to `http://localhost:8080`. Browser requests use same-origin `/api`, keeping database configuration out of the client. Docker Compose passes `FRONTEND_ORIGIN` into the frontend build for canonical, social image and sitemap URLs; rebuild the frontend image after changing it. Native builds use `SITE_URL`, defaulting to `http://localhost:3000`. See [frontend development](frontend/README.md) for native checks.

## Tests

Run the isolated backend tests with Docker:

```sh
docker compose --profile test run --build --rm backend-tests
```

Stop and remove only the disposable test services afterward:

```sh
docker compose --profile test rm --stop --force backend-tests test-api test-api-secondary test-expiry-api test-migrate test-db
```

Tests use their own temporary PostgreSQL database and API processes, without resetting development data. Coverage includes domain lifecycle rules, schema constraints, HTTP contracts, and capacity/duplicate safety across two API processes. The capacity test sends 100 simultaneous requests for 10 seats and requires exactly 10 successful holds.

For frontend checks, use the pinned Node/npm versions in `frontend/.nvmrc` and `frontend/package.json`. From `frontend`:

```sh
npm ci
npm run lint
npm run typecheck
```

The [complete browser verification instructions](frontend/README.md#complete-browser-verification) start a separate `admissions-e2e` Docker project at ports 3001/8081, then run the regular Playwright suite and real UI-to-API-to-PostgreSQL flows. Keep its explicit project name when cleaning up; its database is separate from development. The live suite uses 20-second holds and real responses, including natural expiry.

Latest recorded verification passed **58 backend tests** (29 unit and 29 integration), **69 frontend checks**, and **four real admission flows**, without skips. Frontend checks include identity isolation, validation, polling, filtering, lifecycle actions, large-capacity phone layouts, and browser recovery. Real flows cover confirmation and reload, cancellation and reapplication, expiry with disabled payment and released seats, and closing the entire browser before reopening the same isolated profile to recover a held application.

Backend and frontend GitHub Actions workflows contain the same verification commands and need no cloud credentials. Hosted CI execution is not claimed; it can be checked after the repository is pushed. The local repository has no Git remote configured; publication to a public GitHub repository and submission of its link have not been verified.

## Supabase development configuration

Create your ignored root `.env` file locally. Environment files, including `.env.example`, are intentionally not included in Git. Set:

```dotenv
SUPABASE_DB_CONNECTION_STRING=Host=<session-pooler-host>;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<password>;SSL Mode=VerifyFull
SUPABASE_MIGRATION_CONNECTION_STRING=<migration-role connection string with SSL Mode=VerifyFull>
HOLD_DURATION_SECONDS=600
FRONTEND_ORIGIN=http://localhost:3000
API_BASE_URL=http://backend:8080
```

Copy the exact session-pooler hostname and username from your project's Connect panel. Use verified TLS; store optional certificates under ignored `.local/certs`, mount the trusted CA, and add `Root Certificate=<container path>` if your connection requires a custom root. Supabase API keys are unnecessary because only the backend connects to PostgreSQL.

Opt into your Supabase database explicitly:

```sh
docker compose -f docker-compose.yml -f docker-compose.supabase.yml up --build -d
```

The override requires both private connection strings and removes the local database dependency. There is no automatic database fallback. Cloud connectivity awaits the user's separately supplied development credentials.

Application tables and EF history live in the private `admissions` schema. Migrations revoke access from `PUBLIC` and, when present, Supabase's `anon`/`authenticated` roles. Keep this schema out of exposed Data API schemas. If using distinct database roles, the migration role needs schema DDL permissions; grant the runtime role `USAGE` on `admissions` and `SELECT, INSERT, UPDATE` on its tables. The runtime role does not run migrations.

For native .NET execution, set `ConnectionStrings__Admissions`, `HOLD_DURATION_SECONDS`, and `Cors__FrontendOrigin` explicitly in the process environment. `HOLD_DURATION_SECONDS`, when present, overrides `Admission__HoldDurationSeconds`; otherwise that nested setting or the default `600` is used. .NET does not load `.env` automatically. Migration mode uses only `ConnectionStrings__Migrations`:

```sh
dotnet run --project backend/src/SchoolAdmission.Api -- --migrate
dotnet run --project backend/src/SchoolAdmission.Api
```

To author a new migration, restore the pinned EF tool with `dotnet tool restore`, set `ConnectionStrings__Migrations` explicitly, then use `dotnet ef migrations add <Name> --project backend/src/SchoolAdmission.Infrastructure --output-dir Persistence/Migrations`. Never use `EnsureCreated` with the migration-managed database.

## Implemented API

| Request | Result |
| --- | --- |
| `POST /classes` with `{ "name": "Class 6 - Morning", "totalSeats": 10 }` | `201` with `{id,name,totalSeats}` and a detail Location |
| `GET /classes` | `200` with an array of class seat summaries |
| `GET /classes/{classId}` | `200` with one seat summary |
| `POST /classes/{classId}/holds` with `X-Student-Id` | `201` with `{holdId,classId,studentId,status,expiresAt,createdAt,serverNow}` |
| `GET /holds/{holdId}` | `200` with the hold's current status and timestamps |
| `POST /holds/{holdId}/confirm` with `X-Student-Id` | `200` with `{holdId,status:"CONFIRMED"}` |
| `DELETE /holds/{holdId}` with `X-Student-Id` | `204` with an empty body |
| `GET /me/holds` with `X-Student-Id` | `200` with the current student's application history and class names |

Summaries include `id`, `name`, `totalSeats`, `heldSeats`, `confirmedSeats`, and `availableSeats`. These endpoints require no identity header. Counts come from PostgreSQL in one projected query; expired pending holds do not occupy seats.

Student identifiers must be exactly 17 ASCII digits in a single `X-Student-Id` header. They remain strings, preserving leading zeros. Hold-status reads remain public and omit the student's identifier. History includes previous applications as well as current ones.

Reservations use short `READ COMMITTED` PostgreSQL transactions. Every allocation writer first locks the class row, then obtains fresh database time, retires elapsed holds, and checks uniqueness and capacity. The partial unique index protects active applications; counts are derived from stored holds. This works across API processes. Local API pools are limited to 20 connections per process, keeping the concurrent HTTP tests below PostgreSQL's connection limit.

`HOLD_DURATION_SECONDS` defaults to `600`. A hold's `serverNow` lets the frontend account for clock differences. Expired pending holds immediately read as `EXPIRED`; reservation transactions persist expiry before reapplication.

The autonomous worker also persists overdue holds as `EXPIRED` without admission requests. It runs at startup and every second, creating a fresh database scope per pass. Each transaction locks at most 100 due classes with `FOR UPDATE SKIP LOCKED`, reads fresh database time after locking, and updates only overdue `HELD` rows. Busy classes are retried on a later tick; multiple API instances can run the worker safely. Confirmed and cancelled applications remain unchanged.

Only the owner can confirm an unexpired pending hold. Repeating that owner's successful confirmation returns `200` without allocating another seat, including after the original deadline. Ownership is checked before idempotent success. The confirmation decision uses fresh database time after any class-lock wait.

Only the owner can cancel an unexpired pending hold. Cancellation releases its seat; repeating the owner's cancellation returns an empty `204`. Confirmed admissions are final and expired holds cannot be cancelled. After cancellation, the student may create a new hold. Concurrent confirmation and cancellation serialize on the same class lock, so exactly one transition wins.

Invalid input returns `400`; changing another student's hold returns `403`; missing resources return `404`; exhausted capacity, duplicate active applications, or forbidden lifecycle transitions return `409`. Errors use Problem Details with a readable title, stable `code`, and `traceId`.

## Backend completion checks

The completion review passed 29 unit and 29 PostgreSQL/HTTP integration tests in Docker, with no skips. This includes 100-request capacity, duplicate-student, confirmation and cancellation workloads across two API processes, expiry boundaries after observed lock waits, and automatic persisted expiry without admission requests.

Additional local checks passed API restart, startup expiry recovery observed through PostgreSQL, and ordinary Compose down/up persistence. The default duration was verified as 600 seconds; invalid duration fails startup. Release builds and formatting passed on the pinned SDK. A NuGet vulnerability audit found no vulnerable direct or transitive backend packages at this review.

## Selected stack

- ASP.NET Core, Entity Framework Core, Npgsql, and PostgreSQL.
- Supabase PostgreSQL for private development; self-contained local PostgreSQL for evaluation and tests.
- Next.js, TypeScript, React Bootstrap, React Context, TanStack Query and component-scoped SCSS for the frontend.

## Repository conventions

Source, migrations, dependency manifests, lockfiles, Dockerfiles, and this documentation belong in Git. Local planning, environment files (including `.env.example`), installed dependencies, and generated outputs do not.

The confidential assignment PDF is intentionally kept outside this repository.
