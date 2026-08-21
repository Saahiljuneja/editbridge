# EditBridge Decision Conflicts

Gaps and conflicts between the approved product rules (EDITBRIDGE_PRODUCT_RULES.md) and the current implementation.

Conflict statuses: `OPEN` | `RESOLVED` | `NEEDS_DECISION` | `ACCEPTABLE_GAP`

---

## CONFLICT-001: Decline route does not use canEditorAcceptOrder()

**CONFLICT:** Inconsistent eligibility gating between accept and decline routes.

**CURRENT IMPLEMENTATION:**
`POST /api/orders/[id]/decline` (`app/api/orders/[id]/decline/route.ts`) performs its own inline eligibility checks:
- fetches order and verifies `status === 'pending'`
- fetches editor row and verifies `editor.userId === session.user.userId`
- Does NOT call `canEditorAcceptOrder()` or check suspension or health

**APPROVED RULE (§8.1):**
`canEditorAcceptOrder()` must be the single source of truth for eligibility. All relevant checks should go through it.

**AFFECTED FILE:** `app/api/orders/[id]/decline/route.ts`

**AFFECTED DATABASE:** None

**AFFECTED API:** `POST /api/orders/[id]/decline`

**RECOMMENDED CHANGE:**
Introduce a parallel `canEditorDeclineOrder()` function (or extend `canEditorAcceptOrder()` to handle decline context), OR add suspension + user-active checks to the decline route. The decline route already handles the core order/status/assignment checks correctly — the gap is suspension and account-active checks.

**STATUS:** OPEN

---

## CONFLICT-002: cancel/route.ts does not perform atomic status update

**CONFLICT:** Client cancel route does not use `WHERE status = 'pending'` atomic guard.

**CURRENT IMPLEMENTATION:**
`POST /api/orders/[id]/cancel` (`app/api/orders/[id]/cancel/route.ts`) does:
```ts
if (order.status !== "pending") { return 409 }
// ... then separately:
await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, id))
```
The check and the update are separate operations — there is a race window between the status check and the update.

**APPROVED RULE (§1.6):**
Accept and auto-cancel operations must be atomic. Only one valid state transition may succeed.

**AFFECTED FILE:** `app/api/orders/[id]/cancel/route.ts`

**AFFECTED DATABASE:** None

**AFFECTED API:** `POST /api/orders/[id]/cancel`

**RECOMMENDED CHANGE:**
Change the cancel update to:
```ts
.where(and(eq(orders.id, id), eq(orders.status, "pending")))
.returning({ id: orders.id })
```
If 0 rows returned, return 409. Eliminates the race window.

**STATUS:** OPEN

---

## CONFLICT-003: Client cancel wording says "refunded" not "refund initiated"

**CONFLICT:** Client notification body in the cancel/decline routes says the refund will arrive in "5–7 business days" — which is correct — but the distinction between "initiated" and "credited" is not enforced in UI copy.

**CURRENT IMPLEMENTATION:**
`app/api/orders/[id]/decline/route.ts` (line 127):
> "Your refund has been initiated and should arrive within 5–7 business days."

This wording is actually correct. However, the client-side `order-actions.tsx` cancel button UI may show different wording before the server confirms. No confirmed client-facing bug — but has not been verified.

**APPROVED RULE (§3.3):**
UI must say "Refund initiated" until actual refund confirmation.

**AFFECTED FILE:** `app/(client)/client/orders/[id]/order-actions.tsx`

**AFFECTED API:** None

**RECOMMENDED CHANGE:**
Verify the client-side cancel button shows "Refund initiated" (or equivalent) as optimistic/loading copy, not "Refunded". If it already does, mark ACCEPTABLE_GAP.

**STATUS:** NEEDS_DECISION (requires UI verification)

---

## CONFLICT-004: Eligibility check does not verify editor availability toggle

**CONFLICT:** `canEditorAcceptOrder()` does not check `editors.is_available`.

