export default function AccountHealthLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="h-5 w-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-3 w-56 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-28 h-28 rounded-full bg-gray-100" />
          <div className="h-5 w-24 bg-gray-100 rounded-lg" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
            <div className="h-4 w-36 bg-gray-100 rounded-lg" />
            <div className="h-2.5 w-full bg-gray-100 rounded-full" />
            <div className="h-3 w-20 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
