import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

// Controllers
import { getStats, getRecentActivity, getUserProgressOverview } from '../controllers/adminController.js';
import {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  createChapter,
  updateChapter,
  deleteChapter,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../controllers/adminModuleController.js';
import {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
} from '../controllers/adminUserController.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard stats
router.get('/stats', getStats);
router.get('/activity', getRecentActivity);
router.get('/user-progress', getUserProgressOverview);

// Module management
router.get('/modules', getModules);
router.get('/modules/:id', getModuleById);
router.post('/modules', createModule);
router.put('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);

// Chapter management
router.post('/modules/:moduleId/chapters', createChapter);
router.put('/chapters/:id', updateChapter);
router.delete('/chapters/:id', deleteChapter);

// Lesson management
router.post('/chapters/:chapterId/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

export default router;
