import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get notifications
router.get('/', getNotifications);

// Mark notification as read
router.put('/:notificationId/read', markAsRead);

// Mark all as read
router.put('/read-all', markAllAsRead);

export default router;
