export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-4">
      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-5 animate-pulse">
        <div className="h-5 w-36 bg-neutral-100 rounded-lg mb-2" />
        <div className="h-3 w-52 bg-neutral-100 rounded-lg" />
      </div>
      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden divide-y divide-neutral-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3.5 px-5 py-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-neutral-100 rounded-lg w-3/4" />
              <div className="h-3 bg-neutral-100 rounded-lg w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
