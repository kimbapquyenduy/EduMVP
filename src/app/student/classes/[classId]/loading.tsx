import { Skeleton } from '@/components/ui/skeleton'

export default function StudentClassLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header skeleton */}
      <div className="h-16 border-b bg-background">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Class header */}
      <div className="border-b bg-background">
        <div className="container mx-auto p-6">
          <Skeleton className="h-10 w-40 mb-4" />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-5 w-96 mb-3" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and content */}
      <div className="container mx-auto p-6">
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>

        {/* Content placeholder */}
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
