export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 bg-gray-800 rounded" />
        <div className="h-4 w-4 bg-gray-800 rounded" />
      </div>
      <div className="h-7 w-24 bg-gray-800 rounded mb-1" />
      <div className="h-3 w-16 bg-gray-800 rounded" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="card animate-pulse flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-5 w-40 bg-gray-800 rounded" />
          <div className="h-5 w-16 bg-gray-800 rounded-full" />
        </div>
        <div className="h-3 w-64 bg-gray-800 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-gray-800 rounded" />
        <div className="h-8 w-16 bg-gray-800 rounded" />
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-36 bg-gray-800 rounded" />
        <div className="h-3 w-20 bg-gray-800 rounded" />
      </div>
      <div className="h-64 bg-gray-800/50 rounded-lg" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-5 w-32 bg-gray-800 rounded mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-1/4 bg-gray-800 rounded" />
          <div className="h-4 w-1/6 bg-gray-800 rounded" />
          <div className="h-4 w-1/6 bg-gray-800 rounded" />
          <div className="h-4 w-1/6 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}
