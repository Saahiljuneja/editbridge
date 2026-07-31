import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

console.log("Seeding Help Center categories and articles...");

// 1. Clear existing dynamic help content to prevent conflicts
await sql`TRUNCATE help_articles, help_categories CASCADE`;
console.log("Cleared existing help tables.");

// 2. Insert Categories and get their IDs
const categories = [
  {
    name: "Payments & Escrow",
    slug: "payments-escrow",
    description: "Understand platform fees, payout settlement times, credit systems, and secure Razorpay payment flows.",
    icon: "IndianRupee",
    sort_order: 1
  },
  {
    name: "Orders & Revisions",
    slug: "orders-revisions",
    description: "Guidance on booking editors, providing video briefs, request timelines, and managing package deliverables.",
    icon: "ShoppingBag",
    sort_order: 2
  },
  {
    name: "Disputes & Refunds",
    slug: "disputes-refunds",
    description: "How our arbitration works, rules for quality disputes, refund timelines, and mutual cancellation terms.",
    icon: "AlertTriangle",
    sort_order: 3
  },
  {
    name: "KYC & Verification",
    slug: "kyc-verification",
    description: "Information about account validation, government ID submissions (PAN/Aadhaar), and verified status.",
    icon: "UserCheck",
    sort_order: 4
  },
  {
    name: "Intellectual Property & Licensing",
    slug: "intellectual-property",
    description: "Rules regarding final video copyright transfers, stock asset licensing, and source file ownership.",
    icon: "Copyright",
    sort_order: 5
  },
  {
    name: "Platform Safety & Policies",
    slug: "safety-policies",
    description: "Anti-circumvention rules, review integrity, communication codes of conduct, and account dormancy rules.",
    icon: "Shield",
    sort_order: 6
  }
];

const categoryIdMap = {};

for (const cat of categories) {
  const [row] = await sql`
    INSERT INTO help_categories (name, slug, description, icon, sort_order)
    VALUES (${cat.name}, ${cat.slug}, ${cat.description}, ${cat.icon}, ${cat.sort_order})
    RETURNING id
  `;
  categoryIdMap[cat.slug] = row.id;
  console.log(`Seeded category: ${cat.name}`);
}

