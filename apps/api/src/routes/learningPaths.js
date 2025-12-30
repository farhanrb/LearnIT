import express from 'express';
import {
  getLearningPaths,
  getLearningPathById,
  getModulePrerequisites,
  getModuleRoadmap,
} from '../controllers/learningPathController.js';

const router = express.Router();

// Get all learning paths
router.get('/', getLearningPaths);

// Get specific learning path
router.get('/:id', getLearningPathById);

export default router;
