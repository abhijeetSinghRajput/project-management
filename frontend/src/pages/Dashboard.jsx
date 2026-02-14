import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Board from '../components/kanban/Board';
import api from '../lib/api';
import { socket } from '../lib/socket';
import { LogOut, Plus, Users, Sparkles } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const {
    tasks,
    stats,
    isLoading,
    fetchTasks,
    fetchStats,
    createTask,
    updateTask,
    deleteTask,
    optimisticUpdate,
    upsertTask,
    removeTaskById,
  } = useTaskStore();

  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
  });

  const canManageUsers = user?.role === 'admin' || user?.role === 'manager';
  const canAssignTasks = user?.role === 'admin' || user?.role === 'manager';

  const statsCards = useMemo(
    () => [
      { label: 'To Do', value: stats.todo, tone: 'from-amber-500/20 to-amber-100/40' },
      { label: 'In Progress', value: stats['in-progress'], tone: 'from-sky-500/20 to-sky-100/40' },
      { label: 'Done', value: stats.done, tone: 'from-emerald-500/20 to-emerald-100/40' },
    ],
    [stats]
  );

  useEffect(() => {
    fetchTasks(filters);
  }, [fetchTasks, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, tasks]);

  useEffect(() => {
    if (!canManageUsers) return;
    const loadUsers = async () => {
      const { data } = await api.get('/auth/users');
      setUsers(data.data || []);
    };
    loadUsers();
  }, [canManageUsers]);

  useEffect(() => {
    socket.connect();

    socket.on('task:created', (task) => upsertTask(task));
    socket.on('task:updated', (task) => upsertTask(task));
    socket.on('task:deleted', (payload) => removeTaskById(payload.id));

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.disconnect();
    };
  }, [removeTaskById, upsertTask]);

  const resetForm = () => {
    setFormErrors({});
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignedTo: '',
      dueDate: '',
    });
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setFormErrors({});
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      assignedTo: task.assignedTo?._id || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
    };

    if (canAssignTasks && formData.assignedTo) {
      payload.assignedTo = formData.assignedTo;
    }

    if (editingTask) {
      await updateTask(editingTask._id, payload);
    } else {
      await createTask(payload);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!editingTask) return;
    await deleteTask(editingTask._id);
    setDialogOpen(false);
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return;
    const activeTask = tasks.find((task) => task._id === active.id);
    if (!activeTask) return;

    const newStatus =
      over.data?.current?.status ||
      tasks.find((task) => task._id === over.id)?.status ||
      over.id;

    if (newStatus === activeTask.status) return;

    optimisticUpdate(activeTask._id, { status: newStatus });
    try {
      await updateTask(activeTask._id, { status: newStatus });
      await fetchStats();
    } catch (error) {
      optimisticUpdate(activeTask._id, { status: activeTask.status });
      await fetchStats();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRoleChange = async (id, role) => {
    const { data } = await api.patch(`/auth/users/${id}`, { role });
    setUsers((prev) => prev.map((member) => (member._id === id ? data.data : member)));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_12%_0%,rgba(14,165,233,0.14),transparent_45%),radial-gradient(800px_circle_at_88%_10%,rgba(16,185,129,0.12),transparent_45%)]">
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">TaskFlow</p>
              <h1 className="font-display text-lg">Mission Control</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle/>
            <div className="hidden items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground sm:flex">
              <span className="text-foreground">{user?.name}</span>
              <Badge variant="secondary" className="capitalize">
                {user?.role}
              </Badge>
            </div>
            <Button onClick={openCreateDialog} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New task
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardTitle className="text-xl">Focus for today</CardTitle>
              <CardDescription>
                Track progress across the board and keep your momentum visible.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {statsCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-2xl border border-border/50 bg-gradient-to-br ${card.tone} p-4 shadow-sm`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-4 text-3xl font-semibold text-foreground">
                    {card.value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardTitle className="text-xl">Filters</CardTitle>
              <CardDescription>Dial in the view you need.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search tasks"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    <option value="">All</option>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={filters.priority}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, priority: event.target.value }))
                    }
                  >
                    <option value="">All</option>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setFilters({ status: '', priority: '', search: '' })}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Team Board</h2>
              <p className="text-sm text-muted-foreground">Drag tasks to shift status.</p>
            </div>
            {isLoading && <span className="text-xs text-muted-foreground">Syncing...</span>}
          </div>
          <Board tasks={tasks} onDragEnd={handleDragEnd} onTaskClick={openEditDialog} />
        </section>

        {canManageUsers && (
          <section>
            <Card className="border-border/60 bg-background/70">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Team Roles
                  </CardTitle>
                  <CardDescription>Adjust access levels without leaving the board.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {users.map((member) => (
                  <div
                    key={member._id}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs ${member.isActive ? 'text-emerald-600' : 'text-rose-500'}`}
                      >
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                        value={member.role}
                        onChange={(event) => handleRoleChange(member._id, event.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        {user?.role === 'admin' && <option value="admin">Admin</option>}
                      </select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit task' : 'Create task'}</DialogTitle>
            <DialogDescription>
              Define the essentials and keep the team in sync.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Define the task"
              />
              {formErrors.title && (
                <p className="text-xs text-rose-500">{formErrors.title}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Add context"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.status}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.priority}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, priority: event.target.value }))
                  }
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {canAssignTasks && (
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formData.assignedTo}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, assignedTo: event.target.value }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {users.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              {editingTask ? (
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">{editingTask ? 'Save changes' : 'Create task'}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}