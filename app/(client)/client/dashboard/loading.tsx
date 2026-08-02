import { ShoppingBag, Star, Heart, Clock, CheckCircle2, MessageSquare, IndianRupee } from "lucide-react";

export default function ClientDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded-lg" />
            <div className="h-4 w-64 bg-gray-100 rounded-lg" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* KPI Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { border: "border-t-2 border-emerald-200", icon: IndianRupee },
            { border: "border-t-2 border-sky-200", icon: Clock },
            { border: "border-t-2 border-teal-200", icon: CheckCircle2 },
            { border: "border-t-2 border-amber-250", icon: MessageSquare },
          ].map((card, i) => (
            <div key={i} className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm ${card.border}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-3 w-24 bg-gray-250 rounded" />
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <card.icon className="w-4 h-4 text-gray-300" />
                </div>
              </div>
              <div className="h-7 w-20 bg-gray-200 rounded-lg mb-2" />
              <div className="h-3.5 w-28 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left Column Skeletons */}
          <div className="lg:col-span-2 space-y-5">
            {/* Active Orders Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gray-300" />
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>
                <div className="h-4 w-12 bg-gray-100 rounded" />
              </div>
              <div className="divide-y divide-gray-50 px-5 py-2">
                {[1, 2].map((x) => (
                  <div key={x} className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-2/3 bg-gray-200 rounded" />
                      <div className="h-3.5 w-1/2 bg-gray-100 rounded" />
                    </div>
                    <div className="h-8 w-24 bg-gray-150 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Rewards Progress Card Mock */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-4/5 bg-gray-150 rounded" />
                <div className="h-2 w-full bg-gray-100 rounded-full" />
              </div>
              <div className="w-16 h-16 rounded-full bg-gray-150 shrink-0" />
            </div>
          </div>

          {/* Right Column Skeletons */}
          <div className="space-y-5">
            {/* Saved Editors Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gray-300" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((x) => (
                  <div key={x} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-150 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3.5 w-32 bg-gray-250 rounded" />
                      <div className="h-3 w-20 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reviews Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-gray-300" />
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="p-4 space-y-4">
                {[1, 2].map((x) => (
                  <div key={x} className="space-y-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="w-3.5 h-3.5 bg-gray-150 rounded-full" />
                      ))}
                    </div>
                    <div className="h-3.5 w-full bg-gray-150 rounded" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
