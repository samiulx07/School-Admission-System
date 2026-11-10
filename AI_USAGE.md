# AI usage

OpenAI Codex assisted with reading the assignment, planning the layered architecture, implementing backend and frontend features, writing tests, reviewing changes, and preparing feature commits. The assignment requirements remained the acceptance criteria; generated code was reviewed and tested before its feature commit.

The installed Awwwards skill guided the frontend's three-concept exercise, selected classroom-capacity concept, typography, responsive layout, interaction feedback, and production browser review. Decisions are recorded in `DESIGN.md`. Context7's remote MCP endpoint supplied official guidance for EF Core/Npgsql migrations, React Context, TanStack Query cancellation and polling, Axios AbortSignal support, form validation, component libraries, and standalone Next.js deployment. Relevant documentation shipped with the installed Next.js version was also consulted. No connected Supabase project was modified: the user will provide separate credentials locally.

AI-generated work required corrections:

- Initial Problem Details code added an existing `traceId` twice, causing expected client errors to become server errors. Integration tests exposed this; updating the existing extension fixed it.
- Review added explicit NUL rejection for PostgreSQL class names and support for the assignment's literal `HOLD_DURATION_SECONDS` environment variable. Database-observed tests corrected lock-wait assumptions and verified that confirmation reads fresh time after acquiring a class lock.
- Independent PDF review caught the requirement for a registration input at the top of every page. A shared Context-backed control was added.
- Browser review corrected cramped phone navigation, incomplete Bootstrap palette variables, reduced-motion cleanup, and stale identity feedback. Async dialogs guard against obsolete identities. Server-rendered records keep decisions disabled until a fresh client status check succeeds.
- Several browser selectors initially targeted hidden library inputs or ambiguous status roles. Tests were narrowed to visible controls and the intended application regions.
- Dependency review replaced incompatible `react-rangeslider` with Radix Slider. Compatible TypeScript/ESLint versions remain pinned; ESLint 9 has an upstream end-of-life warning. A scoped transitive minimatch override resolved an audit finding without a forced dependency upgrade.

Recorded local verification passed 29 backend unit tests and 29 PostgreSQL/HTTP integration tests, including 100 requests for 10 seats across two API processes on ports 8080/8081, duplicate requests, lifecycle races, and autonomous expiry without admission traffic. Restart and ordinary Compose down/up preserved data. Frontend verification passed 68 regular checks and four real browser-to-API-to-PostgreSQL flows covering confirmation/reload, cancellation/reapplication, natural expiry, and full browser shutdown/reopening with a persistent profile. Package audits reported no known vulnerabilities at that check. Two production visual passes covered seven page types; the final audit had zero failures or warnings. A fresh independent critic inspected all 174 final screenshots and scored the visual design overall 7.0/10; no award claim is made.

GitHub Actions workflows contain repeatable checks; hosted CI execution and a GitHub push are not claimed. Private environment files, local plans, test artifacts and the assignment PDF are excluded from commits.
