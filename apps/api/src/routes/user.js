import express from 'express';
import { updateProfile, changePassword, uploadAvatar } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// Update profile
router.put('/profile', updateProfile);

// Change password
router.put('/password', changePassword);

// Upload avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

export default router;
