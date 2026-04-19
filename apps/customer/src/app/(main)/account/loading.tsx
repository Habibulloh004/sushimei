export default function AccountLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="h-4 w-36 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mt-4 h-10 w-64 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-[1.75rem] bg-stone-100 dark:bg-stone-950" />
          ))}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
          <div className="h-4 w-32 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="mt-4 h-8 w-48 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="mt-6 h-36 rounded-[1.75rem] bg-stone-100 dark:bg-stone-950" />
        </div>
        <div className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
          <div className="h-4 w-32 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="mt-4 h-8 w-48 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="mt-6 h-36 rounded-[1.75rem] bg-stone-100 dark:bg-stone-950" />
        </div>
      </div>

      <div className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="h-4 w-32 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mt-4 h-8 w-52 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 rounded-[1.75rem] bg-stone-100 dark:bg-stone-950" />
          ))}
        </div>
      </div>
    </div>
  );
}
