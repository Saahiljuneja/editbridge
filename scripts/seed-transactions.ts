import { db } from "../lib/db";
import { users, editors, packages, orders, payouts } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const EDITOR_EMAIL = "editbridge01@gmail.com";

// Realistic sample clients
const SAMPLE_CLIENTS = [
  { email: "rahul.sharma@gmail.com",    name: "Rahul Sharma" },
  { email: "priya.kapoor@gmail.com",    name: "Priya Kapoor" },
  { email: "dev.patel@outlook.com",     name: "Dev Patel" },
  { email: "simran.bhatia@yahoo.com",   name: "Simran Bhatia" },
  { email: "arjun.nair@gmail.com",      name: "Arjun Nair" },
  { email: "meera.joshi@gmail.com",     name: "Meera Joshi" },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function razorpayOrderId() {
  return "order_" + crypto.randomBytes(10).toString("hex").slice(0, 16);
}
function razorpayPaymentId() {
  return "pay_" + crypto.randomBytes(10).toString("hex").slice(0, 16);
}

async function main() {
  console.log("🔍 Looking up editor:", EDITOR_EMAIL);

  // 1. Find editor user
  const [editorUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, EDITOR_EMAIL));

  if (!editorUser) {
    console.error("❌ Editor user not found for email:", EDITOR_EMAIL);
    process.exit(1);
  }
  console.log("✅ Editor user:", editorUser.id, editorUser.name);

  // 2. Find editor record
  const [editor] = await db
    .select()
    .from(editors)
    .where(eq(editors.userId, editorUser.id));

  if (!editor) {
    console.error("❌ Editor profile not found for userId:", editorUser.id);
    process.exit(1);
  }
  console.log("✅ Editor ID:", editor.id);

  // 3. Find existing packages for this editor
  const editorPackages = await db
    .select()
    .from(packages)
    .where(eq(packages.editorId, editor.id));

  console.log(`✅ Found ${editorPackages.length} package(s)`);

  // Use first package if available, otherwise use a default price
  const pkg1 = editorPackages[0];
  const pkg2 = editorPackages[1] ?? pkg1;
  const pkg3 = editorPackages[2] ?? pkg1;

  // 4. Upsert sample client users
  console.log("👥 Upserting sample clients...");
  const clientIds: string[] = [];

  for (const c of SAMPLE_CLIENTS) {
    const existing = await db.select().from(users).where(eq(users.email, c.email));
    if (existing.length > 0) {
      clientIds.push(existing[0].id);
      console.log("  ↩ Existing client:", c.email);
    } else {
      const [inserted] = await db
        .insert(users)
        .values({
          email: c.email,
          name: c.name,
          role: "client",
          onboarded: true,
          isActive: true,
        })
        .returning({ id: users.id });
      clientIds.push(inserted.id);
      console.log("  ✅ Created client:", c.email);
    }
  }

  // 5. Define sample orders
  // All amounts in paise. Commission = 20%, processingFee = 10% of base price.
  const BASE_PRICES = pkg1
    ? [pkg1.price, pkg2?.price ?? pkg1.price, pkg3?.price ?? pkg1.price]
    : [50000, 100000, 150000]; // fallback: ₹500, ₹1000, ₹1500

  function price(idx: number) { return BASE_PRICES[idx % BASE_PRICES.length]; }
  function commission(base: number) { return Math.round(base * 0.20); }
  function procFee(base: number) { return Math.round(base * 0.10); }
  function total(base: number) { return base + procFee(base); }

  const pkgIds = pkg1
    ? [pkg1?.id, pkg2?.id ?? pkg1?.id, pkg3?.id ?? pkg1?.id]
    : [null, null, null];

  const orderDefs: {
    clientIdx: number;
    pkgIdx: number;
    status: "pending" | "in_progress" | "delivered" | "completed" | "cancelled" | "revision_requested";
    brief: string;
    daysCreated: number;
    daysCompleted?: number;
    daysCancelled?: number;
  }[] = [
    { clientIdx: 0, pkgIdx: 0, status: "completed",   brief: "Edit my YouTube vlog from Goa trip, make it cinematic with color grading.", daysCreated: 45, daysCompleted: 38 },
    { clientIdx: 1, pkgIdx: 1, status: "completed",   brief: "Wedding highlight video, 3-minute reel with background music.", daysCreated: 40, daysCompleted: 33 },
    { clientIdx: 2, pkgIdx: 0, status: "completed",   brief: "Product launch video for my skincare brand — 60 seconds Instagram reel.", daysCreated: 35, daysCompleted: 28 },
    { clientIdx: 3, pkgIdx: 2, status: "cancelled",   brief: "Long-form YouTube video about stock market basics, need captions too.", daysCreated: 32, daysCancelled: 30 },
    { clientIdx: 4, pkgIdx: 0, status: "completed",   brief: "Short documentary about my café opening — 5 min final cut.", daysCreated: 28, daysCompleted: 20 },
    { clientIdx: 5, pkgIdx: 1, status: "completed",   brief: "Podcast video edit with B-roll and lower thirds, 40 minutes.", daysCreated: 22, daysCompleted: 15 },
    { clientIdx: 0, pkgIdx: 2, status: "cancelled",   brief: "Travel montage from Europe trip, 2-minute reel in trendy style.", daysCreated: 18, daysCancelled: 15 },
    { clientIdx: 1, pkgIdx: 0, status: "completed",   brief: "Cooking tutorial edit, need text overlays and transitions.", daysCreated: 14, daysCompleted: 8 },
    { clientIdx: 2, pkgIdx: 1, status: "in_progress", brief: "Brand video for my startup, professional corporate style, 3 minutes.", daysCreated: 7 },
    { clientIdx: 3, pkgIdx: 0, status: "delivered",   brief: "Music video edit with sync cuts, lyrics on screen, 4 minutes.", daysCreated: 5 },
    { clientIdx: 4, pkgIdx: 2, status: "revision_requested", brief: "Fitness transformation video, before-after montage, need energetic cuts.", daysCreated: 4 },
    { clientIdx: 5, pkgIdx: 0, status: "pending",     brief: "Gaming highlights reel for my YouTube channel, 10 minutes.", daysCreated: 1 },
    { clientIdx: 0, pkgIdx: 1, status: "pending",     brief: "Real estate walkthrough video edit, professional voiceover sync needed.", daysCreated: 0 },
  ];

  console.log("\n📦 Inserting orders...");

  const createdOrders: { id: string; status: string; basePrice: number; pkgId: string | null }[] = [];

  for (const def of orderDefs) {
    const base = price(def.pkgIdx);
    const com = commission(base);
    const pf = procFee(base);
    const tot = total(base);
    const createdAt = daysAgo(def.daysCreated);
    const completedAt = def.daysCompleted != null ? daysAgo(def.daysCompleted) : undefined;
    const cancelledAt = def.daysCancelled != null ? daysAgo(def.daysCancelled) : undefined;

    const [order] = await db
      .insert(orders)
      .values({
        clientId: clientIds[def.clientIdx],
        editorId: editor.id,
        packageId: pkgIds[def.pkgIdx],
        status: def.status,
        totalAmount: tot,
        commissionAmount: com,
        processingFee: pf,
        brief: def.brief,
        razorpayOrderId: razorpayOrderId(),
        razorpayPaymentId: def.status !== "pending" ? razorpayPaymentId() : null,
        completedAt: completedAt ?? null,
        cancelledAt: cancelledAt ?? null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: orders.id });

    createdOrders.push({ id: order.id, status: def.status, basePrice: base, pkgId: pkgIds[def.pkgIdx] });
    console.log(`  ✅ Order ${order.id.slice(0, 8)}… [${def.status}] ₹${tot / 100}`);
  }

  // 6. Create payouts for completed orders
  console.log("\n💸 Inserting payouts for completed orders...");

  const TDS_RATE = 10;

  const completedOrders = createdOrders.filter((o) => o.status === "completed");

  // Mix of payout statuses: some completed (settled), some pending, one processing
  const payoutStatuses: Array<"completed" | "pending" | "processing"> = [
    "completed", "completed", "completed", "completed", "pending", "processing",
  ];

  for (let i = 0; i < completedOrders.length; i++) {
    const o = completedOrders[i];
    const gross = Math.round(o.basePrice * 0.80); // 80% after 20% commission
    const tdsAmt = Math.round(gross * TDS_RATE / 100);
    const net = gross - tdsAmt;
    const payoutStatus = payoutStatuses[i % payoutStatuses.length];
    const daysOffset = (completedOrders.length - i) * 5;
    const scheduledAt = daysAgo(daysOffset - 7);
    const settledAt = payoutStatus === "completed" ? daysAgo(daysOffset) : null;

    await db.insert(payouts).values({
      editorId: editor.id,
      orderId: o.id,
      grossAmount: gross,
      commissionAmount: Math.round(o.basePrice * 0.20),
      tdsAmount: tdsAmt,
      tdsRatePct: TDS_RATE,
      netAmount: net,
      razorpayTransferId: payoutStatus === "completed" ? ("pout_" + crypto.randomBytes(8).toString("hex")) : null,
      status: payoutStatus,
      scheduledPayoutAt: scheduledAt,
      settledAt,
      createdAt: scheduledAt,
      updatedAt: settledAt ?? scheduledAt,
    });

    console.log(`  ✅ Payout for order ${o.id.slice(0, 8)}… [${payoutStatus}] net ₹${net / 100}`);
  }

  console.log("\n🎉 Done! Sample transactions created for", EDITOR_EMAIL);
  console.log(`   Orders: ${createdOrders.length}`);
  console.log(`   Payouts: ${completedOrders.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
