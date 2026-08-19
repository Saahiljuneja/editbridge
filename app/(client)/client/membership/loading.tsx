export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <div className="h-7 w-48 bg-gray-200 rounded-xl mx-auto" />
          <div className="h-4 w-72 bg-gray-100 rounded mx-auto" />
        </div>

        {/* Toggle */}
        <div className="flex justify-center">
          <div className="h-10 w-48 bg-white border border-gray-200 rounded-full" />
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="space-y-1.5">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-8 w-24 bg-gray-200 rounded-lg" />
                <div className="h-3 w-36 bg-gray-100 rounded" />
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-100 shrink-0" />
                    <div className="h-3 bg-gray-100 rounded flex-1" style={{ width: `${60 + j * 8}%` }} />
                  </div>
                ))}
              </div>
              <div className="h-11 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