// 3. Articles (The 13 Policies and FAQs)
const articles = [
  // Payments & Escrow
  {
    categorySlug: "payments-escrow",
    title: "Escrow & Payout Policy",
    slug: "escrow-payout-policy",
    excerpt: "Learn how EditBridge secure escrow protects your funds until work is completed and approved.",
    readTime: "3 min read",
    content: `## 🔐 How Escrow Works on EditBridge

EditBridge uses a secure escrow holding system to build 100% trust between creators and video editors. 

### 1. Escrow Holding Rules
* **Immediate Collection:** Funds are collected from the client immediately upon project booking/checkout via Razorpay.
* **Locked Funds:** Funds are held in a secure, neutral escrow account. The editor cannot access or withdraw these funds while editing is in progress.
* **Explicit Release:** Funds are released to the editor only when the client clicks **"Approve & Complete"** on the order page, or when the auto-approval window expires.

### 2. Auto-Approval Window
If an editor delivers the final video files and the client does not request a revision or open a dispute within **72 hours**, the system will automatically mark the order as completed and release the funds to the editor's payout balance.

### 3. Commission & Payout Fees
* **Platform Fee:** EditBridge deducts a flat **15% commission** from the editor's payout upon successful completion.
* **TDS Deductions:** For Indian video editors, a 1% TDS (Tax Deducted at Source) is withheld in compliance with Section 194-O of the Indian Income Tax Act.
`
  },
  {
    categorySlug: "payments-escrow",
    title: "Platform Service Level Agreement (SLA) & Payout Timelines",
    slug: "platform-sla-payout-timelines",
    excerpt: "Expectations for support response times, dispute resolutions, and bank payout settlement schedules.",
    readTime: "2 min read",
    content: `## ⏳ Platform SLAs and Payout Timelines

We hold our support team and payout processes to high standards to ensure a fast, predictable marketplace.

### 1. Support Response Times
* **General Inquiries:** The support team answers all queries submitted through help center tickets or email within **24 hours**.
* **Escalations:** Urgent account access or security matters are prioritized and responded to within **6 hours**.

### 2. Payout Settlements
* **Processing:** Once a client approves the delivery, the payout is triggered automatically.
* **Settlement Window:** Razorpay route transfers are processed on the same day. However, depending on bank holidays and NEFT/IMPS processing times, it may take **24 to 48 hours** to reflect in your registered bank account.
`
  },

  // Orders & Revisions
  {
    categorySlug: "orders-revisions",
    title: "Video Briefs & Raw Footage Requirements",
    slug: "brief-footage-requirements",
    excerpt: "Guidelines for submitting a project brief and formatting video assets to avoid delivery delays.",
    readTime: "3 min read",
    content: `## 📝 Brief & Asset Guidelines

A clear project brief is the key to getting a high-quality video edit.

### 1. Requirements at Checkout
When placing an order, you are required to submit:
* **Raw Footage Links:** High-speed cloud storage links (Google Drive, Dropbox, Frame.io) containing all raw files.
* **Specific Guidelines:** Details on mood (e.g., fast-paced, documentary), color palette preferences, and background music.
* **Must-Includes & Must-Avoids:** Explicit instructions about what the editor must feature or exclude.

### 2. Timeline Impact
The editor's delivery countdown begins **only after** all assets and brief details are uploaded and validated. If an editor is waiting for your files, the deadline will be automatically extended by the duration of the delay.
`
  },
  {
    categorySlug: "orders-revisions",
    title: "Revision Policy & Scope Limits",
    slug: "revision-policy-scope-limits",
    excerpt: "Understand how revision requests work, standard limits, and how to request out-of-scope changes.",
    readTime: "3 min read",
    content: `## 🔄 Revisions and Scope Limits

Revisions are designed to polish the final video, not recreate a completely new project.

### 1. Revision Allotment
Each package states the exact number of revisions included (e.g., 2 revisions, unlimited revisions). Clients can request adjustments on:
* Text overlays and subtitle typography.
* Background track swaps or sound effects leveling.
* Tightening up transitions or re-ordering cuts.

### 2. Scope Creep Limitations
Revisions must align with the **original brief**. You cannot use a revision request to ask for a different video concept, additional features, or to edit an entirely different raw file. 
* *Example:* If the brief requested a 60-second vlog edit, you cannot request a 5-minute documentary edit as a revision.
* *Out-of-scope edits* must be negotiated by requesting a custom add-on from the editor.
`
  },

  // Disputes & Refunds
  {
    categorySlug: "disputes-refunds",
    title: "Dispute & Refund Arbitration Protocol",
    slug: "dispute-refund-arbitration-protocol",
    excerpt: "How EditBridge reviews and arbitrates disputes when quality or execution fails expectations.",
    readTime: "4 min read",
    content: `## ⚖️ Disputes and Refund Arbitration

If a client and editor hit an impasse, they can open a dispute to request platform arbitration.

### 1. Opening a Dispute
* Disputes must be opened **before** approving the final video.
* Once the order is completed and funds are released, no refunds can be processed.

### 2. Arbitration Process
The EditBridge dispute team will examine the following:
* **The Brief:** Was the instruction clear, and did the editor fail to follow objective rules (e.g., aspect ratios, must-includes)?
* **Revisions Log:** Did the client provide clear feedback, and did the editor make a reasonable attempt to execute the edits?
* **Platform Chats:** Only communication within the official EditBridge order chat is considered. External chat logs (WhatsApp/Discord) are invalid.

### 3. Arbitration Outcomes
* **100% Client Refund:** The editor delivered low-effort work, was late, or completely ignored key brief criteria.
* **100% Editor Payout:** The editor matched all brief instructions, but the client is executing a bad-faith cancellation.
* **Escrow Split (Partial Refund):** If the brief was ambiguous and both parties worked in good faith but couldn't reach a solution, the admin may rule to split the fund (e.g. 50% payout to editor, 50% refund to client).
`
  },

  // KYC & Verification
  {
    categorySlug: "kyc-verification",
    title: "Editor KYC & Verification Guidelines",
    slug: "editor-kyc-verification-guidelines",
    excerpt: "Documentation requirements, PAN/Aadhaar verification procedures, and banking setup for payouts.",
    readTime: "2 min read",
    content: `## 🪪 KYC Verification for Video Editors

To maintain a secure and compliant freelance marketplace, all editors must complete KYC verification before going live.

### 1. Required Documents
* **Identity Proof:** A government-issued document (Aadhaar Card, PAN Card, or Passport).
* **Tax Document:** An Indian PAN Card (required for TDS compliance and withholding tax logs).

### 2. Bank Verification
* To receive payouts, editors must link a valid bank account.
* **Name Match:** The bank account name **must match** the name on the verified KYC documents. We cannot process transfers to third-party bank accounts.
`
  },

  // Intellectual Property
  {
    categorySlug: "intellectual-property",
    title: "Intellectual Property & Video Copyright Ownership",
    slug: "intellectual-property-copyright-ownership",
    excerpt: "Who owns the copyright of the edited video, stock assets, and working project source files?",
    readTime: "3 min read",
    content: `## ⚖️ Copyright and Ownership Rights

Here is a clear breakdown of who owns the intellectual property at each step of an order.

### 1. Default Ownership
Upon final approval of the delivery and release of the escrow payment, **100% of the video copyrights** transfer to the client. The client owns the final exported MP4/MOV file.

### 2. Source Files (PRPROJ / AEP / XML)
Source files containing the editor's workspace, templates, keyframes, and project assets remain the intellectual property of the editor **unless** the client specifically purchased a "Source Files" add-on at checkout.

### 3. Editor Portfolio Rights
The editor retains a non-exclusive license to use short snippets of the final work in their personal portfolio or showreel. If the client requires absolute secrecy (e.g., NDA projects), they must purchase a "Private Portfolio" add-on.
`
  },
  {
    categorySlug: "intellectual-property",
    title: "Asset Licensing & DMCA Compliance",
    slug: "asset-licensing-dmca-compliance",
    excerpt: "Rules for sourcing royalty-free music, stock footages, and managing copyright claims on public portfolios.",
    readTime: "3 min read",
    content: `## 🎵 Stock Asset Licensing and DMCA Policy

EditBridge editors must deliver fully licensed and legally safe video cuts.

### 1. Sourcing Stock Assets
* Editors are responsible for ensuring that all background music, sound effects, B-roll clips, overlays, and fonts used are royalty-free, public domain, or legally licensed to the editor.
* Clients have the right to request proof of licensing for stock clips before releasing the escrow payment.

### 2. DMCA Safe Harbor
EditBridge complies with the Digital Millennium Copyright Act. If a third party files a copyright notice claiming an editor's portfolio video infringes their copyright, we will immediately remove the offending video in compliance with DMCA guidelines.
`
  },

  // Platform Safety
  {
    categorySlug: "safety-policies",
    title: "Anti-Circumvention Policy (Off-Platform Conduct)",
    slug: "anti-circumvention-off-platform-conduct",
    excerpt: "Why keeping payments and messages inside EditBridge is mandatory to protect your business.",
    readTime: "3 min read",
    content: `## 🚫 Keeping Payments & Chats on EditBridge

To protect creators from fraud and fund our escrow protection service, all communications and transactions must stay inside EditBridge.

### 1. Prohibited Actions
* **Exchanging Contacts:** Exchanging emails, phone numbers, WhatsApp, or Skype IDs in platform chats before booking.
* **Direct Payments:** Offering or accepting direct UPI, bank transfer, PayPal, or invoice payments off-platform.
* **External Billing:** Creating secondary contracts outside of the EditBridge checkout flow.

### 2. Penalties
Bypassing the platform's escrow system violates our terms. Violations result in an **immediate and permanent suspension** of the editor's account, and a permanent ban of the client's account.
`
  },
  {
    categorySlug: "safety-policies",
    title: "Review Integrity & Rating Manipulation Rules",
    slug: "review-integrity-rating-manipulation",
    excerpt: "Prohibitions against fake reviews, review trading, and feedback extortion practices.",
    readTime: "2 min read",
    content: `## ⭐ Review Integrity and Trust

Ratings are the lifeblood of our marketplace. We enforce a zero-tolerance policy for feedback manipulation.

### 1. Banned Feedback Behaviors
* **Self-Reviewing:** Editors cannot purchase their own packages using mock accounts to inflate their review counts.
* **Feedback Trading:** Trading positive reviews with other editors is prohibited.
* **Feedback Extortion:** Clients cannot threaten a low review to coerce editors into doing unpaid tasks. Editors cannot refuse to deliver a project unless the client promises a 5-star rating.
`
  },
  {
    categorySlug: "safety-policies",
    title: "AI-Generated Content & Tool Usage Rules",
    slug: "ai-generated-content-rules",
    excerpt: "Rules regarding the use of generative AI tools in video editing projects and disclosure requirements.",
    readTime: "2 min read",
    content: `## 🤖 AI Content and Disclosures

While AI tools speed up workflows, transparency is critical for creative collaborations.

### 1. General Workflow Tools
Standard AI tools built into video editing software (e.g., auto-transcription, smart audio leveling, AI-assisted rotoscoping) do not require disclosure.

### 2. Generative AI Tools
If an editor plans to use **Generative AI** (e.g., generating AI voices for voiceovers, synthetically generating video clips, using AI translate dubs), this **must be disclosed** in writing to the client before starting the order. Clients have the right to request 100% human-edited deliverables.
`
  },
  {
    categorySlug: "safety-policies",
    title: "Account Inactivity & Abandoned Wallet Policy",
    slug: "account-inactivity-abandoned-wallets",
    excerpt: "Dormancy rules for inactive editor profiles and outstanding referral credit expiration rules.",
    readTime: "2 min read",
    content: `## 💤 Dormancy and Inactivity Rules

We maintain a fresh, highly active marketplace of professionals.

### 1. Editor Inactivity
If an editor does not log in to their dashboard for **90 consecutive days**, their profile is temporarily hidden from the public search browse pages. The profile will reappear immediately once the editor logs back in.

### 2. Referral Credit Expiry
Any promotional credits or referral rewards earned on the platform must be spent within **365 days** of receipt. Unused promotional balances will expire after 1 year of inactivity.
`
  },
  {
    categorySlug: "safety-policies",
    title: "Privacy, KYC Deletion & GDPR Compliance",
    slug: "privacy-kyc-deletion-gdpr",
    excerpt: "How EditBridge stores data, handles government IDs securely, and processes account deletion requests.",
    readTime: "3 min read",
    content: `## 🔒 Data Privacy & Document Deletion

We prioritize your personal information and follow secure data deletion practices.

### 1. KYC Document Retention
* **Secure Processing:** Uploaded Aadhaar/PAN cards are processed over secure channels solely for identity validation.
* **Immediate Deletion:** Once the verification status is logged and approved, the raw document files are permanently deleted from our cloud servers to prevent security leaks.

### 2. Right to Deletion (GDPR / DPD)
Users have the right to request permanent account deletion. Upon verification of your request, we will erase all chats, project files, and personal details, except for transaction history records required for tax audit compliance.
`
  }
];

for (const art of articles) {
  const categoryId = categoryIdMap[art.categorySlug];
  if (!categoryId) {
    console.error(`Category not found: ${art.categorySlug}`);
    continue;
  }

  await sql`
    INSERT INTO help_articles (category_id, title, slug, excerpt, content, is_published, read_time)
    VALUES (${categoryId}, ${art.title}, ${art.slug}, ${art.excerpt}, ${art.content}, true, ${art.readTime})
  `;
  console.log(`Seeded article: ${art.title}`);
}

console.log("Help Center seeding completed successfully!");
process.exit(0);
