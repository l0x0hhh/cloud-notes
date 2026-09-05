import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse-soft rounded-2xl bg-white/5',
        className
      )}
      {...props}
    />
  )
}

export function NoteCardSkeleton() {
  return (
    <div className="rounded-[20px] bg-card-glass/30 p-4 space-y-3 border border-border/60 backdrop-blur-sm">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function NoteEditorSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[300px] w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-20 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>
    </div>
  )
}
