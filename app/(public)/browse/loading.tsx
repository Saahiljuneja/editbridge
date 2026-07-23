import { Skeleton } from "@/components/ui/skeleton";

function EditorCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex justify-between items-center pt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export default function BrowseLoading() {
  return (
    <div className="px-8 py-6">
      <div className="mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="h-10 w-full mb-6 rounded-md" />
      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <Skeleton className="h-96 w-full rounded-xl" />
        </aside>
        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <EditorCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}