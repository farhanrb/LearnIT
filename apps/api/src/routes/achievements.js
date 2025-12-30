import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { 
  getAchievements, 
  setSelectedBadge 
} from '../controllers/achievementController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get achievements
router.get('/', getAchievements);

// Set selected badge
router.put('/badge', setSelectedBadge);

export default router;
