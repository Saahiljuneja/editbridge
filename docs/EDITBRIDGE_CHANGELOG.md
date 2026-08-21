# EditBridge Changelog

---

## [2026-08-21] — Implementation Plan: All 8 Items

### Decisions Approved
All pending decisions from EDITBRIDGE_DECISION_CONFLICTS.md approved:
- Suspension **blocks** declines (CONFLICT-001)
- Atomic cancel guard added (CONFLICT-002)
- Refund wording verified and fixed (CONFLICT-003)
- Editor availability toggle is now an eligibility gate (CONFLICT-004)
- `persistEditorHealth()` added to all missing routes (CONFLICT-007)
- Editors blocked from generic `/cancel` for pending orders; must use `/decline` (CONFLICT-008)
- Refund status tracking added (`refund_status`, `refunded_at`) (CONFLICT-009)
- New-editor health bootstrapping: minimum 5 orders required before showing score (CONFLICT-010)

### Changes

#### Item 1 (P0): Atomic cancel guard — `app/api/orders/[id]/cancel/route.ts`
Removed pre-check `if (order.status !== "pending")`. Changed the `db.update()` to use `WHERE status = 'pending'` with `.returning()`. If 0 rows returned → 409.

#### Item 2 (P1): Eligibility checks on decline — `app/api/orders/[id]/decline/route.ts`
Added `isSuspended` to the editor row select. Added user `isActive` check and suspension check after the editor ownership check. Suspended or inactive editors get 403.

#### Item 3 (P1): `persistEditorHealth()` on missing routes
Added fire-and-forget `persistEditorHealth(editorId).catch(() => {})` to:
- `app/api/orders/[id]/approve/route.ts` (order completion)
- `app/api/reviews/route.ts` (client review submitted)
- `app/api/disputes/route.ts` (dispute opened)

#### Item 4 (P2): Restrict editor from using generic cancel for pending orders
Added early return in `cancel/route.ts`: if `isEditor && order.status === "pending"` → 405 with message directing to `/decline`.

#### Item 5 (P2): Refund status tracking
- New migration `lib/db/migrations/0020_refund_status.sql` — applied 2026-08-21
- Added `refundStatus` (text, nullable) and `refundedAt` (timestamp, nullable) to `lib/db/schema.ts` orders table
- `cancel/route.ts`, `decline/route.ts`, `cron/orders/route.ts` all set `refundStatus: "initiated"` on successful `createRefund()` and `refundStatus: "failed"` on error

#### Item 6 (P2): New-editor health score bootstrapping (Option A — min data threshold)
- Added `notEnoughData?: boolean` to `HealthResult` interface in `lib/health.ts`
- `calculateEditorHealth()` returns early with `notEnoughData: true` if `totalOrdersReceived < 5`
- `persistEditorHealth()` skips DB write when `notEnoughData: true`
- `app/(editor)/editor/account-health/page.tsx` shows "Not enough data yet" state with order count progress

#### Item 7 (P2): Client-side refund wording fix — `app/(client)/client/orders/[id]/order-actions.tsx`
Fixed toast.success copy from "A full refund will be processed within 5–7 days" to "Refund initiated — funds will arrive within 5–7 business days."

#### Item 8 (P3): Availability toggle as eligibility gate
- Added `EDITOR_UNAVAILABLE` to `EligibilityCode` in `lib/eligibility.ts`
- `canEditorAcceptOrder()` now returns `EDITOR_UNAVAILABLE` if `editorRow.isAvailable === false`
- Added `EDITOR_UNAVAILABLE: 403` to the status map in `app/api/orders/[id]/accept/route.ts`

### Database Impact
Migration `0020_refund_status.sql` applied — 2 new nullable columns on `orders` table:
- `refund_status` (text, nullable)
- `refunded_at` (timestamp, nullable)

### Implementation Status
**IMPLEMENTED** — 2026-08-21

---

Historical record of product decisions and implementation changes.

Statuses: `PROPOSED` | `APPROVED` | `IMPLEMENTED` | `VERIFIED` | `REJECTED` | `SUPERSEDED`

---

## [2026-08-21] — Account Health System

### Decision
Implement a 5-category weighted Account Health scoring system for editors, independent of XP/tier/rating/suspension.

### Previous Behavior
No account health system existed. Editor eligibility was determined only by KYC status and user account active flag.

### New Behavior
- Health score (0–100) computed from 5 weighted categories: Order Reliability (30%), Quality (30%), Client Experience (20%), Compliance (15%), Activity (5%)
- Score cached on `editors` table; recalculated on key events and via cron (step 9)
- `critical` health (0–39) blocks new order acceptance at the API level
- `at_risk` health (40–59) shows warnings only — no marketplace restriction
- Editor-facing `/editor/account-health` page with score ring, category breakdown, signal detail, improvement actions
- Suspension mechanism (admin-only, independent of health)

### Reason
Provide editors with actionable performance feedback and give the platform a reliable mechanism to pause low-quality new-order activity while protecting in-progress work.

### Affected Areas
- Editor order acceptance flow
- Editor dashboard
- Editor sidebar navigation
- Admin editor detail page

