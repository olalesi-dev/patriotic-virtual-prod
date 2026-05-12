# Cashent Frontend Handoff

Snapshot date: 2026-05-08. This captures the reusable frontend patterns from `apps/web` for agents building a similar monorepo. It is frontend-only guidance. Backend business rules stay backend-owned and API-enforced.

## Source Files

- App package: `apps/web`
- Routes: `apps/web/src/routes`
- Generated route tree: `apps/web/src/routeTree.gen.ts` (never edit)
- Router factory: `apps/web/src/router.tsx`
- Root document: `apps/web/src/routes/__root.tsx`
- App shell/providers: `apps/web/src/components/app-shell.tsx`, `apps/web/src/components/app-providers.tsx`
- Dashboard route graph: `apps/web/src/lib/dashboard-routes.ts`
- UI primitives: `apps/web/src/components/ui`
- Global CSS/theme: `apps/web/src/styles.css`, `apps/web/src/theme-init.js`, `apps/web/src/lib/theme.ts`
- shadcn config: `apps/web/components.json`
- Vite/Start config: `apps/web/vite.config.ts`
- API wrapper: `apps/web/src/lib/api.ts`

## Stack

- Runtime and package manager: Bun `1.3.11`
- Framework: TanStack Start + React 19
- Routing: TanStack Router file-based routes
- Rendering: SSR enabled, RSC enabled, selective static pre-rendering
- Server state: TanStack Query + `@tanstack/react-router-ssr-query`
- Forms: TanStack Form for schema/entity forms, controlled React state for transaction forms
- Tables: TanStack Table column definitions plus local table primitives
- UI state: Zustand vanilla stores with selector hooks
- Styling: Tailwind CSS v4, shadcn/ui base-nova, Base UI, CSS variables
- Icons/toasts: `lucide-react`, `sonner`
- Build/deploy: Vite 8, Nitro preset `bun`, OXC minify, Lightning CSS
- React Compiler: `@vitejs/plugin-react` compiler preset through Rolldown Babel
- Tooling: Oxlint, Oxfmt, `tsgo`, Bun test

## Package Boundaries

`apps/web` consumes frontend-safe packages: `@workspace/shared`, `@workspace/config`, `@workspace/api-client`, and local `~/*` modules. It must not import database code, `packages/core`, backend-only auth internals, or Node-only business logic. The frontend serializes UI state, calls APIs, renders permissions, and displays lifecycle actions. Stock, VAT, audit, document finalization, cancellation, and negative-stock prevention remain backend/domain concerns.

Use local aliases:

```ts
import { Button } from '~/components/ui/button';
import { getApiClient } from '~/lib/api';
import type { ProductDto } from '@workspace/shared';
```

## Commands

Run from the repo root unless a package script explicitly needs app-local context:

```bash
bun run --filter @workspace/web dev
bun run --filter @workspace/web lint
bun run --filter @workspace/web typecheck
bun run --filter @workspace/web test
bun run --filter @workspace/web build
```

Web scripts are `vite`, `bun --bun vite build`, `bun run .output/server/index.mjs`, `oxlint src vite.config.ts --ignore-pattern src/routeTree.gen.ts`, `tsgo --noEmit`, and `bun test ./src --pass-with-no-tests`.

## Vite And Start

Keep plugin ordering from `apps/web/vite.config.ts`:

```ts
plugins: [
  devtools(),
  tailwindcss(),
  tanstackStart({ rsc: { enabled: true }, srcDirectory: 'src', prerender: {...} }),
  rsc(),
  viteReact(),
  babel({ presets: [reactCompiler] }),
  nitro({ preset: 'bun' }),
]
```

Important config:

- `envDir` is the workspace root.
- `WEB_PORT` sets the dev port and defaults to `3000`.
- `resolve.tsconfigPaths` is enabled.
- `lucide-react` is excluded from optimize deps.
- Build target is `baseline-widely-available`.
- CSS minify is `lightningcss`; JS minify is `oxc`.
- React Compiler uses `reactCompilerPreset({ compilationMode: 'infer', target: '19' })`.
- The compiler filter is restricted to `.tsx`.
- Nitro uses `preset: 'bun'`.
- Do not add a separate TanStack Router plugin unless Start is intentionally replaced. Start owns route generation here.

