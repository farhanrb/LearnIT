import express from 'express';
import {
  enrollInModule,
  completLesson,
  getUserProgress,
  getModuleProgress,
  getLessonById,
} from '../controllers/progressController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All progress routes require authentication
router.post('/enroll', authMiddleware, enrollInModule);
router.post('/complete-lesson', authMiddleware, completLesson);
router.get('/user', authMiddleware, getUserProgress);
router.get('/module/:moduleId', authMiddleware, getModuleProgress);
router.get('/lesson/:lessonId', authMiddleware, getLessonById);

export default router;
