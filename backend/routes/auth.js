import express from 'express';
import {
	register,
	login,
	getMe,
	updateUserRole,
	getUsers,
	getUser,
	updateUser,
	deleteUser,
	refresh,
	logout,
} from '../controllers/authController.js';
import { protect, authorize } from '../services/authService.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Admin/Manager routes for user management
router.get('/users', protect, authorize('admin', 'manager'), getUsers);
router.get('/users/:id', protect, authorize('admin', 'manager'), getUser);
router.patch('/users/:id', protect, authorize('admin', 'manager'), updateUser);
router.patch('/users/:id/role', protect, authorize('admin', 'manager'), updateUserRole);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

export default router;