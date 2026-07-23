import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice/invoice-template";
import type { InvoiceData } from "@/components/invoice/invoice-template";
import { createElement } from "react";
import type { ReactElement } from "react";
import { displayNameFromFull, formatDate } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      processingFee: orders.processingFee,
      rewardDiscountAmount: orders.rewardDiscountAmount,
      creditApplied: orders.creditApplied,
      createdAt: orders.createdAt,
      razorpayPaymentId: orders.razorpayPaymentId,
      clientId: orders.clientId,
      editorId: orders.editorId,
      packageTitle: packages.title,
      packagePrice: packages.price,
      clientName: users.name,
      clientEmail: users.email,
      editorUserId: editors.userId,
      editorTitle: editors.title,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Only the client or editor on this order may download the invoice
  const isClient = session.user.userId === order.clientId;
  const isEditor = session.user.userId === order.editorUserId;
  const isStaff = ["admin", "staff_support", "staff_dispute"].includes(session.user.role ?? "");
  if (!isClient && !isEditor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Invoice only available once the order is completed (payment released)
  if (order.status !== "completed") {
    return NextResponse.json({ error: "Invoice is available only after order completion" }, { status: 409 });
  }

  // Fetch editor's display name
  const [editorUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, order.editorUserId))
    .limit(1);

  const processingFee = order.processingFee ?? 0;
  const rewardDiscountAmount = order.rewardDiscountAmount ?? 0;
  const creditApplied = order.creditApplied ?? 0;
  // originalPackagePrice = what the editor listed the package at
  const packagePrice = (order.packagePrice ?? order.totalAmount - processingFee + rewardDiscountAmount);
  // Amount actually charged to the client's card/bank
  const totalPaid = order.totalAmount - creditApplied;

  // Derive a short, consistent invoice number from the order UUID
  const invoiceSuffix = String(parseInt(id.replace(/-/g, "").slice(-8), 16) % 100000).padStart(4, "0");
  const invoiceYear = new Date(order.createdAt).getFullYear();

  const data: InvoiceData = {
    invoiceNumber: `EB-INV-${invoiceYear}-${invoiceSuffix}`,
    orderId: id.slice(0, 8).toUpperCase(),
    date: formatDate(order.createdAt),
    clientName: displayNameFromFull(order.clientName),
    clientEmail: order.clientEmail,
    editorName: displayNameFromFull(editorUser?.name),
    editorTitle: order.editorTitle ?? "",
    packageTitle: order.packageTitle ?? "Video editing service",
    packagePrice,
    rewardDiscountAmount,
    processingFee,
    creditApplied,
    totalPaid,
  };

  const element = createElement(InvoiceDocument, { data }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-EB-${id.slice(0, 8).toUpperCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
