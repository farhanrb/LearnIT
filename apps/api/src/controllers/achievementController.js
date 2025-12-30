import prisma from '../config/database.js';
import { createNotification } from './notificationController.js';

// Achievement definitions with icons and rarity
const ACHIEVEMENT_DEFINITIONS = {
  FIRST_LESSON: {
    title: 'Langkah Pertama',
    description: 'Menyelesaikan lesson pertama',
    icon: '🎯',
    rarity: 'COMMON',
  },
  CHAPTER_COMPLETE: {
    title: 'Penakluk Bab',
    description: 'Menyelesaikan satu chapter',
    icon: '📚',
    rarity: 'COMMON',
  },
  MODULE_COMPLETE: {
    title: 'Master Modul',
    description: 'Menyelesaikan satu modul',
    icon: '🏆',
    rarity: 'RARE',
  },
  TIME_1H: {
    title: 'Pembelajar Aktif',
    description: 'Belajar selama 1 jam',
    icon: '⏱️',
    rarity: 'COMMON',
  },
  TIME_5H: {
    title: 'Konsisten',
    description: 'Belajar selama 5 jam',
    icon: '⌛',
    rarity: 'RARE',
  },
  TIME_10H: {
    title: 'Dedikasi Tinggi',
    description: 'Belajar selama 10 jam',
    icon: '🔥',
    rarity: 'EPIC',
  },
  TIME_50H: {
    title: 'Master Waktu',
    description: 'Belajar selama 50 jam',
    icon: '💎',
    rarity: 'LEGENDARY',
  },
  PROFILE_COMPLETE: {
    title: 'Profil Lengkap',
    description: 'Melengkapi semua informasi profil',
    icon: '👤',
    rarity: 'COMMON',
  },
  SUBSCRIPTION_PRO: {
    title: 'Pro Learner',
    description: 'Berlangganan paket Pro',
    icon: '⭐',
    rarity: 'RARE',
  },
  SUBSCRIPTION_PREMIUM: {
    title: 'Premium Learner',
    description: 'Berlangganan paket Premium',
    icon: '👑',
    rarity: 'EPIC',
  },
};

// Get user achievements
export const getAchievements = async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { userId: req.user.id },
      orderBy: { earnedAt: 'desc' },
    });

    // Get total learning time
    const sessions = await prisma.learningSession.findMany({
      where: { userId: req.user.id, duration: { not: null } },
      select: { duration: true },
    });
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);

    res.json({ 
      achievements, 
      totalLearningMinutes: totalMinutes,
      availableBadges: ACHIEVEMENT_DEFINITIONS,
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
};

// Award achievement (internal helper)
export const awardAchievement = async (userId, type, metadata = null) => {
  try {
    // Check if already has this achievement (for non-repeatable ones)
    const existing = await prisma.achievement.findFirst({
      where: { userId, type },
    });

    // For chapter/module complete, check metadata to allow multiple
    if (existing && !['CHAPTER_COMPLETE', 'MODULE_COMPLETE'].includes(type)) {
      return null;
    }

    // For chapter/module complete, check if this specific one exists
    if (['CHAPTER_COMPLETE', 'MODULE_COMPLETE'].includes(type) && metadata) {
      const existingSpecific = await prisma.achievement.findFirst({
        where: {
          userId,
          type,
          metadata: { equals: metadata },
        },
      });
      if (existingSpecific) return null;
    }

    const definition = ACHIEVEMENT_DEFINITIONS[type];
    if (!definition) return null;

    const achievement = await prisma.achievement.create({
      data: {
        userId,
        type,
        title: definition.title,
        description: definition.description,
        icon: definition.icon,
        rarity: definition.rarity,
        metadata,
      },
    });

    // Create notification for achievement
    await createNotification(
      userId,
      'ACHIEVEMENT',
      `Achievement Unlocked: ${definition.title}`,
      definition.description,
      definition.icon,
      { achievementId: achievement.id }
    );

    return achievement;
  } catch (error) {
    console.error('Award achievement error:', error);
    return null;
  }
};

// Check and award time-based achievements
export const checkTimeAchievements = async (userId) => {
  try {
    const sessions = await prisma.learningSession.findMany({
      where: { userId, duration: { not: null } },
      select: { duration: true },
    });
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;

    if (totalMinutes >= 60) await awardAchievement(userId, 'TIME_1H');
    if (totalMinutes >= 300) await awardAchievement(userId, 'TIME_5H');
    if (totalMinutes >= 600) await awardAchievement(userId, 'TIME_10H');
    if (totalMinutes >= 3000) await awardAchievement(userId, 'TIME_50H');
  } catch (error) {
    console.error('Check time achievements error:', error);
  }
};

// Set selected badge for user profile
export const setSelectedBadge = async (req, res) => {
  try {
    const { achievementId } = req.body;

    // Verify user owns this achievement
    const achievement = await prisma.achievement.findFirst({
      where: { id: achievementId, userId: req.user.id },
    });

    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    await prisma.profile.update({
      where: { userId: req.user.id },
      data: { selectedBadge: achievementId },
    });

    res.json({ message: 'Badge updated', selectedBadge: achievement });
  } catch (error) {
    console.error('Set badge error:', error);
    res.status(500).json({ error: 'Failed to set badge' });
  }
};
