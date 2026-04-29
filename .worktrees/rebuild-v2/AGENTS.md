# Agent Instructions

## Code Standards

- **Barrel Imports:** Barrel importing (e.g., `import { X } from "../"`) is **strictly prohibited** in this project to improve build performance and tree-shaking. Always import directly from the specific file (e.g., `import { X } from "../components/MyComponent"`).
- **File Size Limit:** Never go above 250 lines in each file unless absolutely required. Refactor components or logic into different files if they exceed this limit.
- **No Inline Helper Functions:** Always separate helper functions out into their own utilities or files. Do not define inline helper functions within components or main logic flows.
- **Testing:** Write test scripts for every file and feature. Every implementation must be accompanied by comprehensive tests.

## Workspace Rules

- **Bun Cache:** All package installations must happen within the local `.bun/cache` directory. This is configured in `bunfig.toml` to ensure a fully isolated and deterministic local environment.
- **ElysiaJS Patterns:** Use plugin-based composition (`new Elysia().use(...)`) instead of middleware. Ensure all routes use TypeBox validation for params, body, and query. Group routes logically under `/api`.
- **Voting-Based Agent Spawning:** When complex architectural decisions or multifaceted implementations arise, agents should spawn sub-agents to "vote" or propose competing implementations, synthesizing the best approach before finalizing the code.
