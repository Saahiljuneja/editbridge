export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="h-6 w-24 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-3.5 w-48 bg-gray-100 rounded-lg mt-2 animate-pulse" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 border-t-2 border-t-gray-100 animate-pulse">
              <div className="h-3 w-16 bg-gray-100 rounded mb-3" />
              <div className="h-7 w-10 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
