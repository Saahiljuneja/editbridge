import { Metadata } from "next";
import Link from "next/link";
import { Shield, Mail, Clock, FileText, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Grievance Redressal Policy — EditBridge",
  description: "EditBridge's grievance redressal mechanism as required under the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.",
};

export default function GrievancePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#07050f] px-4 py-16">
        <div className="px-8 py-6">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Legal · India</p>
          <h1 className="text-3xl font-extrabold text-white mb-3">Grievance Redressal Policy</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            As required under Rule 3(2) of the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 — published under the Information Technology Act, 2000.
          </p>
          <p className="text-white/30 text-xs mt-4">Last updated: June 2025</p>
        </div>
      </div>

      <div className="px-8 py-6 space-y-12">

        {/* Grievance Officer */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Grievance Officer</p>
          <div className="rounded-2xl border border-[var(--brand-client)]/15 bg-[var(--brand-client)]/3 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[var(--brand-client)]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">Saahil Juneja</p>
                <p className="text-sm text-gray-500 mt-0.5">Grievance Officer — EditBridge</p>
                <div className="mt-3 space-y-1.5">
                  <a
                    href="mailto:grievance@editbridge.in"
                    className="flex items-center gap-2 text-sm text-[var(--brand-client)] font-medium hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    grievance@editbridge.in
                  </a>
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Available Mon–Sat, 9 AM–7 PM IST
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            As required by law, EditBridge has appointed a Grievance Officer to address complaints from users regarding content hosted on the platform or the conduct of other users.
          </p>
        </section>

        {/* How to file */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">How to File a Grievance</p>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Try self-service first",
                desc: "For order disputes, use the built-in dispute system on your order page. For account issues, check the FAQ. Most issues are resolved faster this way.",
              },
              {
                step: "2",
                title: "Email the Grievance Officer",
                desc: "If self-service doesn't resolve your issue, email grievance@editbridge.in with your registered email, order ID (if applicable), and a clear description of the grievance.",
              },
              {
                step: "3",
                title: "Acknowledgement within 24 hours",
                desc: "We will acknowledge your complaint within 24 hours of receipt and provide a reference number for tracking.",
              },
              {
                step: "4",
                title: "Resolution within 30 days",
                desc: "As mandated by the IT Rules 2021, all grievances will be resolved within 30 days of receipt. Complex cases may take longer, but we will keep you informed.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-[var(--brand-client)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we can help with */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">What This Covers</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Unlawful or harmful content posted by users",
              "Impersonation or fake profiles",
              "Privacy violations by other users",
              "Harassment, abuse, or threats on the platform",
              "Fraudulent transactions or payment disputes",
              "KYC rejection appeals",
              "Account suspension or termination appeals",
              "Any violation of EditBridge's Terms of Service",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-100">
                <CheckCircle className="w-4 h-4 text-[var(--brand-client)] shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Legal basis */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Legal Basis</p>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800">IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Under Rule 3(2)(b), every intermediary must designate a Grievance Officer to receive and acknowledge user complaints within 24 hours and resolve them within 30 days.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Information Technology Act, 2000 (Section 79)</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  EditBridge operates as an intermediary under Section 79 of the IT Act, 2000, which provides safe harbour protection contingent on compliance with due diligence requirements, including this grievance mechanism.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Digital Personal Data Protection Act, 2023 (DPDPA)</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Complaints relating to misuse of personal data are handled under this policy in compliance with the DPDPA.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Escalation */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Escalation</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            If you are not satisfied with the resolution provided by the Grievance Officer, you may escalate the matter to the Ministry of Electronics and Information Technology (MeitY) through the Grievance Appellate Committee (GAC) at{" "}
            <a
              href="https://sachet.rbi.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-client)] hover:underline"
            >
              gac.meity.gov.in
            </a>
            , or approach the appropriate Consumer Forum or court of law.
          </p>
        </section>

        {/* Footer links */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-[var(--brand-client)]">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[var(--brand-client)]">Privacy Policy</Link>
          <Link href="/refund" className="hover:text-[var(--brand-client)]">Refund Policy</Link>
          <Link href="/disclaimer" className="hover:text-[var(--brand-client)]">Disclaimer</Link>
          <Link href="/contact" className="hover:text-[var(--brand-client)]">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}