**CURRENT IMPLEMENTATION:**
`lib/eligibility.ts` reads `isAvailable` from the editor row but never uses it as a blocking condition. An editor with `is_available = false` can still accept orders.

**APPROVED RULE (§8.4 — TBD):**
Whether `is_available = false` blocks order acceptance is not yet an approved rule (marked TBD in product rules). The availability toggle currently controls marketplace visibility and order routing, not eligibility to accept an already-assigned order.

**AFFECTED FILE:** `lib/eligibility.ts`

**AFFECTED DATABASE:** None

**AFFECTED API:** `POST /api/orders/[id]/accept`

**RECOMMENDED CHANGE:**
None required yet. Requires product decision: should an editor who toggled themselves "unavailable" be blocked from accepting an order that was already assigned to them before they went unavailable?

**STATUS:** NEEDS_DECISION

---

## CONFLICT-005: Health score freshness — cron runs on ALL approved editors regardless of size

**CONFLICT:** Cron step 9 calls `persistEditorHealth()` for every editor with `kycStatus = 'approved'` using `Promise.allSettled`. At scale, this could be slow or hit Neon connection limits.

**CURRENT IMPLEMENTATION:**
`app/api/cron/orders/route.ts` step 9:
```ts
const activeEditors = await db.select({ id: editors.id }).from(editors).where(eq(editors.kycStatus, "approved"));
const healthResults = await Promise.allSettled(activeEditors.map(e => persistEditorHealth(e.id)));
```
All editors run concurrently in one batch with no pagination or rate limiting.

**APPROVED RULE (§5.6):**
"Recalculate through scheduled background/cron recalculation as a safety net. Do not rely exclusively on on-demand calculation. Do not over-engineer this."

**AFFECTED FILE:** `app/api/cron/orders/route.ts`

**AFFECTED DATABASE:** None (read-heavy, writes to editors table)

**RECOMMENDED CHANGE:**
Acceptable for current editor count. If the platform grows beyond ~500 approved editors, introduce batching (e.g. 50 at a time with a small delay). No change required now.

**STATUS:** ACCEPTABLE_GAP (monitor at scale)

---

## CONFLICT-006: Decline route — "Other" is not in the type but is in approved list

**CONFLICT:** Minor mismatch between the approved decline reason list and the code.

**CURRENT IMPLEMENTATION:**
`DECLINE_REASONS` in `decline/route.ts`:
```ts
const DECLINE_REASONS = [
  "I'm unavailable",
  "Deadline doesn't work",
  "Project isn't a good fit",
  "Price doesn't work for me",
  "Client requirements are unclear",
  "Other",
]
```

**APPROVED RULE (§1.3):**
Approved reasons: "Unavailable", "Deadline doesn't work", "Project isn't a good fit", "Requirements unclear", "Price doesn't work", "Other"

The code uses slightly different phrasing ("I'm unavailable" vs. "Unavailable", "Price doesn't work for me" vs. "Price doesn't work", "Client requirements are unclear" vs. "Requirements unclear").

**AFFECTED FILE:** `app/api/orders/[id]/decline/route.ts`

**RECOMMENDED CHANGE:**
The phrasing difference is UI copy only and not a functional conflict. If exact wording was approved, update the string constants and any client-side form that uses them. Otherwise mark acceptable.

**STATUS:** ACCEPTABLE_GAP (copy-level only, not a functional conflict)

---

## CONFLICT-007: No confirmation that health score recalculates when review is submitted

**CONFLICT:** Health is supposed to recalculate when a review is submitted (`quality` category), but the review submission route has not been verified to call `persistEditorHealth()`.

**CURRENT IMPLEMENTATION:**
The following routes call `persistEditorHealth()`:
- `POST /api/orders/[id]/accept` ✓
- `POST /api/orders/[id]/decline` ✓
- `GET /api/cron/orders` (step 9) ✓

