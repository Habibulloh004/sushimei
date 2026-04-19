export default function HomeLoading() {
  return (
    <div className="space-y-16 animate-pulse">
      {/* Hero skeleton */}
      <div className="-mt-20 md:-mt-24 h-screen bg-stone-200 dark:bg-stone-900" />

      {/* Featured products skeleton */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="h-8 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg mb-12" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-[2rem] bg-stone-200 dark:bg-stone-800" />
          ))}
        </div>
      </div>

      {/* Promo skeleton */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="h-64 rounded-[3rem] bg-stone-200 dark:bg-stone-800" />
      </div>
    </div>
  );
}
