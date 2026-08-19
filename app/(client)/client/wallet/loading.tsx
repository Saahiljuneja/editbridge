export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Balance card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
          <div className="h-3.5 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-40 bg-gray-200 rounded-xl" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 flex-1 bg-gray-200 rounded-xl" />
            <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
          </div>
        </div>

        {/* Transaction list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-4 w-32 bg-gray-200 rounded-lg" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
