"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusCircle, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export function ManualOrderForm({
  clientId,
  editorId,
  packages,
}: {
  clientId: string;
  editorId: string;
  packages: { id: string; title: string; price: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [packageId, setPackageId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("3");
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handlePackageChange(id: string) {
    setPackageId(id);
    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      setBasePrice(String(pkg.price / 100));
      setBrief(`Manual order for: ${pkg.title}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!basePrice || !deadlineDays) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          editorId,
          packageId: packageId || null,
          basePriceInr: basePrice,
          deadlineDays: parseInt(deadlineDays, 10),
          brief,
        }),
      });
      if (res.ok) {
        toast.success("Manual order contract created successfully!");
        setOpen(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Failed to place order.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <PlusCircle className="w-4 h-4 text-emerald-500" /> Create Manual Order
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 space-y-4 w-full">
      <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-emerald-500" /> Draft Manual Order Contract
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Link Editor Package (Optional)</label>
          <select
            value={packageId}
            onChange={(e) => handlePackageChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          >
            <option value="">-- Custom Order (No Package) --</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.title} (₹{(pkg.price / 100).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Contract Base Price (INR)</label>
          <input
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            required
            placeholder="e.g. 5000"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Delivery Time Limit (Days)</label>
          <input
            type="number"
            value={deadlineDays}
            onChange={(e) => setDeadlineDays(e.target.value)}
            required
            placeholder="e.g. 3"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Project Brief / Contract Notes</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="Enter instruction details..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer"
        >
          {submitting ? "Placing Order…" : "Create Order"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-650 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
