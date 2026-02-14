import User from '../models/User.js';
import {
  createRefreshToken,
  generateAccessToken,
  hashRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} from '../services/authService.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create user (role defaults to 'user')
    const user = await User.create({
      name,
      email,
      password,
      // role is NOT accepted here - defaults to 'user'
      // Only admin/manager can update roles later
    });

    const { token: refreshToken, tokenHash, expiresAt } = createRefreshToken();
    user.refreshTokenHash = tokenHash;
    user.refreshTokenExpiresAt = expiresAt;
    await user.save();

    const token = generateAccessToken(user._id);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user (include password)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive || user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const { token: refreshToken, tokenHash, expiresAt } = createRefreshToken();
    user.refreshTokenHash = tokenHash;
    user.refreshTokenExpiresAt = expiresAt;
    await user.save();

    const token = generateAccessToken(user._id);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user role
// @route   PATCH /api/auth/users/:id/role
// @access  Private (Admin/Manager only)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Validate role
    if (!['admin', 'manager', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    // Find user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.user.role === 'manager' && role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Managers cannot assign admin role',
      });
    }

    // Update role
    user.role = role;
    await user.save();

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Admin/Manager only)
export const getUsers = async (req, res) => {
  try {
    const {
      role,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    const query = { isDeleted: false };
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await User.countDocuments(query);
    res.json({
      success: true,
      data: users,
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

// @desc    Get user by id
// @route   GET /api/auth/users/:id
// @access  Private (Admin/Manager only)
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user
// @route   PATCH /api/auth/users/:id
// @access  Private (Admin/Manager only)
export const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (role && !['admin', 'manager', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    if (req.user.role === 'manager' && role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Managers cannot assign admin role',
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing',
      });
    }

    const tokenHash = hashRefreshToken(token);
    const user = await User.findOne({
      refreshTokenHash: tokenHash,
      refreshTokenExpiresAt: { $gt: new Date() },
      isDeleted: false,
      isActive: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    const { token: newRefresh, tokenHash: newHash, expiresAt } = createRefreshToken();
    user.refreshTokenHash = newHash;
    user.refreshTokenExpiresAt = expiresAt;
    await user.save();

    const accessToken = generateAccessToken(user._id);
    setRefreshCookie(res, newRefresh);

    res.json({
      success: true,
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokenHash = null;
      user.refreshTokenExpiresAt = null;
      await user.save();
    }

    clearRefreshCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};