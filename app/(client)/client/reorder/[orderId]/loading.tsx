export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Back bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100" />
          <div className="h-4 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 w-40 bg-gray-200 rounded-lg" />
          <div className="h-3.5 w-64 bg-gray-100 rounded-lg" />
        </div>

        {/* Editor card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-gray-200 rounded-lg" />
            <div className="h-3 w-48 bg-gray-100 rounded-lg" />
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <div className="space-y-2">
            <div className="h-3.5 w-20 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-100 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-11 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