The following routes should call it but have NOT been verified:
- Review submission route
- Order completion route (client approves delivery)
- Dispute opened/resolved route

**APPROVED RULE (§5.6):**
"Recalculate when relevant activity occurs where practical."

**AFFECTED FILES (unverified):**
- `app/api/orders/[id]/approve/route.ts` (or equivalent)
- Review submission route
- Dispute routes

**RECOMMENDED CHANGE:**
Audit each of these routes and add `persistEditorHealth(editorId).catch(() => {})` where missing.

**STATUS:** OPEN

---

## CONFLICT-008: cancel/route.ts allows editor to cancel with reason EDITOR_CANCELLED (not in approved list as post-acceptance)

**CONFLICT:** The generic cancel route (`app/api/orders/[id]/cancel/route.ts`) allows either client or editor to cancel a `PENDING` order. When `cancelledBy = 'editor'`, it sets `cancellationReason = 'EDITOR_CANCELLED'`.

**APPROVED RULES:**
- `EDITOR_DECLINED` is the approved reason when an editor explicitly declines (has its own dedicated route)
- There is now a redundant path: an editor could call the generic `/cancel` endpoint and get `EDITOR_CANCELLED` instead of using the proper `/decline` endpoint with a structured reason

This creates a data quality issue — analytics would see two different reasons for what is functionally the same action.

**AFFECTED FILES:**
- `app/api/orders/[id]/cancel/route.ts`
- `app/api/orders/[id]/decline/route.ts`

**RECOMMENDED CHANGE:**
Either: (a) remove the editor's ability to call the generic `/cancel` route for pending orders (force them to use `/decline`) OR (b) restrict the cancel route to clients only for pending orders, with editors using the decline route exclusively.

**STATUS:** OPEN — requires product decision on whether to restrict

---

## CONFLICT-009: No "refund status" field — UI cannot distinguish "refund initiated" from "refund confirmed"

**CONFLICT:** There is no field on the `orders` table to track refund status. Once `createRefund()` is called, there is no persistent record of whether it succeeded or is pending.

**CURRENT IMPLEMENTATION:**
Refund is a fire-and-forget `createRefund()` call. Success is not stored. Failure is logged as an order event and an admin notification is sent. There is no `refund_status` field on orders.

**APPROVED RULE (§3.3):**
UI must say "Refund initiated" until actual refund confirmation.

**AFFECTED FILES:**
- `lib/db/schema.ts`
- `app/api/orders/[id]/cancel/route.ts`
- `app/api/orders/[id]/decline/route.ts`
- `app/api/cron/orders/route.ts`

**RECOMMENDED CHANGE:**
Add `refund_status` (enum: `not_applicable | initiated | confirmed | failed`) and `refunded_at` to the orders table. Update routes to set `refund_status = 'initiated'` after a successful `createRefund()` call. This would allow the UI to show accurate refund status.

**STATUS:** OPEN — requires product decision on whether to implement refund status tracking

---

## CONFLICT-010: Health score for new editors with zero history

**CONFLICT:** A newly approved editor with no orders has no data to compute a meaningful health score. The current implementation defaults most metrics to "perfect" (e.g., acceptance rate = 100%, no-response rate = 0%) when there is no history. This gives new editors an artificially high health score.

**CURRENT IMPLEMENTATION:**
In `lib/health.ts`, when an editor has zero received orders:
- `acceptanceRateVal = 100` (default)
- `noResponseRateVal = 0` (default)
- `onTimeDeliveryPct = 100` (default)
- `editorCancellationRateVal = 0` (default)

**APPROVED RULE:**
No rule has been approved for new-editor bootstrapping behavior.

**RECOMMENDED CHANGE:**
Requires product decision: should new editors start at a fixed bootstrapped score (e.g., 75 = Good) regardless of calculation? Or use a "minimum data threshold" rule (e.g., don't show score until 3 orders completed)?

**STATUS:** NEEDS_DECISION
