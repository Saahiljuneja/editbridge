import Link from "next/link";
import { ShieldCheck, Star, IndianRupee } from "lucide-react";

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Every editor KYC-verified" },
  { icon: IndianRupee,  text: "Verified payment protection" },
  { icon: Star,         text: "Rated by real clients" },
];

const TESTIMONIAL = {
  text: "Found an amazing editor within minutes. The verified payment protection gave me total peace of mind — I only paid when I was happy with the work.",
  name: "Aryan M.",
  role: "YouTube Creator, 280K subscribers",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #07050f 0%, #1a1040 60%, #0c1a10 100%)" }}
      >
        {/* Background blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--brand-client)]/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[var(--brand-client)]/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#6C5CE7]/10 blur-2xl pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand-client)] flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">E</span>
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">
            Edit<span className="text-[#8B7FE8]">Bridge</span>
          </span>
        </Link>

        {/* Center content */}
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7FE8] mb-4">
            India&apos;s trusted creator marketplace
          </p>
          <h2 className="text-3xl font-bold text-white leading-snug mb-8">
            Professional video editing,<br />
            <span className="text-[#8B7FE8]">done the right way.</span>
          </h2>

          {/* Trust points */}
          <div className="space-y-4 mb-10">
            {TRUST_POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#8B7FE8]" />
                </div>
                <span className="text-sm text-white/70">{text}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-white/75 leading-relaxed mb-4 italic">
              &quot;{TESTIMONIAL.text}&quot;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-client)] to-[#6C5CE7] flex items-center justify-center text-white text-xs font-bold">
                {TESTIMONIAL.name[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{TESTIMONIAL.name}</p>
                <p className="text-xs text-white/40">{TESTIMONIAL.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-xs text-white/25">
          © {new Date().getFullYear()} EditBridge. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-8 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-client)] flex items-center justify-center">
            <span className="text-white font-extrabold text-xs">E</span>
          </div>
          <span className="text-xl font-extrabold text-gray-900 tracking-tight">
            Edit<span className="text-[var(--brand-client)]">Bridge</span>
          </span>
        </Link>

        <div className="w-full max-w-md">
          {children}

          <p className="mt-8 text-xs text-gray-400 text-center">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
