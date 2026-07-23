import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export interface MonthlyTaxRow {
  month: string; // e.g. "Apr 2025"
  grossEarnings: number; // paise
  commission: number; // paise
  netPayout: number; // paise
  orderCount: number;
}

export interface TaxReportData {
  editorName: string; // full legal name — the one document that shows it in full
  panNumber: string | null;
  financialYearLabel: string; // e.g. "2025–26"
  generatedOn: string;
  months: MonthlyTaxRow[];
  totalGross: number; // paise
  totalCommission: number; // paise
  totalNet: number; // paise
  totalOrders: number;
}

// "₹" has no glyph in react-pdf's built-in Helvetica (WinAnsi-only encoding),
// so it renders as garbage — "Rs." is the safe substitute without embedding a custom font.
function paise(amount: number): string {
  return "Rs. " + (amount / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
  reportTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textAlign: "right",
  },
  reportMeta: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 3,
    textAlign: "right",
  },
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  partyBox: {
    width: "60%",
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
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 9,
    color: "#64748b",
    lineHeight: 1.5,
  },
  // ── Summary cards ────────────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: 16,
    marginBottom: 24,
  },
  summaryCell: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  summaryLabel: {
    fontSize: 7.5,
    color: "#94a3b8",
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // ── Table ────────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingBottom: 6,
    marginBottom: 2,
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
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    borderBottomStyle: "solid",
  },
  colMonth: { width: "24%", fontSize: 9.5, color: "#1e293b" },
  colOrders: { width: "16%", fontSize: 9.5, color: "#64748b", textAlign: "right" },
  colGross: { width: "20%", fontSize: 9.5, color: "#1e293b", textAlign: "right" },
  colCommission: { width: "20%", fontSize: 9.5, color: "#ef4444", textAlign: "right" },
  colNet: { width: "20%", fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#0EA5E9", textAlign: "right" },
  totalSection: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: "#0EA5E9",
    borderTopStyle: "solid",
    flexDirection: "row",
  },
  totalMonth: { width: "24%", fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  totalOrders: { width: "16%", fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a", textAlign: "right" },
  totalGross: { width: "20%", fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a", textAlign: "right" },
  totalCommission: { width: "20%", fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ef4444", textAlign: "right" },
  totalNet: { width: "20%", fontSize: 12, fontFamily: "Helvetica-Bold", color: "#0EA5E9", textAlign: "right" },
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
  noteBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    padding: 10,
    marginTop: 20,
    flexDirection: "row",
    gap: 6,
  },
  noteText: {
    fontSize: 8.5,
    color: "#92400e",
    lineHeight: 1.5,
    flex: 1,
  },
});

export function TaxReportDocument({ data }: { data: TaxReportData }) {
  return (
    <Document
      title={`EditBridge Income Summary FY ${data.financialYearLabel}`}
      author="EditBridge"
      creator="EditBridge"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>EditBridge</Text>
            <Text style={styles.brandSub}>India&apos;s trusted video editing marketplace</Text>
            <Text style={styles.brandSub}>editbridge.in · support@editbridge.in</Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>Income Summary</Text>
            <Text style={styles.reportMeta}>Financial Year {data.financialYearLabel}</Text>
            <Text style={styles.reportMeta}>Generated: {data.generatedOn}</Text>
          </View>
        </View>

        {/* ── Editor identity ───────────────────────────────────────── */}
        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Editor</Text>
            <Text style={styles.partyName}>{data.editorName}</Text>
            {data.panNumber ? (
              <Text style={styles.partyDetail}>PAN: {data.panNumber}</Text>
            ) : (
              <Text style={styles.partyDetail}>PAN not on file — add it in Settings &gt; Payments</Text>
            )}
          </View>
        </View>

        {/* ── Summary cards ──────────────────────────────────────────── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{paise(data.totalGross)}</Text>
            <Text style={styles.summaryLabel}>Gross Earnings</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{paise(data.totalCommission)}</Text>
            <Text style={styles.summaryLabel}>Commission Paid</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{paise(data.totalNet)}</Text>
            <Text style={styles.summaryLabel}>Net Income</Text>
          </View>
        </View>

        {/* ── Monthly breakdown table ───────────────────────────────── */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: "24%" }]}>Month</Text>
          <Text style={[styles.tableHeaderText, { width: "16%", textAlign: "right" }]}>Orders</Text>
          <Text style={[styles.tableHeaderText, { width: "20%", textAlign: "right" }]}>Gross</Text>
          <Text style={[styles.tableHeaderText, { width: "20%", textAlign: "right" }]}>Commission</Text>
          <Text style={[styles.tableHeaderText, { width: "20%", textAlign: "right" }]}>Net Payout</Text>
        </View>

        {data.months.map((m) => (
          <View key={m.month} style={styles.row}>
            <Text style={styles.colMonth}>{m.month}</Text>
            <Text style={styles.colOrders}>{m.orderCount}</Text>
            <Text style={styles.colGross}>{paise(m.grossEarnings)}</Text>
            <Text style={styles.colCommission}>−{paise(m.commission)}</Text>
            <Text style={styles.colNet}>{paise(m.netPayout)}</Text>
          </View>
        ))}

        <View style={styles.totalSection}>
          <Text style={styles.totalMonth}>Total</Text>
          <Text style={styles.totalOrders}>{data.totalOrders}</Text>
          <Text style={styles.totalGross}>{paise(data.totalGross)}</Text>
          <Text style={styles.totalCommission}>−{paise(data.totalCommission)}</Text>
          <Text style={styles.totalNet}>{paise(data.totalNet)}</Text>
        </View>

        {/* ── Disclaimer ─────────────────────────────────────────────── */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            This is a summary statement generated from EditBridge platform records for your reference only.
            It is not an official tax document. Figures reflect completed, settled payouts only. Please consult
            a Chartered Accountant for official ITR filing.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            EditBridge Technology Pvt. Ltd. · GSTIN: 27XXXXX
          </Text>
          <Text style={styles.footerText}>
            Computer-generated summary · No signature required
          </Text>
        </View>

      </Page>
    </Document>
  );
}
