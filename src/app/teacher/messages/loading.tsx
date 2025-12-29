import { Skeleton } from '@/components/ui/skeleton'

export default function MessagesLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header skeleton */}
      <div className="h-16 border-b bg-background">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-32 mb-6" />

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations list */}
          <div className="lg:col-span-1 border rounded-lg bg-background p-4">
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="lg:col-span-2 border rounded-lg bg-background flex flex-col">
            {/* Chat header */}
            <div className="p-4 border-b">
              <Skeleton className="h-6 w-40" />
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-16 w-2/3 rounded-lg" />
                </div>
              ))}
            </div>

            {/* Input area */}
            <div className="p-4 border-t">
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
