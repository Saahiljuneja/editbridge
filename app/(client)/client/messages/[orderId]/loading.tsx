export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto px-4 animate-pulse">
      {/* Back bar */}
      <div className="py-3 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gray-100" />
        <div className="h-3.5 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Chat header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shrink-0 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-32 bg-gray-200 rounded-lg" />
          <div className="h-3 w-48 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 space-y-4 overflow-hidden">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-9 w-48 bg-gray-100 rounded-2xl rounded-tl-sm" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5 items-end flex flex-col">
            <div className="h-9 w-64 bg-gray-200 rounded-2xl rounded-tr-sm" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-14 w-56 bg-gray-100 rounded-2xl rounded-tl-sm" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5 items-end flex flex-col">
            <div className="h-9 w-40 bg-gray-200 rounded-2xl rounded-tr-sm" />
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="py-3 shrink-0">
        <div className="h-12 bg-white border border-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}
