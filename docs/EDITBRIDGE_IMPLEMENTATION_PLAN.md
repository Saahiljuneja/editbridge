# EditBridge Implementation Plan

Derived from the conflict audit in EDITBRIDGE_DECISION_CONFLICTS.md.

Items marked **REQUIRES DECISION** cannot be implemented until the product owner approves the approach.

Implementation statuses: `NOT_STARTED` | `IN_PROGRESS` | `COMPLETE` | `BLOCKED`

---

## Priority Classification

| Priority | Meaning |
|---|---|
| P0 | Data integrity / correctness bug — fix before next deploy |
| P1 | Product rule violation — fix soon |
| P2 | Missing feature or gap — schedule |
| P3 | Acceptable gap — monitor |

---

## Item 1: Fix atomic guard on client cancel route

**Priority:** P0  
**Conflict:** CONFLICT-002  
**Status:** NOT_STARTED  

**Problem:**
`POST /api/orders/[id]/cancel` performs a status check and a separate update — two operations with a race window between them.

**Required Change:**
1. **`app/api/orders/[id]/cancel/route.ts`**
   - Remove the pre-check `if (order.status !== "pending") { return 409 }`
   - Change the `db.update()` call to:
     ```ts
     .where(and(eq(orders.id, id), eq(orders.status, "pending")))
     .returning({ id: orders.id })
     ```
   - If `updated.length === 0`, return 409

**Database Changes:** None  
**API Changes:** `POST /api/orders/[id]/cancel` (behavior change — more correct, not breaking for clients)  
**UI Changes:** None  
**Migration Required:** No  
**Rollback:** Revert the file; old behavior is a superset of the new one  

---

## Item 2: Add eligibility checks to decline route

**Priority:** P1  
**Conflict:** CONFLICT-001  
**Status:** NOT_STARTED  

**Problem:**
`POST /api/orders/[id]/decline` does not check suspension status or user account active state. A suspended editor can currently decline orders (which is probably fine operationally, but is inconsistent with the central eligibility model).

**Required Change — Option A (preferred):**
1. **`app/api/orders/[id]/decline/route.ts`**
   - After fetching the editor row, add:
     ```ts
     if (!editorRow.isSuspended !== false) { ... }  // check suspension
     ```
   - Also fetch `users.isActive` and check it

