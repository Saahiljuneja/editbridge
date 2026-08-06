export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded-lg" />
            <div className="h-3 w-24 bg-gray-100 rounded-lg" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-gray-100" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-32 bg-gray-200 rounded-lg" />
                <div className="h-3 w-48 bg-gray-100 rounded-lg" />
              </div>
              <div className="h-3 w-16 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="h-5 w-40 bg-gray-200 rounded-lg mb-2" />
        <div className="h-3 w-24 bg-gray-100 rounded-lg" />
      </div>
      <div className="px-6 py-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm aspect-video" />
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="h-5 w-40 bg-gray-200 rounded-lg mb-2" />
        <div className="h-3 w-24 bg-gray-100 rounded-lg" />
      </div>
      <div className="px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-7 w-16 bg-gray-200 rounded-lg" />
              <div className="h-2 w-12 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 h-48" />
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 h-32" />
      </div>
    </div>
  );
}
