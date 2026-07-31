import Link from "next/link";
import { ShieldCheck, IndianRupee, Star, Zap, Users } from "lucide-react";

const STATS = [
  { value: "100+", label: "Verified editors" },
  { value: "₹0", label: "Fraud, ever" },
  { value: "4.9★", label: "Avg rating" },
];

const TESTIMONIAL = {
  text: "Found an amazing editor within minutes. The escrow protection gave me total peace of mind — I only paid when I was happy.",
  name: "Aryan M.",
  role: "YouTube Creator · 280K subscribers",
  initials: "AM",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#080E1A]">

      {/* Left panel — dark premium brand side */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between p-12 relative overflow-hidden bg-[#080E1A]">

        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#0EA5E9]/20 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#7C3AED]/18 blur-[90px]" />
          <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-[#0EA5E9]/8 blur-[70px]" />
        </div>

        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            Edit<span className="text-sky-400">Bridge</span>
          </span>
        </Link>

        {/* Center content */}
        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400/70 mb-4">
              India&apos;s verified editor marketplace
            </p>
            <h2 className="text-4xl font-black text-white leading-[1.1] tracking-tight mb-5">
              Professional video<br />
              editing, done{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-400">
                the right way.
              </span>
            </h2>
            <p className="text-sm text-white/40 leading-relaxed max-w-sm">
              Browse portfolios, compare packages, hire KYC-verified editors — every payment protected by escrow.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {STATS.map(({ value, label }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur-sm px-4 py-3 text-center">
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[11px] text-white/35 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Trust bullets */}
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, label: "Every editor KYC-verified", color: "text-emerald-400" },
              { icon: IndianRupee, label: "Escrow-protected payments", color: "text-sky-400" },
              { icon: Star, label: "Rated by real clients only", color: "text-amber-400" },
              { icon: Zap, label: "Packages from ₹299", color: "text-violet-400" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <span className="text-sm text-white/55">{label}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-4 italic">
              &quot;{TESTIMONIAL.text}&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                {TESTIMONIAL.initials}
              </div>
              <div>
                <p className="text-xs font-bold text-white/80">{TESTIMONIAL.name}</p>
                <p className="text-[11px] text-white/35">{TESTIMONIAL.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[11px] text-white/20">
          © {new Date().getFullYear()} EditBridge · All rights reserved
        </p>
      </div>

      {/* Right panel — glassmorphism */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto relative bg-[#080E1A]">
        {/* Vivid color blobs behind the glass */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-sky-500/25 blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 w-[450px] h-[450px] rounded-full bg-violet-600/25 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-indigo-500/15 blur-[80px]" />
        </div>
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        {/* Glass card */}
        <div className="w-full max-w-[420px] relative z-10 rounded-3xl px-8 py-8"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
          {children}

          <p className="mt-6 text-[12px] text-white/20 text-center leading-relaxed">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-white/35 underline underline-offset-2 hover:text-white/60 transition-colors">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-white/35 underline underline-offset-2 hover:text-white/60 transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>

    </div>
  );
}
