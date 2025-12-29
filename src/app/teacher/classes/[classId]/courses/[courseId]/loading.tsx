import { Skeleton } from '@/components/ui/skeleton'

export default function TeacherCourseLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 border-b bg-background">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Course header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="h-9 w-40 mb-3" />

          {/* Tabs */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-44" />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar - lessons list */}
          <div className="lg:col-span-1">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </div>

          {/* Main content - video/lesson area */}
          <div className="lg:col-span-2">
            <Skeleton className="aspect-video w-full rounded-lg mb-4" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3 mt-1" />
          </div>
        </div>
      </div>
    </div>
  )
}
