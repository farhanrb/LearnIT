import express from 'express';
import { 
  getAllModules, 
  getModuleById, 
  createModule, 
  updateModule, 
  deleteModule 
} from '../controllers/moduleController.js';
import { 
  getModulePrerequisites, 
  getModuleRoadmap 
} from '../controllers/learningPathController.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = express.Router();

// Public routes
router.get('/', getAllModules);
router.get('/:id', getModuleById);

// Module prerequisites and roadmap
router.get('/:id/prerequisites', getModulePrerequisites);
router.get('/:id/roadmap', getModuleRoadmap);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, createModule);
router.put('/:id', authMiddleware, adminMiddleware, updateModule);
router.delete('/:id', authMiddleware, adminMiddleware, deleteModule);

export default router;
