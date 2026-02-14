import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Column from './Column';
import TaskCard from './TaskCard';

const columns = [
  { id: 'todo', title: 'To Do', tone: 'bg-amber-500' },
  { id: 'in-progress', title: 'In Progress', tone: 'bg-sky-500' },
  { id: 'done', title: 'Done', tone: 'bg-emerald-500' },
];

export default function Board({ tasks, onDragEnd, onTaskClick }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = tasks.filter((task) => task.status === column.id);
    return acc;
  }, {});

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => (
          <SortableContext
            key={column.id}
            items={tasksByStatus[column.id].map((task) => task._id)}
            strategy={verticalListSortingStrategy}
          >
            <Column
              id={column.id}
              title={column.title}
              count={tasksByStatus[column.id].length}
              tone={column.tone}
            >
              {tasksByStatus[column.id].map((task) => (
                <TaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} />
              ))}
            </Column>
          </SortableContext>
        ))}
      </div>
    </DndContext>
  );
}
