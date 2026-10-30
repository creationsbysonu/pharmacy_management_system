import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown immediately while a page's data loads. Next renders this on navigation
 * before the server component resolves, which is what removes the "frozen"
 * feeling between clicks.
 */
export default function AppLoading() {
  return (
    <div className="animate-in fade-in-0 duration-200" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-56 rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-7 w-32" />
            <Skeleton className="mt-3 h-3 w-40" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 xl:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-52 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mx-auto mt-6 size-40 rounded-full" />
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-card p-4">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
