export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Back bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100" />
          <div className="h-4 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-[1fr_340px] gap-5 items-start">

          {/* Quote details */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="h-5 w-36 bg-gray-200 rounded-lg" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 bg-gray-200 rounded-lg" />
                  <div className="h-3 w-48 bg-gray-100 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-5/6 bg-gray-100 rounded" />
                <div className="h-3 w-3/4 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="h-4 w-28 bg-gray-200 rounded-lg" />
              <div className="flex justify-between">
                <div className="h-3.5 w-24 bg-gray-100 rounded" />
                <div className="h-3.5 w-20 bg-gray-200 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3.5 w-28 bg-gray-100 rounded" />
                <div className="h-3.5 w-16 bg-gray-100 rounded" />
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <div className="h-5 w-16 bg-gray-200 rounded-lg" />
                <div className="h-5 w-24 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Payment panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="h-5 w-28 bg-gray-200 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-11 bg-gray-200 rounded-xl" />
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-100" />
              <div className="h-3 w-40 bg-gray-100 rounded" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
