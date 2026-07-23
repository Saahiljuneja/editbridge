export default function EditorProfileLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-44 sm:h-52 bg-gray-200 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-end gap-4 -mt-12 mb-8">
          <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse ring-4 ring-white" />
          <div className="pb-1 space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-3.5 w-64 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-8 pb-16">
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-4/6 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
