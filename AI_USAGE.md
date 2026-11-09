# AI usage

## Tools and scope

OpenAI Codex assists with requirements review, implementation planning, code, tests, and review. The installed Awwwards skill is reserved for the frontend design and visual verification phase. Context7 was queried through its remote MCP endpoint for the official EF Core migration/transaction documentation and Npgsql provider documentation for version 10.0.3.

## Checks and corrections

- The dependency review found that the requested `react-rangeslider` peer versions exclude the required modern React versions. The planned replacement is Radix Slider.
- Publisher metadata showed that selecting every dependency's latest major would conflict with the Next.js lint toolchain. Compatible supported versions will be pinned and verified through installation, builds, and tests.
- Context7 confirmed that EF migrations should use `MigrateAsync` without a surrounding application transaction or `EnsureCreated`. Reservation operations will use their own explicit, parameterized PostgreSQL transactions.
- The initial backend scaffold passed locked restore, a Release build with zero warnings/errors, formatting verification, and an HTTP liveness smoke check. Feature tests are added with their respective features.

Feature-specific implementation corrections and actual verification results will be added as they occur. Test results and tool usage will not be claimed before they have run.
