# EditBridge Product Rules

## Document Status
- **Status:** Living Document
- **Purpose:** Source of truth for approved business and product rules. Only rules explicitly approved by the product owner appear here. Unapproved areas are marked TBD.
- **Last Updated:** 2026-08-21
- **Last Decision:** Editor Account Health system (weights, thresholds, restrictions, suspension model)

---

## 1. Order Acceptance Rules

### 1.1 Order Creation State
When a client successfully pays for an order, the order is created with status `PENDING`.

### 1.2 Editor Response Window
The assigned editor has **24 hours** from order creation (`orders.created_at`) to accept or decline.

### 1.3 Accept Flow
If the editor accepts:
- `PENDING → IN_PROGRESS`
- Record `accepted_at` timestamp
- Deadline is calculated from `accepted_at` + package `delivery_days`
- Editor may include an optional acceptance note (stored as `editor_acceptance_note`)
- Create an order event: `order_accepted`
- Notify client

### 1.4 Decline Flow
If the editor declines:
- `PENDING → CANCELLED`
- `cancellation_reason = EDITOR_DECLINED`
- `cancelled_by = editor`
- Editor must provide a decline reason (stored for analytics/admin — NOT surfaced to client unless a future decision says otherwise)
- Approved decline reasons:
  - "I'm unavailable"
  - "Deadline doesn't work"
  - "Project isn't a good fit"
  - "Price doesn't work for me"
  - "Client requirements are unclear"
  - "Other"
