export default function MenuLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 pt-12 pb-32 animate-pulse">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar skeleton */}
        <aside className="w-full lg:w-72 space-y-4 hidden lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-stone-200 dark:bg-stone-800" />
          ))}
        </aside>

        {/* Mobile categories */}
        <div className="lg:hidden flex gap-3 pb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-2xl bg-stone-200 dark:bg-stone-800 flex-none" />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="flex-1">
          <div className="h-12 w-64 bg-stone-200 dark:bg-stone-800 rounded-lg mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-[2.5rem] bg-stone-200 dark:bg-stone-800 h-96" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
