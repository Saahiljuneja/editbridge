export default function EditorProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Cover Banner Skeleton */}
      <div className="h-56 sm:h-64 bg-gray-200 animate-pulse border-b border-gray-200" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Avatar Profile Info Skeleton */}
        <div className="flex items-end gap-4 -mt-12 sm:-mt-14 mb-8">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-200 animate-pulse ring-4 ring-white shrink-0" />
          <div className="pb-1 space-y-2.5 flex-1 min-w-0">
            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-gray-150 rounded-lg animate-pulse" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 pb-20">
          {/* Left Column Content Skeletons */}
          <div className="space-y-8 min-w-0">
            {/* Showreel/Video Box Skeleton */}
            <div className="bg-white rounded-2xl border border-gray-150/70 p-6 shadow-sm space-y-3">
              <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
              <div className="rounded-xl aspect-video bg-gray-150 animate-pulse" />
            </div>

            {/* About Box Skeleton */}
            <div className="bg-white rounded-2xl border border-gray-150/70 p-6 shadow-sm space-y-3">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-full bg-gray-150 rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-gray-150 rounded animate-pulse" />
              <div className="h-3 w-4/6 bg-gray-150 rounded animate-pulse" />
            </div>

            {/* Portfolio Grid Skeletons */}
            <div className="bg-white rounded-2xl border border-gray-150/70 p-6 shadow-sm space-y-4">
              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-video rounded-xl bg-gray-150 animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Skeletons */}
          <div className="space-y-5">
            {/* Stats Card Skeleton */}
            <div className="bg-white border border-gray-150/70 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="h-3 w-16 bg-gray-250 rounded animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-3 w-28 bg-gray-150 rounded animate-pulse" />
                    <div className="h-3.5 w-10 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Details Card Skeleton */}
            <div className="bg-white border border-gray-150/70 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="h-3 w-16 bg-gray-250 rounded animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="h-4 w-4 bg-gray-150 rounded animate-pulse shrink-0" />
                    <div className="h-3.5 w-36 bg-gray-150 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Box Skeleton */}
            <div className="border border-indigo-100 bg-indigo-50/50 rounded-2xl p-5 text-center space-y-4">
              <div className="h-4 w-32 bg-indigo-100 rounded mx-auto animate-pulse" />
              <div className="h-10 w-full bg-indigo-200 rounded-xl animate-pulse" />
              <div className="h-3 w-8 bg-indigo-100 rounded mx-auto animate-pulse" />
              <div className="h-10 w-full bg-white border border-indigo-150 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
