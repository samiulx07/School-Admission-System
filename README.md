# School Admission System

A concurrency-safe admission API and React portal for reserving and confirming limited school seats.

## Development status

Implementation proceeds in small verified commits: backend first, then the frontend after the backend completion review. The API, Docker configuration, and frontend instructions are added alongside their working features.

The backend solution now contains Domain, Application, Infrastructure, and API projects, plus separate unit and PostgreSQL integration test projects. Package versions are centrally pinned and restore lockfiles are committed.

The SDK is pinned to .NET 10.0.403 (stable patch roll-forward). Verify the backend with:

```sh
dotnet restore backend/SchoolAdmission.slnx --locked-mode
dotnet build backend/SchoolAdmission.slnx --configuration Release --no-restore
dotnet format backend/SchoolAdmission.slnx --no-restore --verify-no-changes
```

`/health/live` checks that the HTTP host is running; `/health/ready` verifies the database schema and applied migrations.

## Run the backend with Docker

```sh
docker compose up --build -d backend
```

This starts PostgreSQL 18.6, applies the committed EF migrations once, then starts the API at `http://localhost:8080`. The frontend is added after the backend completion review. No private environment file or cloud account is required for this local mode. PostgreSQL uses a named volume; ordinary `docker compose down` preserves data. `docker compose down --volumes` deliberately deletes local database data.

Run the isolated backend tests with Docker:

```sh
docker compose --profile test run --build --rm backend-tests
```

Tests use their own temporary PostgreSQL database and API processes, without resetting development data. Coverage includes domain lifecycle rules, schema constraints, HTTP contracts, and capacity/duplicate safety across two API processes. The capacity test sends 100 simultaneous requests for 10 seats and requires exactly 10 successful holds.

The backend GitHub Actions workflow runs the same Docker test command on relevant pushes and pull requests. It needs no cloud credentials. Hosted CI execution can be verified after the repository is pushed.

## Supabase development configuration

Create your ignored root `.env` file locally. Environment files, including `.env.example`, are intentionally not included in Git. Set:

```dotenv
SUPABASE_DB_CONNECTION_STRING=Host=<session-pooler-host>;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<password>;SSL Mode=VerifyFull
SUPABASE_MIGRATION_CONNECTION_STRING=<migration-role connection string with SSL Mode=VerifyFull>
HOLD_DURATION_SECONDS=600
FRONTEND_ORIGIN=http://localhost:3000
API_BASE_URL=http://localhost:8080
```

Copy the exact session-pooler hostname and username from your project's Connect panel. Use verified TLS; install/mount the project's trusted CA and add `Root Certificate=<container path>` if your connection requires a custom root. Supabase API keys are unnecessary because only the backend connects to PostgreSQL.

Opt into your Supabase database explicitly:

```sh
docker compose -f docker-compose.yml -f docker-compose.supabase.yml up --build -d backend
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

## Selected stack

- ASP.NET Core, Entity Framework Core, Npgsql, and PostgreSQL.
- Supabase PostgreSQL for private development; self-contained local PostgreSQL for evaluation and tests.
- Next.js, TypeScript, React Bootstrap, React Context, and component-scoped SCSS for the subsequent frontend phase.

## Repository conventions

Source, migrations, dependency manifests, lockfiles, Dockerfiles, and this documentation belong in Git. Local planning, environment files (including `.env.example`), installed dependencies, and generated outputs do not.

The confidential assignment PDF is intentionally kept outside this repository.
