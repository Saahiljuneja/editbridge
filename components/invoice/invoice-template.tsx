import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  date: string;
  clientName: string;
  clientEmail: string;
  editorName: string;
  editorTitle: string;
  packageTitle: string;
  packagePrice: number; // paise — original price before discount
  rewardDiscountAmount: number; // paise — 0 if no discount
  processingFee: number; // paise
  creditApplied: number; // paise — 0 if no credits used
  totalPaid: number; // paise — totalAmount - creditApplied
}

function paise(amount: number): string {
  return "₹" + (amount / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 52,
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0EA5E9",
    borderBottomStyle: "solid",
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0EA5E9",
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 7.5,
    color: "#94a3b8",
    marginTop: 3,
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textAlign: "right",
  },
  invoiceMeta: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 3,
    textAlign: "right",
  },
  // ── Parties ─────────────────────────────────────────────────────────────────
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  partyBox: {
    width: "46%",
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 9,
    color: "#64748b",
    lineHeight: 1.5,
  },
  // ── Line items ──────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    borderBottomStyle: "solid",
  },
  rowDesc: {
    fontSize: 10,
    color: "#1e293b",
    flex: 1,
  },
  rowSubDesc: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 10,
    color: "#1e293b",
    textAlign: "right",
    minWidth: 72,
  },
  discountAmount: {
    fontSize: 10,
    color: "#16a34a",
    textAlign: "right",
    minWidth: 72,
  },
  creditAmount: {
    fontSize: 10,
    color: "#7c3aed",
    textAlign: "right",
    minWidth: 72,
  },
  // ── Totals ──────────────────────────────────────────────────────────────────
  totalSection: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: "#0EA5E9",
    borderTopStyle: "solid",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  totalAmount: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0EA5E9",
  },
  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 32,
    left: 52,
    right: 52,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7.5,
    color: "#94a3b8",
  },
  // ── Note box ────────────────────────────────────────────────────────────────
  noteBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: 4,
    padding: 10,
    marginTop: 20,
    flexDirection: "row",
    gap: 6,
  },
  noteText: {
    fontSize: 8.5,
    color: "#0369a1",
    lineHeight: 1.5,
    flex: 1,
  },
});

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const discountedPackagePrice = data.packagePrice - data.rewardDiscountAmount;
  const subtotal = discountedPackagePrice + data.processingFee;
  // totalPaid already accounts for creditApplied

  return (
    <Document
      title={`Invoice ${data.invoiceNumber}`}
      author="EditBridge"
      creator="EditBridge"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>EditBridge</Text>
            <Text style={styles.brandSub}>India's trusted video editing marketplace</Text>
            <Text style={styles.brandSub}>editbridge.in · support@editbridge.in</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Tax Invoice</Text>
            <Text style={styles.invoiceMeta}>Invoice # {data.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>Order # EB-{data.orderId}</Text>
            <Text style={styles.invoiceMeta}>Date: {data.date}</Text>
          </View>
        </View>

        {/* ── Parties ────────────────────────────────────────────── */}
        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Billed to</Text>
            <Text style={styles.partyName}>{data.clientName}</Text>
            <Text style={styles.partyDetail}>{data.clientEmail}</Text>
          </View>
          <View style={[styles.partyBox, { alignItems: "flex-end" }]}>
            <Text style={styles.partyLabel}>Service provider</Text>
            <Text style={styles.partyName}>{data.editorName} (via EditBridge)</Text>
            {data.editorTitle ? (
              <Text style={styles.partyDetail}>{data.editorTitle}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Line items table ────────────────────────────────────── */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Description</Text>
          <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>Amount</Text>
        </View>

        {/* Package */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowDesc}>{data.packageTitle}</Text>
            <Text style={styles.rowSubDesc}>Video editing service via EditBridge</Text>
          </View>
          <Text style={styles.rowAmount}>{paise(data.packagePrice)}</Text>
        </View>

        {/* Member discount (only if applicable) */}
        {data.rewardDiscountAmount > 0 && (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowDesc}>Member reward discount</Text>
              <Text style={styles.rowSubDesc}>EditBridge loyalty programme benefit</Text>
            </View>
            <Text style={styles.discountAmount}>− {paise(data.rewardDiscountAmount)}</Text>
          </View>
        )}

        {/* Processing fee */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowDesc}>Platform processing fee (4%)</Text>
            <Text style={styles.rowSubDesc}>Covers payment gateway and escrow handling</Text>
          </View>
          <Text style={styles.rowAmount}>{paise(data.processingFee)}</Text>
        </View>

        {/* Credits applied (if any) */}
        {data.creditApplied > 0 && (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowDesc}>Reward credits redeemed</Text>
              <Text style={styles.rowSubDesc}>Applied from your EditBridge rewards balance</Text>
            </View>
            <Text style={styles.creditAmount}>− {paise(data.creditApplied)}</Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalAmount}>{paise(data.totalPaid)}</Text>
        </View>

        {/* Note box */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Payment was held in escrow by EditBridge and released to the service provider upon client approval. This invoice confirms payment of the above amount. For any queries, contact support@editbridge.in.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            EditBridge Technology Pvt. Ltd. · GSTIN: 27XXXXX
          </Text>
          <Text style={styles.footerText}>
            This is a computer-generated invoice · No signature required
          </Text>
        </View>

      </Page>
    </Document>
  );
}