## Routing

Routes live under `src/routes`; `routeTree.gen.ts` is generated. Use `createFileRoute`, `createRootRouteWithContext`, `Outlet`, `Link`, and typed route hooks from TanStack Router.

Conventions:

- `__root.tsx` owns the document shell, metadata, links, global scripts, providers, and root error/not-found views.
- Route groups such as `(auth)` do not affect URLs. `(auth)/sign-in.tsx` maps to `/sign-in`.
- Files beginning with `-` are private route helpers/tests and do not become routes.
- Parent layout routes render `<Outlet />`; examples include `sales.tsx`, `settings.tsx`, and `master-data/route.tsx`.
- Dynamic params use `$param`, for example `sales.$saleId.tsx` and `master-data/products/$recordId.edit.tsx`.
- Use `validateSearch` plus search parsers for query state.
- Use `search: { middlewares: [stripSearchParams(defaults)] }` to keep URLs clean.
- Use `loaderDeps` when loader cache identity depends on search.
- Use route `head` for title, description, and `robots`.

Authenticated routes should usually spread `buildAuthenticatedRouteOptions(routeId)` or `buildAuthenticatedRouteLayoutOptions()`. These add `ssr: true` and private no-store cache headers.

## Root Document And Providers

`router.tsx` creates one QueryClient per router and passes it in route context. `__root.tsx` renders `HeadContent`, CSS links, `theme-init.js`, `AppProviders`, `AppShell`, lazy devtools in development, and `Scripts`.

Provider order:

1. `ThemeProvider`
2. `TooltipProvider`
3. `SessionProvider`
4. `AppToaster`

`theme-init.js` runs before app hydration to apply `light` or `dark` classes and `data-theme` on `<html>`, preventing theme flash.

## SSR, Pre-rendering, And RSC

TanStack Start route code is isomorphic by default. Loaders can run on both server and client, so do not read DB clients, secrets, `process.env` secrets, or Node-only APIs directly in loaders. Use API calls, `createServerFn`, or server-only boundaries.

Current policy:

- Authenticated pages are SSR with `Cache-Control: private, no-store`.
- `/sign-in` is SSR with `private, no-store` and `Vary: Cookie`.
- `/accept-invite` is SSR with no-store behavior.
- Vite pre-renders only `/sign-in` to `/sign-in/index.html`.
- Static path auto discovery and link crawling are disabled.

RSC is used selectively for server-rendered shells with client-filled slots:

- Server helper uses `createServerFn({ method: 'GET' })`.
- Helper returns a `src` from `createCompositeComponent`.
- Route loader calls the helper.
- Route component renders `<CompositeComponent src={src}>` with interactive children or render props.

Examples: `routes/(auth)/-sign-in-shell-rsc.tsx`, `routes/(auth)/sign-in.tsx`, `routes/-dashboard-page-shell-rsc.tsx`, and `components/dashboard/dashboard-page-shell.tsx`. Use `renderServerComponent` only for simple no-slot fragments, as in `routes/notes.tsx`.

## Router And Query

`router.tsx` sets `defaultPreload: 'intent'`, `defaultPreloadStaleTime: 0`, `scrollRestoration: true`, and `setupRouterSsrQueryIntegration({ router, queryClient })`.

Query defaults from `lib/query-client.ts`:

- `staleTime: 30_000`
- `gcTime: 300_000`
- `refetchOnWindowFocus: false`

Route loaders should call `context.queryClient.ensureQueryData(queryOptions(...))`. Route components should read the same options with `useSuspenseQuery` when the loader guarantees data. Use `useQuery` for client-owned, non-blocking, or interactive data. After mutations, invalidate the smallest query key set that covers visible stale UI; sales mutations also invalidate receivables surfaces.

## API Layer

Use `getApiClient()` from `~/lib/api` for generated OpenAPI calls. `getApiBaseUrl()` reads `VITE_API_BASE_URL` or falls back to `http://localhost:3001`.

