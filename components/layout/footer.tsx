import Link from "next/link";
import { ShieldCheck, Lock, Star } from "lucide-react";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "KYC-verified editors" },
  { icon: Lock,        label: "Escrow-protected payments" },
  { icon: Star,        label: "Verified client reviews" },
];

const LINKS = {
  "For Clients": [
    { label: "Browse editors",  href: "/browse" },
    { label: "How it works",   href: "/how-it-works" },
    { label: "Pricing",        href: "/pricing" },
  ],
  "For Editors": [
    { label: "Join as editor",  href: "/signup/editor" },
    { label: "KYC verification",href: "/how-it-works" },
    { label: "Editor pricing",  href: "/pricing" },
  ],
  "Company": [
    { label: "About us",        href: "/about" },
    { label: "Blog",            href: "/blog" },
    { label: "Contact us",      href: "/contact" },
    { label: "Grievance",       href: "/grievance" },
  ],
  "Legal": [
    { label: "Terms of Service",href: "/terms" },
    { label: "Privacy Policy",  href: "/privacy" },
    { label: "Refund Policy",   href: "/refund" },
    { label: "Cookie Policy",   href: "/cookie-policy" },
    { label: "Disclaimer",      href: "/disclaimer" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#07050f] border-t border-white/5">
      {/* Trust bar */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#8B7FE8]" />
                <span className="text-xs text-white/50 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#0EA5E9] flex items-center justify-center">
                <span className="text-white font-extrabold text-xs">E</span>
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                Edit<span className="text-[#8B7FE8]">Bridge</span>
              </span>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              India&apos;s trusted marketplace for video editing and thumbnail design.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
                {heading}
              </h3>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-white/50 hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} EditBridge. All rights reserved.
          </p>
          <p className="text-xs text-white/25">
            15% commission · Escrow-protected · KYC-verified
          </p>
        </div>
      </div>
    </footer>
  );
}
