# AI usage

## Tools and scope

OpenAI Codex assists with requirements review, implementation planning, code, tests, and review. The installed Awwwards skill is reserved for the frontend design and visual verification phase. Context7 will be used for version-specific library documentation when its connection is available; documentation lookups and their outcome will be recorded here.

## Checks and corrections

- The dependency review found that the requested `react-rangeslider` peer versions exclude the required modern React versions. The planned replacement is Radix Slider.
- Publisher metadata showed that selecting every dependency's latest major would conflict with the Next.js lint toolchain. Compatible supported versions will be pinned and verified through installation, builds, and tests.

Feature-specific implementation corrections and actual verification results will be added as they occur. Test results and tool usage will not be claimed before they have run.
