import { db } from "../lib/db";
import { users, editors, orders, reviews } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

const EDITOR_EMAIL = "editbridge01@gmail.com";

const REVIEW_DATA = [
  { rating: 5, text: "Absolutely blown away by the quality. The pacing, color grading, and music sync were perfect. My YouTube video went from 8% to 14% CTR after the edit. Highly recommend!", reply: "Thank you so much! CTR improvement like that is exactly what I aim for. Always great working with you." },
  { rating: 5, text: "Delivered 2 days early and the final cut was exactly what I envisioned. Clear communication throughout, no back-and-forth needed. Will definitely be booking again.", reply: null },
  { rating: 5, text: "I've tried 4 different editors on this platform — this is the only one I keep coming back to. Understands the YouTube algorithm, cuts for retention, and never misses a beat.", reply: "Really appreciate that! Retention-focused editing is something I spend a lot of time studying. See you on the next one." },
  { rating: 4, text: "Great work overall. The intro hook was especially strong. Only reason for 4 stars is it took a couple of extra revisions to nail the pacing in the middle section, but the end result was worth it.", reply: "Fair point — I've noted your preference for tighter mid-section pacing for next time. Thanks for the feedback!" },
  { rating: 5, text: "Our wedding highlight reel made everyone at the reception tear up. Every important moment was captured beautifully. The music choice was spot on too.", reply: null },
  { rating: 5, text: "Professional, fast, and incredibly talented. My Instagram reels have doubled in reach since I started working with this editor. The transitions and energy match my brand perfectly.", reply: "Glad the reels are performing! Reels require a very different eye than long-form — happy it's paying off for you." },
  { rating: 3, text: "Good quality edit but communication was a bit slow at times. The final product was solid though, and they did address all my revision notes.", reply: "Appreciate the honest feedback. I was dealing with a higher volume that week and should have communicated timelines better. I'll do better." },
  { rating: 5, text: "Incredible attention to detail. Asked for a very specific cinematic look and they nailed it on the first draft. Saved me hours of my own editing time.", reply: null },
  { rating: 4, text: "Very talented editor. The color grade was stunning. Docked one star because the first draft had some audio sync issues, but they were fixed super quickly on revision.", reply: "Audio sync on multi-cam shoots can be tricky — thanks for flagging it quickly so I could fix it right away!" },
  { rating: 5, text: "Ordered a corporate explainer video edit and was genuinely impressed. Clean, professional, and on-brand. Our marketing team loved it. Will be ordering monthly.", reply: "Thrilled the team loved it! Corporate work requires a very clean hand — glad that came through. Looking forward to the next one." },
  { rating: 5, text: "Edited my podcast video for YouTube and the result was super engaging. The cuts between speakers felt natural and they added clean lower-thirds too without me asking. Little details like that matter.", reply: null },
  { rating: 5, text: "One of the best investments I've made for my channel. The gaming montage was absolutely fire — transitions were smooth, the energy was exactly right, and it was ready the same day.", reply: "Same-day turnaround on a montage is something I take pride in. Glad it hit the mark!" },
  { rating: 4, text: "Solid editor who clearly knows what they're doing. The travel vlog cut was engaging. Just wish there was a bit more communication during the process. But the quality speaks for itself.", reply: null },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("🔍 Looking up editor:", EDITOR_EMAIL);

  const [editorUser] = await db.select().from(users).where(eq(users.email, EDITOR_EMAIL));
  if (!editorUser) { console.error("❌ Editor user not found"); process.exit(1); }
  console.log("✅ Editor user:", editorUser.id, editorUser.name);

  const [editor] = await db.select().from(editors).where(eq(editors.userId, editorUser.id));
  if (!editor) { console.error("❌ Editor record not found"); process.exit(1); }
  console.log("✅ Editor ID:", editor.id);

  // Get all orders for this editor that have a client attached
  const editorOrders = await db
    .select({ id: orders.id, clientId: orders.clientId, status: orders.status })
    .from(orders)
    .where(eq(orders.editorId, editor.id));

  console.log(`✅ Found ${editorOrders.length} order(s)`);

  if (editorOrders.length === 0) {
    console.error("❌ No orders found — run seed-transactions.ts first");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < editorOrders.length; i++) {
    const order = editorOrders[i];
    const reviewTemplate = REVIEW_DATA[i % REVIEW_DATA.length];

    // Skip if review already exists for this order
    const existing = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.orderId, order.id), eq(reviews.role, "client")))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ↩ Skipping order ${order.id} — review already exists`);
      skipped++;
      continue;
    }

    const createdAt = daysAgo(Math.floor(Math.random() * 90) + 1);

    await db.insert(reviews).values({
      orderId: order.id,
      reviewerId: order.clientId,
      revieweeId: editorUser.id,
      role: "client",
      rating: reviewTemplate.rating,
      text: reviewTemplate.text,
      replyText: reviewTemplate.reply ?? null,
      createdAt,
      updatedAt: createdAt,
    });

    console.log(`  ✅ Review ${i + 1}: ${reviewTemplate.rating}★ — order ${order.id}`);
    created++;
  }

  console.log(`\n🎉 Done — ${created} review(s) created, ${skipped} skipped`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
