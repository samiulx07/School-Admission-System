# School Admission System

A concurrency-safe admission API and React portal for reserving and confirming limited school seats.

## Development status

Implementation proceeds in small verified commits: backend first, then the frontend after the backend completion review. The API, Docker configuration, and frontend instructions are added alongside their working features.

## Selected stack

- ASP.NET Core, Entity Framework Core, Npgsql, and PostgreSQL.
- Supabase PostgreSQL for private development; self-contained local PostgreSQL for evaluation and tests.
- Next.js, TypeScript, React Bootstrap, React Context, and component-scoped SCSS for the subsequent frontend phase.

## Repository conventions

Source, migrations, dependency manifests, lockfiles, Dockerfiles, and this documentation belong in Git. Local planning, environment files (including `.env.example`), installed dependencies, and generated outputs do not.

The confidential assignment PDF is intentionally kept outside this repository.