`apiFetch` behavior:

- always sends `credentials: 'include'`
- preserves request headers
- forwards SSR `cookie`, `authorization`, `user-agent`, and `x-forwarded-for`
- unwraps envelopes through `readApiResponse` and `readApiResponseEnvelope`
- normalizes error messages with `getApiErrorMessage`

Use raw `apiFetch` only for cases the generated client cannot express cleanly: 404-as-null detail fetches, uploads, file/download URLs, or unusual response shapes.

## Auth And Access

`SessionProvider` owns `['auth', 'session']`, calls `/api/auth/session`, exposes permission helpers, and commits/clears session data through Query cache writes. Better Auth-specific client calls live in `lib/better-auth-client.ts`.

`AppShell` gates route content:

- auth routes render a centered auth shell
- unauthenticated users see sign-in and accept-invite actions
- MFA enrollment-required users are redirected or blocked to `/settings/security`
- authenticated users get `DashboardShell`
- unauthorized users get an in-shell unauthorized panel

Do not duplicate permission rules in components. Navigation visibility and access are derived from `lib/dashboard-routes.ts` and `lib/access-control.ts`.

## Dashboard Shell

The authenticated UI uses a detached dashboard shell:

- `DashboardShell` owns viewport padding, sidebar open state, header, content panel, and scroll area.
- Sidebar preference persists at `cashent.dashboard.sidebar.open`.
- `DashboardSidebar` renders grouped, permission-aware routes from metadata.
- `DashboardHeader` renders breadcrumbs, page title, description, mobile trigger, optional actions, and route-aware back button.
- `DashboardUserMenu` owns profile/security links, theme selection, and sign-out.

To add a page: add a `DashboardRouteDefinition`, create the file route, spread `buildAuthenticatedRouteOptions(routeId)`, and let the shell derive labels, permissions, breadcrumbs, title, and sidebar state.

## shadcn, Base UI, And Components

`components.json` configures TanStack Start, Tailwind v4, `src/styles.css`, base-nova, Base UI, lucide icons, and aliases `~/components`, `~/components/ui`, `~/lib`, and `~/hooks`. Installed primitives include button, badge, breadcrumb, card, dialog, dropdown-menu, field, form, input, input-group, select, sheet, sidebar, skeleton, sonner, table, toggle-group, tooltip, and related controls.

Composition rules:

- Import primitives from `~/components/ui/*`.
- Use Base UI `render={<Link ... />}` or `nativeButton={false}` composition instead of Radix `asChild`.
- Use full dialog composition with header, title, description, body, and footer.
- Icons inside buttons use `data-icon="inline-start"` or `data-icon="inline-end"` when inline with text.
- Use `cn()` from `~/lib/utils` for conditional classes.
- Prefer installed shadcn primitives before custom markup for overlays, inputs, selects, tooltips, sheets, toasts, sidebars, buttons, and tables.

## Tailwind And Theme

Tailwind v4 is CSS-first. There is no `tailwind.config.ts`. Global CSS imports Google fonts, `tailwindcss`, `tw-animate-css`, and defines `@custom-variant dark (&:where(.dark, .dark *))`.

Theme tokens live in `@theme inline`, `:root`, and `:root.dark, :root[data-theme='dark']`. The persisted theme is `light | dark | system` under `cashent-theme`. Use shared tokens such as `--surface`, `--surface-soft`, `--surface-strong`, `--line`, `--line-strong`, `--ink`, `--ink-soft`, `--accent`, `--accent-strong`, `--accent-soft`, `--teal`, and `--focus-ring`.

Reusable class families include `panel`, `surface-*`, `hero-title`, `section-title`, `section-copy`, `eyebrow`, and master-data layout classes. Preserve the app style: dense, structured, operational, dark-safe, and dashboard-oriented.

## Forms

Two form styles are used:

- Entity forms use TanStack Form, Zod schemas, form definitions, `FormField`, and generated fields.
- Transaction workflows use controlled React state because line items, totals, draft/finalized states, and lifecycle actions need custom logic.

