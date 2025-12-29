import { Skeleton } from '@/components/ui/skeleton'

export default function StudentCourseLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 border-b bg-background">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Back button area */}
      <div className="border-b bg-background px-4 py-3">
        <div className="container mx-auto">
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      {/* Course content area */}
      <div className="flex-1 flex">
        {/* Sidebar - lessons list */}
        <div className="w-80 border-r bg-muted/30 p-4 hidden lg:block">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Main content - video area */}
        <div className="flex-1 p-6">
          <Skeleton className="aspect-video w-full max-w-4xl rounded-lg mb-6" />
          <Skeleton className="h-8 w-3/4 mb-3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3 mt-2" />
        </div>
      </div>
    </div>
  )
}
