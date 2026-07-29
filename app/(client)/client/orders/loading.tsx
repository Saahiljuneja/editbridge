export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 animate-pulse">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-28 bg-gray-100 rounded-lg" />
            <div className="h-4 w-48 bg-gray-100 rounded-lg" />
          </div>
          <div className="h-9 w-32 bg-gray-100 rounded-xl" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-gray-100 px-5 py-4 space-y-2">
              <div className="h-7 w-12 bg-gray-100 rounded-lg" />
              <div className="h-3 w-20 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 rounded-full shrink-0" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-[3px] h-11 bg-gray-100 rounded-full shrink-0" />
              <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 bg-gray-100 rounded-lg" />
                <div className="h-3 w-1/2 bg-gray-100 rounded-lg" />
              </div>
              <div className="h-5 w-16 bg-gray-100 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