### Database Impact
Added 10 columns to `editors` table:
- `health_score` (integer, nullable)
- `health_status` (text, nullable)
- `health_computed_at` (timestamp, nullable)
- `acceptance_rate` (integer, nullable)
- `no_response_rate` (integer, nullable)
- `response_rate` (integer, nullable)
- `is_suspended` (boolean, NOT NULL DEFAULT false)
- `suspended_at` (timestamp, nullable)
- `suspended_by` (text, nullable)
- `suspension_reason` (text, nullable)

**Migration:** `lib/db/migrations/0019_account_health.sql` — applied 2026-08-21

### API Impact
- `POST /api/orders/[id]/accept` — rewired through `canEditorAcceptOrder()`; blocks if `health_status = 'critical'`
- `POST /api/orders/[id]/decline` — fires `persistEditorHealth()` on success
- `GET /api/cron/orders` — added step 9: recalculate health for all approved editors
- `POST /api/admin/editors/[id]/health/recalculate` — new admin endpoint
- `PATCH /api/admin/editors/[id]/suspension` — new admin endpoint (admin-only)

### UI Impact
- New: `app/(editor)/editor/account-health/page.tsx`
- New: `app/(editor)/editor/account-health/loading.tsx`
- Modified: `app/(editor)/editor/orders/[id]/accept-order-button.tsx` — blocked state with reason + link
- Modified: `app/(editor)/editor/orders/[id]/page.tsx` — eligibility computed server-side
- Modified: `app/(editor)/editor/dashboard/page.tsx` — health mini-card in sidebar
- Modified: `components/layout/editor-sidebar.tsx` — "Account Health" nav link added
- Modified: `app/(admin)/admin/editors/[id]/page.tsx` — health card + suspend form
- New: `app/(admin)/admin/editors/[id]/health-score-card.tsx`
- New: `app/(admin)/admin/editors/[id]/suspend-editor-form.tsx`

### Implementation Status
**IMPLEMENTED** — committed `040de36`, pushed 2026-08-21

---

## [2026-08-21] — Editor Order Acceptance Flow (Formalized)

### Decision
Formalize the editor order acceptance/decline/no-response flow with atomic state transitions, structured decline reasons, and central eligibility gating.

### Previous Behavior
Accept route had inline eligibility checks duplicated from other logic; no structured decline reason list; no atomic race-condition guard on auto-cancel vs. accept.

### New Behavior
- `canEditorAcceptOrder()` in `lib/eligibility.ts` is the single server-side gate for all eligibility checks
- Decline reasons are a fixed enumerated list
- Accept and decline routes both use `UPDATE ... WHERE status = 'pending'` returning the updated row — if 0 rows, a race was lost and a 409 is returned
- Cron auto-cancel uses the same atomic pattern

### Reason
Prevent duplicate eligibility logic, prevent race conditions, and enable structured analytics on decline reasons.

### Affected Areas
- Editor order accept and decline APIs
- Cron auto-cancel logic

### Database Impact
None (used existing schema fields).

### API Impact
- `POST /api/orders/[id]/accept` — fully rewired
- `POST /api/orders/[id]/decline` — structured reason enum, atomic update

### UI Impact
- `app/(editor)/editor/orders/[id]/page.tsx` — "Action Required" card with inline CTAs
- `app/(editor)/editor/orders/[id]/accept-order-button.tsx` — accept flow with commitment checklist
- `app/(client)/client/orders/[id]/page.tsx` — "Waiting for editor" pending banner
- `app/(client)/client/orders/[id]/order-actions.tsx` — redesigned cancel section

### Implementation Status
**IMPLEMENTED** — committed across multiple commits, last `0cfb4d1`, pushed 2026-08-21

---

## [2026-08-21] — Pending Order UX (Client + Editor)

### Decision
Both client-side and editor-side pending order views must prominently surface the pending state with context-appropriate UI: countdown timer, action buttons, payment safety messaging.

### Previous Behavior
No prominent pending-state UI on either side. Client saw a generic order page. Editor saw pending orders only in the sidebar.

### New Behavior
- Client: amber "Waiting for editor acceptance" banner with countdown, payment safety note, and styled cancel section
- Editor: "Action Required" amber card at top of main content column with commitments checklist, inline Accept/Decline buttons, payout note, and deadline countdown

### Reason
Reduce editor no-response rate; reduce client anxiety; improve mobile experience (sidebar buttons below fold).

### Affected Areas
- Client order detail page
- Editor order detail page

### Database Impact
None.

### API Impact
None.

### UI Impact
- `app/(client)/client/orders/[id]/page.tsx`
- `app/(client)/client/orders/[id]/order-actions.tsx`
- `app/(editor)/editor/orders/[id]/page.tsx`

### Implementation Status
**IMPLEMENTED** — committed `ffdbd33`, `a49bb47`, pushed 2026-08-21

---

## [2026-08-21] — OrderEventType Missing Values (Bug Fix)

### Decision
Add missing `order_accepted`, `order_declined`, `refund_failed` values to the `OrderEventType` union in `lib/order-events.ts`.

### Previous Behavior
These values were being passed to `createOrderEvent()` but were not in the type definition, causing TypeScript compilation errors.

### New Behavior
All three values are in the type definition.

### Reason
Correctness; pre-existing TypeScript errors.

### Implementation Status
**IMPLEMENTED** — committed `040de36`, pushed 2026-08-21
