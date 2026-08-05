import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogSubscribers } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email(),
});

export async function GET(req: NextRequest) {
  try {
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(blogSubscribers);
    const count = Number(countResult[0]?.count ?? 0);
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email } = parsed.data;

    // Check if already subscribed
    const existing = await db
      .select()
      .from(blogSubscribers)
      .where(eq(blogSubscribers.email, email))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return NextResponse.json({ message: "Already subscribed!" }, { status: 200 });
    }

    const [subscriber] = await db
      .insert(blogSubscribers)
      .values({ email })
      .returning();

    return NextResponse.json({ subscriber, message: "Subscribed successfully!" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Subscriber ID is required" }, { status: 400 });
    }
    await db.delete(blogSubscribers).where(eq(blogSubscribers.id, id));
    return NextResponse.json({ message: "Subscriber removed successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
