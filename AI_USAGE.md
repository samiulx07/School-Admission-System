# AI usage

## Tools and scope

OpenAI Codex assists with requirements review, implementation planning, code, tests, and review. The installed Awwwards skill is reserved for the frontend design and visual verification phase. Context7 was queried through its remote MCP endpoint for the official EF Core migration/transaction documentation and Npgsql provider documentation for version 10.0.3.

## Checks and corrections

- The dependency review found that the requested `react-rangeslider` peer versions exclude the required modern React versions. The planned replacement is Radix Slider.
- Publisher metadata showed that selecting every dependency's latest major would conflict with the Next.js lint toolchain. Compatible supported versions will be pinned and verified through installation, builds, and tests.
- Context7 confirmed that EF migrations should use `MigrateAsync` without a surrounding application transaction or `EnsureCreated`. Reservation operations will use their own explicit, parameterized PostgreSQL transactions.
- The initial backend scaffold passed locked restore, a Release build with zero warnings/errors, formatting verification, and an HTTP liveness smoke check. Feature tests are added with their respective features.
- The domain model passed 27 unit cases on .NET SDK 10.0.403, including strict string identifiers, expiry boundaries and terminal/idempotent lifecycle transitions. Capacity and ownership still require their application/database feature tests.
- The database foundation passed fresh and repeated migrations, HTTP readiness, a Docker Release build, and both real PostgreSQL schema tests. The exact staged source was verified separately from prepared endpoint work. WSL's idle shutdown interrupted an initial run; keeping the WSL session active restored stable Docker verification. No cloud database was accessed.
- Class endpoint integration tests caught an AI implementation error: adding a second `traceId` through `ControllerBase.Problem` made expected 400/404 responses become 500. Updating the existing extensions fixed it. Review also corrected a test that unnecessarily required a relative Location URL. The final Docker suite passed 27 unit and five integration tests, with no skips.
- Reservation implementation passed independent concurrency review and the Docker suite: 27 unit and 12 integration tests, with no skips. Across two API processes, 100 requests for 10 seats produced exactly 10 holds; 100 requests for one student/class produced one hold. Stored allocations and public counts were checked. The local connection pools were bounded to leave PostgreSQL connection headroom under that workload.
- Confirmation passed 27 unit and 17 integration tests in Docker. One hundred concurrent owned confirmations across two API processes all succeeded with one stored allocation. A database-observed lock-wait test held confirmation until after expiry and verified rejection, exercising the fresh-clock requirement rather than merely checking sequential expiry.

Feature-specific implementation corrections and actual verification results will be added as they occur. Test results and tool usage will not be claimed before they have run.
