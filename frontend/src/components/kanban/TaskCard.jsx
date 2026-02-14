import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const priorityStyles = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { status: task.status, type: 'task' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab border bg-card/80 shadow-sm backdrop-blur transition hover:shadow-md',
        isDragging && 'opacity-70'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
          {task.description && (
            <p className="max-h-10 overflow-hidden text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className={cn('border text-[11px] uppercase tracking-wide', priorityStyles[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.assignedTo?.name && (
            <span className="text-[11px] text-muted-foreground">
              {task.assignedTo.name}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
