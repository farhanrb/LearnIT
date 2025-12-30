import express from 'express';
import {
  getSubscriptionTiers,
  getCurrentSubscription,
  subscribe,
  upgradeSubscription,
  updateSelectedModules,
} from '../controllers/subscriptionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public - get all tiers
router.get('/tiers', getSubscriptionTiers);

// Protected routes - require authentication
router.use(authMiddleware);

// Get current user subscription
router.get('/current', getCurrentSubscription);

// Subscribe to a tier
router.post('/subscribe', subscribe);

// Upgrade subscription
router.put('/upgrade', upgradeSubscription);

// Update selected modules (Pro tier)
router.put('/modules', updateSelectedModules);

export default router;
