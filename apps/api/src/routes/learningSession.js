import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { 
  startSession, 
  heartbeat, 
  endSession, 
  getLearningStats 
} from '../controllers/learningSessionController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Start session
router.post('/start', startSession);

// Heartbeat
router.post('/heartbeat', heartbeat);

// End session
router.post('/end', endSession);

// Get learning stats
router.get('/stats', getLearningStats);

export default router;
