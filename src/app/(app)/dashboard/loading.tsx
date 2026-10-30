import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="animate-in fade-in-0 duration-200" aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-52 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
        <div className="rounded-2xl border bg-card p-5 sm:col-span-2 xl:col-span-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-9 w-40" />
          <Skeleton className="mt-4 h-[180px] w-full rounded-xl" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border bg-card p-5 xl:col-span-2"
          >
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="mt-3 h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={`wide-${index}`}
            className="rounded-2xl border bg-card p-5 sm:col-span-2 xl:col-span-4"
          >
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }, (_, row) => (
                <Skeleton key={row} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
