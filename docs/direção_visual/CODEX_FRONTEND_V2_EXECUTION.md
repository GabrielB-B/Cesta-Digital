# Cesta Digital - Codex Execution Contract for Frontend V2

**Baseline:** `4e3d24e12a3ab24bba06895052a6f2768e6881c7`

**Master plan:** `PLANO_ENGENHARIA_FRONTEND_V2_CESTA_DIGITAL.md`
**Visual baseline:** `Cesta_Digital_Frontend_V2_Baseline_Desktop.png`

## Mission
Rebuild the presentation layer of the existing React frontend to the approved clean, premium, mobile-first identity while preserving routes, RBAC, API contracts, authentication, domain behavior, types and functional tests.

## First action - mandatory and satisfied by V2-00
The docs-only milestone `V2-00` updates the repository documentation so Codex no
longer receives the obsolete “dark premium” instruction from `AGENTS.md`.
Future visual tasks must verify this decision remains present, but must not
recreate the documentation milestone.

## Immutable contracts during visual milestones
- Current route paths and `RoleRoute.allowedRoles`.
- `api` Axios client and cookie-session behavior.
- `/auth/login`, `/auth/me`, `/auth/logout` flow.
- Existing backend endpoints and payloads unless a separate functional requirement is approved.
- Domain rules for stock, family eligibility, scheduling and delivery.
- Existing E2E coverage: never delete/relax a test merely to make redesign pass.

## Visual rules
- Preserve original logo symbol; its internal gradient is allowed only as the asset itself.
- Page `#F7F8FA`, surfaces white, graphite text, subtle borders.
- Brand action `#D92676`; hover `#C2186A`; logo pink `#EB3385`; logo purple `#7C55F4`.
- Green/yellow/red only for semantic state.
- No decorative gradients, glow, glassmorphism, repeated colored stripes or heavy colored shadows.
- Avoid nested cards. Use sections, whitespace, dividers and typography.
- One dominant primary action per visual region.
- Mobile 390px first; desktop 1440px second.
- No global horizontal page scroll at 360/390px.
- Desktop tables receive a dedicated mobile list/card pattern.

## Architecture
- Tokens + CSS Modules; legacy global CSS shrinks per milestone.
- Extract AppShell into DesktopSidebar, MobileBottomNav, MoreDrawer and AccountMenu.
- Preserve skip link, focus trap, Escape, `inert`, focus restoration and body scroll lock.
- Introduce TanStack Query gradually for server state.
- Introduce React Hook Form + Zod for V2 forms.
- Prefer unstyled accessible primitives; do not install a visual UI kit without approval.

## PR sequence
1. docs decision / AGENTS update
2. safety net
3. V2 tokens + primitives
4. AppShell
5. Login
6. Dashboard
7. Families list/detail
8. Family forms/assessment/benefit/member
9. Stock
10. Baskets/deliveries
11. Admin/financial
12. server-state convergence
13. lazy routes / legacy cleanup / performance
14. final accessibility + visual + device homologation

## Required checks for every frontend PR
```powershell
cd frontend
npm run lint
npm run build
npm run test:e2e
cd ..
git diff --check
```

Validate at least 390x844 and 1440x900, plus 768x1024 when layout changes materially.

## Delivery report format
For every task report:
1. scope and files changed;
2. contracts intentionally preserved;
3. visual differences from baseline and rationale;
4. accessibility checks;
5. tests/build results;
6. legacy CSS/assets removed;
7. risks or follow-up items.

Do not push to `main` or publish without the repository's established gates and explicit approval.
