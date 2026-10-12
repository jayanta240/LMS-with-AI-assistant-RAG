"use client";

type SkeletonVariant = "dashboard" | "cards" | "table";

export default function PageLoadingSkeleton({
  title = "Loading your workspace",
  variant = "table",
  rows = 5,
}: {
  title?: string;
  variant?: SkeletonVariant;
  rows?: number;
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={title}
      className="space-y-5"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-white via-white to-amber-50/80 px-5 py-4 shadow-sm">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <span className="absolute h-7 w-7 animate-ping rounded-full bg-amber-200/70" />
          <span className="relative h-3 w-3 animate-pulse rounded-full bg-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs text-slate-500">Fetching the latest information…</p>
        </div>
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-600" />
        </div>
      </div>

      {variant === "dashboard" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-7 w-16 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-2.5 w-28 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-amber-50" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </>
      ) : variant === "cards" ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-32 animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="mt-4 h-9 w-28 animate-pulse rounded-xl bg-amber-50" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-100 p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
          </div>
          <div className="space-y-0 px-5">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="hidden h-8 w-24 animate-pulse rounded-lg bg-slate-100 sm:block" />
              </div>
            ))}
          </div>
        </div>
      )}
      <span className="sr-only">{title}</span>
    </section>
  );
}