- Initiate a full Razorpay refund immediately
- "Refund immediately" means EditBridge immediately initiates the Razorpay refund call — NOT that the client's bank balance is credited immediately
- UI must say **"Refund initiated"** until actual refund confirmation is received
- Create an order event: `order_declined`
- Notify client (do not expose the editor's internal decline reason)

### 1.5 No Response (Auto-Cancel)
If the editor does not accept or decline within 24 hours:
- `PENDING → CANCELLED`
- `cancellation_reason = EDITOR_NO_RESPONSE`
- `cancelled_by = system`
- Initiate a full Razorpay refund immediately (same caveat as above)
- Notify client and editor
- Create an order event: `order_cancelled`

### 1.6 Race Condition (Atomicity)
The accept and auto-cancel operations must be **atomic**.

The system must prevent a scenario where an editor accepts at approximately the same time the 24-hour auto-cancel job runs.

Implementation: use a conditional `UPDATE ... WHERE status = 'pending'` that returns the updated row. If 0 rows returned, the competing operation won — abort and return a conflict error.

Valid transitions: `PENDING → IN_PROGRESS` OR `PENDING → CANCELLED`. Never both.

### 1.7 Client Cancellation
A client may cancel a `PENDING` order before the editor accepts it.
- `cancellation_reason = CLIENT_CANCELLED`
- `cancelled_by = client`
- Full refund initiated immediately

### 1.8 Decline Reason Visibility
TBD — PRODUCT DECISION REQUIRED  
_(Whether/how the editor's internal decline reason is surfaced to the client or shown in order history.)_

---

## 2. Payment Rules

### 2.1 Payment Capture
TBD — PRODUCT DECISION REQUIRED  
_(Razorpay capture timing: at order creation vs. at acceptance.)_

### 2.2 Processing Fee
TBD — PRODUCT DECISION REQUIRED  
_(Definition and handling of `processing_fee`.)_

### 2.3 Commission
TBD — PRODUCT DECISION REQUIRED  
_(Commission rate and calculation rules.)_

---

## 3. Refund Rules

### 3.1 Full Refund Scenarios
A full refund must be initiated in all of the following cases:
- Editor declines (`EDITOR_DECLINED`)
- Editor does not respond within 24 hours (`EDITOR_NO_RESPONSE`)
- Client cancels before acceptance (`CLIENT_CANCELLED`)

### 3.2 Refund Initiation Timing
Refund must be initiated immediately upon the cancellation action completing successfully.

### 3.3 Refund Wording
UI must say **"Refund initiated"** — not "refunded" or "credited". The distinction: EditBridge initiates the Razorpay refund call, but the client's bank or card takes additional time (typically 5–7 business days) to reflect the credit.

### 3.4 Refund Failure Handling
If the Razorpay refund call fails:
- Log a `refund_failed` order event
- Alert admin via notification for manual action
- Do NOT silently swallow the error

### 3.5 Partial Refunds
TBD — PRODUCT DECISION REQUIRED  
_(Partial refund scenarios: client cancels after editor accepts, dispute resolution, etc.)_

---

## 4. Order Status Rules

### 4.1 Status Lifecycle
```
PENDING
  → IN_PROGRESS     (editor accepts within 24h)
  → CANCELLED       (editor declines / no response / client cancels)

IN_PROGRESS
  → DELIVERED       (editor uploads delivery)
  → REVISION_REQUESTED (client requests revision)
  → CANCELLED       (TBD — policy for post-acceptance cancellation)

DELIVERED
  → COMPLETED       (client approves OR 7-day auto-approval)
  → REVISION_REQUESTED (client requests revision)

REVISION_REQUESTED
  → DELIVERED       (editor re-delivers)

COMPLETED
  (terminal state — payout scheduled)

CANCELLED
  (terminal state — refund initiated)
```

### 4.2 Auto-Approval
Delivered orders that receive no client action within **7 days** are automatically approved and moved to `COMPLETED`. Payout is then scheduled.

### 4.3 Overdue Notifications
Editors are notified when their delivery deadline passes while the order is still `IN_PROGRESS` or `REVISION_REQUESTED`. The cron runs daily.

### 4.4 Post-Acceptance Cancellation
TBD — PRODUCT DECISION REQUIRED  
_(Can an editor or client cancel after the order is accepted? What are the refund rules?)_

---

## 5. Editor Account Health

### 5.1 Independence
Account Health is a separate system from:
- Editor Tier / XP
- Client ratings (reviews)
- Suspension

These four dimensions are independent. A change in one does not automatically affect another.

### 5.2 Health Statuses
| Score | Status |
|---|---|
| 90–100 | Excellent |
| 75–89 | Good |
| 60–74 | Needs Attention |
| 40–59 | At Risk |
| 0–39 | Critical |

### 5.3 At Risk (40–59)
- Editor remains visible in marketplace
- Editor can receive and accept new orders
- NOT automatically removed from marketplace
- NOT automatically downgraded in search ranking
- Show warnings and improvement recommendations
- Do not punish an editor twice for the same underlying problem

### 5.4 Critical (0–39)
- Editor **cannot** receive new order requests
- Editor **cannot** accept new pending orders
- Existing accepted/in-progress orders **continue unaffected**
- Existing orders are NOT automatically cancelled
- Editor can continue communicating with existing clients
- Editor can continue delivering existing work
- UI must show: "New orders are currently paused because your Account Health is Critical."
- Also show: current score, reasons for low score, improvement actions, existing active orders, requirements to restore eligibility

### 5.5 Calculation Categories and Weights
```
Order Reliability  = 30%  (acceptance rate, on-time delivery, cancellation rate)
Quality            = 30%  (ratings, revision frequency, dispute rate)
Client Experience  = 20%  (response time, repeat client rate, open disputes)
Compliance         = 15%  (KYC status, bank account, active packages, PAN)
Activity           =  5%  (recency of completed orders, availability status)
```

Weights stored as named constants in `lib/health.ts` (`WEIGHTS`). No database configuration system for weights.

### 5.6 Health Freshness (Hybrid)
The health result is **cached** on the editor record (`editors.health_score`, `editors.health_status`, `editors.health_computed_at`) for fast eligibility checks.

Recalculation is triggered:
1. On key events (accept, decline, complete, review submitted, dispute opened) — fire-and-forget
2. Via cron job (step 9) as a safety net for all approved editors

### 5.7 UX Rule
Always show the editor:
- The status label (not just a number)
- The reasons for the current score (from actual signal data)
- Specific, actionable improvement steps linked to the relevant pages

Never show only a number.

### 5.8 Score Display
TBD — PRODUCT DECISION REQUIRED  
_(Whether health score/status is shown to clients, visible on editor marketplace profile, or visible only to the editor and admin.)_

---

## 6. Editor Tier / XP

TBD — PRODUCT DECISION REQUIRED  
_(Full tier/XP rules to be documented when a change is proposed.)_

---

## 7. Client Membership

TBD — PRODUCT DECISION REQUIRED  
_(Client membership/subscription rules to be documented when a change is proposed.)_

---

## 8. Editor Eligibility

### 8.1 Central Function
A single server-side function `canEditorAcceptOrder(editorId, orderId, sessionUserId)` is the authoritative gate for order acceptance eligibility.

Both the API endpoint and the UI use this function. The server is always authoritative.

### 8.2 Eligibility Checks (in order)
1. Editor record exists and belongs to the session user
2. User account is active (`users.is_active = true`)
3. Editor is not suspended (`editors.is_suspended = false`)
4. KYC status is `approved`
5. Account Health is not `critical`
6. Order exists
7. Order is assigned to this editor
8. Order status is `PENDING`
9. 24-hour acceptance window has not expired

### 8.3 Return Structure
```ts
{ eligible: boolean; code: EligibilityCode; reason?: string }
```

### 8.4 Additional Eligibility Conditions
TBD — PRODUCT DECISION REQUIRED  
_(Editor capacity limits, client/editor block status, editor availability toggle as eligibility gate.)_

---

## 9. Dispute Rules

TBD — PRODUCT DECISION REQUIRED

---

## 10. Payout Rules

### 10.1 Payout Trigger
A payout record is created when an order reaches `COMPLETED` status (client approves or 7-day auto-approval).

### 10.2 Payout Timing
Payout is **scheduled** 7 days after order completion.

### 10.3 Payout Amount Calculation
```
gross_amount     = total_amount - processing_fee
net_before_tds   = gross_amount - commission_amount
tds_amount       = computed via computeTdsForEditor()
net_amount       = net_before_tds - tds_amount
```

### 10.4 TDS
TDS is computed per editor based on applicable Indian tax rules. Logic lives in `lib/tds.ts`.

### 10.5 Payout Execution
TBD — PRODUCT DECISION REQUIRED  
_(Razorpay payout API integration, manual vs. automated disbursement.)_

---

## 11. Cancellation Rules

### 11.1 Pre-Acceptance Cancellation (by Client)
Allowed. Full refund initiated. See §1.7 and §3.

### 11.2 Editor Decline
Treated as cancellation. See §1.3.

### 11.3 Auto-Cancel (No Response)
See §1.5.

### 11.4 Post-Acceptance Cancellation
TBD — PRODUCT DECISION REQUIRED

### 11.5 Cancellation Reasons (stored values)
- `EDITOR_DECLINED` — editor explicitly declined
- `EDITOR_NO_RESPONSE` — editor did not respond within 24 hours
- `CLIENT_CANCELLED` — client cancelled before acceptance
- `EDITOR_CANCELLED` — editor-initiated cancel (post-acceptance; TBD if/when this applies)

---

## 12. Notification Rules

### 12.1 Order Accepted
Client is notified when the editor accepts.

### 12.2 Order Declined / Cancelled
Client is notified. Editor's internal decline reason is NOT included.

### 12.3 Order Auto-Cancelled (No Response)
Both client and editor are notified.

### 12.4 Order Overdue
Editor is notified once per day when delivery deadline passes.

### 12.5 Order Auto-Approved
Both client and editor are notified.

### 12.6 Account Health Degraded
Editor is notified when health drops to `at_risk` or `critical`.

### 12.7 Account Suspended
Editor is notified when account is suspended by admin.

### 12.8 Refund Failed
Admin is notified immediately for manual action.

### 12.9 Additional Notification Rules
TBD — PRODUCT DECISION REQUIRED

---

## 13. Admin Rules

### 13.1 Suspension
Only users with role `admin` can suspend or unsuspend an editor.

A suspension reason is required.

Suspension is logged with: `suspended_at`, `suspended_by` (admin user ID), `suspension_reason`.

### 13.2 Health Score Override
Admin and staff roles (`admin`, `staff_kyc`, `staff_support`, `staff_dispute`) can trigger a manual health score recalculation.

Admin cannot manually override the score value — recalculation uses the same algorithm.

### 13.3 Additional Admin Rules
TBD — PRODUCT DECISION REQUIRED

---

## 14. Security / Permission Rules

### 14.1 Role Hierarchy
Roles in use: `client`, `editor`, `admin`, `staff_kyc`, `staff_support`, `staff_dispute`

### 14.2 Cron Security
The cron endpoint (`/api/cron/orders`) is secured by `CRON_SECRET` bearer token. No session required.

### 14.3 Editor API Authorization
Editor API endpoints verify:
- Session role = `editor`
- The editor row belongs to the session user (via `editor.user_id = session.user.userId`)

This prevents one editor from acting on another editor's orders.

### 14.4 Additional Security Rules
TBD — PRODUCT DECISION REQUIRED
