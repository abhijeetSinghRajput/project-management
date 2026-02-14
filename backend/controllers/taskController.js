import mongoose from 'mongoose';
import Task from '../models/Task.js';

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20, sort = '-createdAt', search } = req.query;

    const query = { isDeleted: false };
    const andConditions = [];

    if (req.user.role === 'user') {
      andConditions.push({
        $or: [
          { createdBy: req.user.id },
          { assignedTo: req.user.id },
        ],
      });
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (andConditions.length) {
      query.$and = andConditions;
    }

    // Execute query with pagination
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!task || task.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check access
    if (
      req.user.role === 'user' &&
      task.createdBy._id.toString() !== req.user.id &&
      task.assignedTo?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res) => {
  try {
    if (req.user.role === 'user' && req.body.assignedTo && req.body.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Users can only assign tasks to themselves',
      });
    }

    const task = await Task.create({
      ...req.body,
      createdBy: req.user.id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Emit socket event
    req.app.get('io')?.emit('task:created', populatedTask);

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update task
// @route   PATCH /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task || task.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check access
    if (
      req.user.role === 'user' &&
      task.createdBy.toString() !== req.user.id &&
      task.assignedTo?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task',
      });
    }

    if (req.user.role === 'user' && req.body.assignedTo && req.body.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Users can only assign tasks to themselves',
      });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Emit socket event
    req.app.get('io')?.emit('task:updated', task);

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete task (soft delete)
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task || task.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check access (only creator or admin/manager can delete)
    if (req.user.role === 'user' && task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task',
      });
    }

    task.isDeleted = true;
    task.deletedAt = new Date();
    await task.save();

    // Emit socket event
    req.app.get('io')?.emit('task:deleted', { id: task._id });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get task stats
// @route   GET /api/tasks/stats
// @access  Private
export const getTaskStats = async (req, res) => {
  try {
    const query = { isDeleted: false };

    if (req.user.role === 'user') {
      const userId = new mongoose.Types.ObjectId(req.user.id);
      query.$or = [
        { createdBy: userId },
        { assignedTo: userId },
      ];
    }

    const stats = await Task.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      todo: 0,
      'in-progress': 0,
      done: 0,
    };

    stats.forEach((stat) => {
      result[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};