Master-data form files are `lib/master-data/forms/definitions.ts`, `schemas.ts`, `values.ts`, `payloads.ts`, `components/master-data/form-dialog.tsx`, and `components/master-data/form-fields.tsx`. Use `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, and `FieldError`; put `data-invalid` on `Field` and `aria-invalid` on controls.

## Tables And Lists

Generic table pieces live in `components/ui/data-table*`. They accept TanStack `ColumnDef` values but render through a small local model for server pagination and column visibility.

Master-data tables use entity column definitions, entity table panels, shared `DataTable`, cursor pagination callbacks from `useMasterDataWorkspace`, and column visibility state in the entity module. Simple transaction lists sometimes use direct table markup in panels; new reusable list surfaces should prefer the shared primitives.

## Master Data Platform

Master-data is the strongest transferable feature pattern. Each entity module exports `entity`, `importRoute`, `sanitizeSearch`, `useState`, `renderToolbar`, and `renderTable`. The registry is `lib/master-data/module-registry.ts`.

Route pattern:

1. Parse and sanitize search.
2. Strip default search params.
3. Use `loaderDeps` from sanitized search.
4. Ensure list/detail/reference query data.
5. Read with `useSuspenseQuery`.
6. Render `MasterDataRouteWorkspace`.
7. Mount create/edit/view/import overlays while preserving the filtered list behind them.

This preserves deep links such as `/master-data/products/create` and returns users to the same filtered list on close.

## Imports, Uploads, And Local State

Import flows use Zustand vanilla stores plus `@better-upload/client`. The shared factory validates a file with Zod, uploads with progress, parses metadata, requests preview rows, commits import rows, and exposes `phase`, `progress`, `preview`, `error`, `startImport`, `commitImport`, and `reset`.

Use React state for route-local form state. Use Zustand when state must survive dialog close/reopen, be shared by several components, or represent a long-running import. Zustand convention: `createStore`, export `useXStore(selector)`, and expose reset helpers when needed.

## Testing

Tests use `bun:test` and live under `apps/web/src` near the code. Pure helpers are tested directly. Static route/shell rendering uses `renderToStaticMarkup`. `lib/test-router.tsx` builds an in-memory router for component rendering. Component tests mock Query/mutation hooks when external data is not the subject.

Before handoff, run focused tests first, then `bun run --filter @workspace/web lint`, `typecheck`, and `test`. Run build after feature completion, not after every small edit.

## Transfer Checklist

1. Use Bun workspaces and root catalogs for frontend dependency versions.
2. Scaffold TanStack Start, React 19, file-based routes, Tailwind v4, shadcn, Query, Form, Table, and Zustand.
3. Create a router factory with one QueryClient per router and SSR Query integration.
4. Create a root route with `HeadContent`, `Scripts`, CSS links, theme bootstrap, providers, shell, root error, and not-found views.
5. Enable RSC in `tanstackStart` and add `@vitejs/plugin-rsc`.
6. Configure React Compiler through `@vitejs/plugin-react` preset plus Babel/Rolldown.
7. Put route metadata in one graph and derive navigation, breadcrumbs, access checks, and head metadata from it.
8. Keep API access in `~/lib/*-api.ts` and generated client wrappers.
9. Keep domain logic in shared/backend packages. UI serializes form state and calls APIs.
10. Use shadcn/Base UI primitives and CSS tokens before custom UI.
11. Add focused tests for route helpers, search parsers, serializers, query keys, forms, shell behavior, and module contracts.

## Avoid

- Do not import DB, core services, or backend-only auth logic into `apps/web`.
- Do not place secrets in loaders, route modules, or module-level env reads.
- Do not edit `routeTree.gen.ts`.
- Do not duplicate route permissions outside `dashboard-routes.ts`.
- Do not add Next.js or Remix patterns.
- Do not create new UI primitives when an installed shadcn component fits.
- Do not bypass API envelopes without a concrete reason.
- Do not mutate finalized business documents in the UI. The backend lifecycle API is authoritative.
