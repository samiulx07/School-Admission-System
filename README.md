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

Tests use their own temporary PostgreSQL database and API processes, without resetting development data. The test suite is expanded with each feature. The current foundation includes 27 domain cases and two real PostgreSQL schema checks.

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

For native .NET execution, set `ConnectionStrings__Admissions`, `Admission__HoldDurationSeconds`, and `Cors__FrontendOrigin` explicitly in the process environment. .NET does not load `.env` automatically. Migration mode uses only `ConnectionStrings__Migrations`:

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

Summaries include `id`, `name`, `totalSeats`, `heldSeats`, `confirmedSeats`, and `availableSeats`. These endpoints require no identity header. Counts come from PostgreSQL in one projected query; expired pending holds do not occupy seats.

Invalid input returns `400`; missing resources return `404`. Errors use Problem Details with a readable title, stable `code`, and `traceId`. Further endpoints and concurrency behavior are documented with their feature commits.

## Selected stack

- ASP.NET Core, Entity Framework Core, Npgsql, and PostgreSQL.
- Supabase PostgreSQL for private development; self-contained local PostgreSQL for evaluation and tests.
- Next.js, TypeScript, React Bootstrap, React Context, and component-scoped SCSS for the subsequent frontend phase.

## Repository conventions

Source, migrations, dependency manifests, lockfiles, Dockerfiles, and this documentation belong in Git. Local planning, environment files (including `.env.example`), installed dependencies, and generated outputs do not.

The confidential assignment PDF is intentionally kept outside this repository.
