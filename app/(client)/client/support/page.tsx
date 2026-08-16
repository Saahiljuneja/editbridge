import { TopoBackground } from "@/components/common/topo-background";
import { SupportContent } from "./support-content";

export default function ClientSupportPage() {
  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-16 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />
      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-6 relative z-10">
        <SupportContent />
      </div>
    </div>
  );
}
