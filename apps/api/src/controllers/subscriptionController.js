import prisma from '../config/database.js';

/**
 * Get all subscription tiers
 * GET /api/subscriptions/tiers
 */
export const getSubscriptionTiers = async (req, res) => {
  try {
    const tiers = await prisma.subscriptionTier.findMany({
      orderBy: { price: 'asc' },
    });

    res.json({
      tiers,
    });
  } catch (error) {
    console.error('Get subscription tiers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch subscription tiers',
    });
  }
};

/**
 * Get current user subscription
 * GET /api/subscriptions/current
 */
export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    let subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: {
        tier: true,
      },
    });

    // Auto-assign Basic tier if no subscription exists
    if (!subscription) {
      console.log(`User ${userId} has no subscription, auto-assigning Basic tier...`);
      
      const basicTier = await prisma.subscriptionTier.findUnique({
        where: { name: 'BASIC' },
      });

      if (basicTier) {
        subscription = await prisma.userSubscription.create({
          data: {
            userId,
            tierId: basicTier.id,
            selectedModules: [],
            status: 'ACTIVE',
          },
          include: {
            tier: true,
          },
        });
        console.log(`✅ Auto-assigned Basic tier to user ${userId}`);
      } else {
        return res.json({ subscription: null });
      }
    }

    res.json({
      subscription,
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch subscription',
    });
  }
};

/** 
 * Subscribe to a tier
 * POST /api/subscriptions/subscribe
 */
export const subscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tierId, selectedModules = [] } = req.body;

    if (!tierId) {
      return res.status(400).json({
        error: 'Tier ID is required',
      });
    }

    // Get tier details
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      return res.status(404).json({
        error: 'Subscription tier not found',
      });
    }

    // Validate module selection for PRO tier
    if (tier.name === 'PRO' && tier.moduleLimit) {
      if (selectedModules.length === 0) {
        return res.status(400).json({
          error: `Please select ${tier.moduleLimit} modules for Pro tier`,
        });
      }

      if (selectedModules.length > tier.moduleLimit) {
        return res.status(400).json({
          error: `Pro tier allows maximum ${tier.moduleLimit} modules`,
        });
      }

      // Validate modules exist
      const validModules = await prisma.module.findMany({
        where: { id: { in: selectedModules } },
      });

      if (validModules.length !== selectedModules.length) {
        return res.status(400).json({
          error: 'Some selected modules are invalid',
        });
      }
    }

    // Create or update subscription
    const subscription = await prisma.userSubscription.upsert({
      where: { userId },
      update: {
        tierId,
        selectedModules: tier.name === 'PRO' ? selectedModules : [],
        status: 'ACTIVE',
        startDate: new Date(),
      },
      create: {
        userId,
        tierId,
        selectedModules: tier.name === 'PRO' ? selectedModules : [],
        status: 'ACTIVE',
      },
      include: {
        tier: true,
      },
    });

    res.json({
      message: 'Subscription created successfully',
      subscription,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create subscription',
    });
  }
};

/**
 * Upgrade/change subscription
 * PUT /api/subscriptions/upgrade
 */
export const upgradeSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tierId, selectedModules = [] } = req.body;

    if (!tierId) {
      return res.status(400).json({
        error: 'Tier ID is required',
      });
    }

    // Get tier details
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      return res.status(404).json({
        error: 'Subscription tier not found',
      });
    }

    // Check if user has current subscription
    const currentSub = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { tier: true },
    });

    if (!currentSub) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    // Validate module selection for PRO tier
    if (tier.name === 'PRO' && tier.moduleLimit) {
      if (selectedModules.length === 0 || selectedModules.length > tier.moduleLimit) {
        return res.status(400).json({
          error: `Pro tier requires exactly ${tier.moduleLimit} modules`,
        });
      }
    }

    // Update subscription
    const updatedSub = await prisma.userSubscription.update({
      where: { userId },
      data: {
        tierId,
        selectedModules: tier.name === 'PRO' ? selectedModules : [],
        startDate: new Date(), // Reset start date on upgrade
      },
      include: {
        tier: true,
      },
    });

    res.json({
      message: `Successfully upgraded to ${tier.displayName}`,
      subscription: updatedSub,
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upgrade subscription',
    });
  }
};

/**
 * Update selected modules (for Pro tier)
 * PUT /api/subscriptions/modules
 */
export const updateSelectedModules = async (req, res) => {
  try {
    const userId = req.user.id;
    const { selectedModules } = req.body;

    if (!selectedModules || !Array.isArray(selectedModules)) {
      return res.status(400).json({
        error: 'Selected modules must be an array',
      });
    }

    // Get current subscription
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { tier: true },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    // Only PRO tier can update modules
    if (subscription.tier.name !== 'PRO') {
      return res.status(403).json({
        error: 'Only Pro tier can update module selection',
      });
    }

    // Validate module count
    if (selectedModules.length > subscription.tier.moduleLimit) {
      return res.status(400).json({
        error: `Maximum ${subscription.tier.moduleLimit} modules allowed`,
      });
    }

    // Update selected modules
    const updatedSub = await prisma.userSubscription.update({
      where: { userId },
      data: { selectedModules },
      include: { tier: true },
    });

    res.json({
      message: 'Module selection updated',
      subscription: updatedSub,
    });
  } catch (error) {
    console.error('Update modules error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update modules',
    });
  }
};
