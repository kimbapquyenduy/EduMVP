import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, Users, BookOpen } from 'lucide-react'
import { Class } from '@/lib/types/database.types'

interface AboutTabProps {
  classData: Class
}

export function AboutTab({ classData }: AboutTabProps) {
  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">
              {classData.description || 'No description provided'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-semibold">
                  {classData.price > 0 ? `$${classData.price}/month` : 'Free'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-semibold">
                  {new Date(classData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={classData.is_published ? 'default' : 'secondary'}>
                  {classData.is_published ? 'Published' : 'Unpublished'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Thumbnail Preview */}
          {classData.thumbnail_url && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Thumbnail</h3>
              <img
                src={classData.thumbnail_url}
                alt={classData.name}
                className="rounded-lg max-w-md w-full h-48 object-cover"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