**Required Change — Option B:**
Create a `canEditorDeclineOrder()` in `lib/eligibility.ts` that skips the KYC, health, and 24h-window checks (those don't apply to declines) but does check authentication, account-active, and suspension.

**REQUIRES DECISION:** Does suspension block declines? (Arguably a suspended editor should still be able to decline an already-assigned order. This is not yet an approved rule.)

**Database Changes:** None  
**API Changes:** `POST /api/orders/[id]/decline` (tighten, not breaking)  
**UI Changes:** None  
**Migration Required:** No  

---

## Item 3: Audit and add persistEditorHealth() to missing routes

**Priority:** P1  
**Conflict:** CONFLICT-007  
**Status:** NOT_STARTED  

**Problem:**
Health is supposed to recalculate on key events. Accept and decline routes do this. Other relevant routes have not been verified.

**Routes to Audit:**

| Route | File | Needs Health Recalc? | Status |
|---|---|---|---|
| Order completed (client approves) | TBD | Yes — quality category | UNVERIFIED |
| Order auto-approved (cron) | `app/api/cron/orders/route.ts` | Yes | UNVERIFIED |
| Review submitted | TBD | Yes — quality category | UNVERIFIED |
| Dispute opened | TBD | Yes — client experience | UNVERIFIED |
| Dispute resolved | TBD | Yes — client experience | UNVERIFIED |
| Revision requested | TBD | Maybe — quality category | UNVERIFIED |

**Required Change:**
For each route above, add `persistEditorHealth(editorId).catch(() => {})` before the final return, if not already present.

**Note:** The cron step 9 already recalculates all approved editors, so missing event-based triggers degrade freshness within the cron cycle (up to 24h stale) but do not cause correctness errors.

**Database Changes:** None  
**API Changes:** Multiple routes — fire-and-forget additions only, non-breaking  
**UI Changes:** None  
**Migration Required:** No  

---

## Item 4: Restrict editor from using generic cancel route for pending orders

**Priority:** P2  
**Conflict:** CONFLICT-008  
**Status:** BLOCKED — REQUIRES DECISION  

**Problem:**
An editor can call `POST /api/orders/[id]/cancel` and get `cancellationReason = EDITOR_CANCELLED` for a pending order. The approved flow for editor-initiated cancellation of pending orders is `POST /api/orders/[id]/decline` with a structured reason.

**Decision Required:**
Should editors be restricted from using the generic cancel route for `PENDING` orders? If yes, the cancel route should check: if `order.status === 'pending'` and `cancelledBy === 'editor'`, return 405 and direct to the decline endpoint.

**Database Changes:** None  
**API Changes:** `POST /api/orders/[id]/cancel` (restrict for editors on pending orders)  
**UI Changes:** Any UI that shows a cancel button to editors for pending orders must point to `/decline` instead  
**Migration Required:** No  

---

## Item 5: Add refund status tracking

**Priority:** P2  
**Conflict:** CONFLICT-009  
**Status:** BLOCKED — REQUIRES DECISION  

**Problem:**
No persistent record of refund status on orders. UI cannot distinguish "refund initiated" from "refund confirmed".

**Decision Required:**
Approve adding `refund_status` and `refunded_at` fields to the `orders` table.

**If Approved — Required Changes:**

1. **Database migration** — add to `orders` table:
   ```sql
   ALTER TABLE "orders"
     ADD COLUMN IF NOT EXISTS "refund_status" text,
     ADD COLUMN IF NOT EXISTS "refunded_at" timestamp;
   ```

2. **`lib/db/schema.ts`** — add fields to orders table definition

3. **`app/api/orders/[id]/cancel/route.ts`** — set `refund_status = 'initiated'` after successful `createRefund()` call; set `'failed'` on error

4. **`app/api/orders/[id]/decline/route.ts`** — same

5. **`app/api/cron/orders/route.ts`** — same (step 1, auto-cancel)

6. **Client order detail page** — read `refund_status` and show correct copy: "Refund initiated" / "Refund confirmed" / "Refund failed — contact support"

**Migration Required:** Yes — new columns on orders table  
**Rollback:** Drop the columns (safe since nullable)  

---

## Item 6: New-editor health score bootstrapping

**Priority:** P2  
**Conflict:** CONFLICT-010  
**Status:** BLOCKED — REQUIRES DECISION  

**Problem:**
New editors with zero order history get an artificially high health score because all metrics default to best-case values.

**Decision Required — choose one:**

**Option A: Minimum data threshold**
Do not calculate or display a health score until the editor has received at least N orders (e.g., 3). Show "Not enough data yet" instead.

**Option B: Bootstrapped score**
New editors start at a fixed score (e.g., 75 = Good) that is used until enough real data exists (e.g., 5+ completed orders).

**Option C: Current behavior (keep defaults)**
Accept that new editors start high and the score will naturally correct as data accumulates. The score is already shown as "not yet calculated" before the first cron run.

**If Option A or B Approved — Required Changes:**
1. **`lib/health.ts`** — add threshold check at start of `calculateEditorHealth()`
2. **`app/(editor)/editor/account-health/page.tsx`** — handle the "not enough data" state

**Database Changes:** None  
**Migration Required:** No  

---

## Item 7: Verify client-side refund wording

**Priority:** P2  
**Conflict:** CONFLICT-003  
**Status:** NOT_STARTED  

**Problem:**
The approved rule says UI must say "Refund initiated" not "Refunded". The server-side wording is correct, but the client-side cancel button UI has not been verified.

**Required Change:**
1. Open `app/(client)/client/orders/[id]/order-actions.tsx`
2. Verify that after clicking "Cancel order & request refund", the UI shows "Refund initiated" (not "Order refunded" or "Refund complete")
3. If wrong, update the copy

**Database Changes:** None  
**API Changes:** None  
**UI Changes:** `app/(client)/client/orders/[id]/order-actions.tsx` (if needed)  
**Migration Required:** No  

---

## Item 8: Decide on editor availability toggle as eligibility gate

**Priority:** P3  
**Conflict:** CONFLICT-004  
**Status:** BLOCKED — REQUIRES DECISION  

**Decision Required:**
If an editor has toggled themselves "unavailable" (`editors.is_available = false`) but already has a pending order assigned to them (placed before they went unavailable), should they be blocked from accepting it?

Current behavior: availability toggle does NOT block accept. It only affects marketplace visibility and new order routing.

**If "yes" approved — Required Changes:**
1. **`lib/eligibility.ts`** — add check:
   ```ts
   if (!editorRow.isAvailable) {
     return { eligible: false, code: "EDITOR_UNAVAILABLE", reason: "..." }
   }
   ```
2. **`lib/eligibility.ts`** — add `EDITOR_UNAVAILABLE` to `EligibilityCode`
3. **Accept route** — add status code mapping for new code

**Database Changes:** None  
**Migration Required:** No  

---

## Summary Table

| Item | Priority | Conflict | Status | Requires Decision |
|---|---|---|---|---|
| 1. Atomic cancel guard | P0 | CONFLICT-002 | NOT_STARTED | No |
| 2. Eligibility on decline | P1 | CONFLICT-001 | NOT_STARTED | Yes (suspension blocks decline?) |
| 3. persistEditorHealth on missing routes | P1 | CONFLICT-007 | NOT_STARTED | No |
| 4. Restrict editor generic cancel | P2 | CONFLICT-008 | BLOCKED | Yes |
| 5. Refund status tracking | P2 | CONFLICT-009 | BLOCKED | Yes |
| 6. New-editor score bootstrapping | P2 | CONFLICT-010 | BLOCKED | Yes |
| 7. Verify client refund wording | P2 | CONFLICT-003 | NOT_STARTED | No |
| 8. Availability toggle as gate | P3 | CONFLICT-004 | BLOCKED | Yes |

### Items that can be implemented immediately (no decision needed):
- **Item 1** — atomic cancel guard (P0 bug fix, safe change)
- **Item 3** — audit and add persistEditorHealth() to missing routes (P1, additive only)
- **Item 7** — verify client refund wording (P2, read-only audit first)

### Items blocked on product decisions:
- Items 2, 4, 5, 6, 8
