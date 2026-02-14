import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export default function Column({ id, title, count, children, tone }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { status: id, type: 'column' },
  });

  return (
    <section className="flex h-full flex-col gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', tone)} />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </h2>
        </div>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[260px] flex-1 flex-col gap-3 rounded-2xl border border-dashed bg-gradient-to-b from-transparent via-background/80 to-background/50 p-3 transition',
          isOver && 'border-primary/40 bg-primary/5'
        )}
      >
        {children}
      </div>
    </section>
  );
}
