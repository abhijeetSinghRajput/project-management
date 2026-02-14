import { create } from 'zustand';
import api from '../lib/api';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  stats: { todo: 0, 'in-progress': 0, done: 0 },
  isLoading: false,
  error: null,
  filters: {
    status: '',
    priority: '',
    search: '',
  },
  setTasks: (tasks) => set({ tasks }),

  // Fetch tasks
  fetchTasks: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/tasks', { params });
      set({ tasks: data.data, isLoading: false });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch tasks';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Create task
  createTask: async (taskData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/tasks', taskData);
      set((state) => {
        const exists = state.tasks.some((task) => task._id === data.data._id);
        if (exists) {
          return {
            tasks: state.tasks.map((task) =>
              task._id === data.data._id ? data.data : task
            ),
            isLoading: false,
          };
        }
        return {
          tasks: [data.data, ...state.tasks],
          isLoading: false,
        };
      });
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create task';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Update task
  updateTask: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.patch(`/tasks/${id}`, updates);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task._id === id ? data.data : task
        ),
        isLoading: false,
      }));
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update task';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Delete task
  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((task) => task._id !== id),
        isLoading: false,
      }));
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete task';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Fetch stats
  fetchStats: async () => {
    try {
      const { data } = await api.get('/tasks/stats');
      set({ stats: data.data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters });
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Optimistic update for drag & drop
  optimisticUpdate: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task._id === id ? { ...task, ...updates } : task
      ),
    }));
  },

  upsertTask: (task) => {
    set((state) => {
      const existing = state.tasks.find((item) => item._id === task._id);
      if (existing) {
        return {
          tasks: state.tasks.map((item) => (item._id === task._id ? task : item)),
        };
      }
      return { tasks: [task, ...state.tasks] };
    });
  },

  removeTaskById: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task._id !== id),
    }));
  },
}));