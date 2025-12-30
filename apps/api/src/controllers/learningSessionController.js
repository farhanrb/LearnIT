import prisma from '../config/database.js';
import { checkTimeAchievements } from './achievementController.js';

// Start a learning session
export const startSession = async (req, res) => {
  try {
    const { lessonId, moduleId } = req.body;

    // End any active sessions for this user
    await prisma.learningSession.updateMany({
      where: { userId: req.user.id, isActive: true },
      data: { 
        isActive: false, 
        endTime: new Date(),
      },
    });

    // Calculate duration for ended sessions
    const endedSessions = await prisma.learningSession.findMany({
      where: { userId: req.user.id, endTime: { not: null }, duration: null },
    });

    for (const session of endedSessions) {
      const duration = Math.floor((session.endTime - session.startTime) / 1000);
      await prisma.learningSession.update({
        where: { id: session.id },
        data: { duration: Math.min(duration, 3600) }, // Cap at 1 hour per session
      });
    }

    // Start new session
    const session = await prisma.learningSession.create({
      data: {
        userId: req.user.id,
        lessonId,
        moduleId,
      },
    });

    res.json({ session });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

// Heartbeat to keep session alive
export const heartbeat = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: req.user.id, isActive: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if session is stale (last ping > 2 minutes ago)
    const lastPing = new Date(session.lastPing);
    const now = new Date();
    const diffMinutes = (now - lastPing) / 1000 / 60;

    if (diffMinutes > 2) {
      // End stale session
      const duration = Math.floor((lastPing - new Date(session.startTime)) / 1000);
      await prisma.learningSession.update({
        where: { id: sessionId },
        data: { 
          isActive: false, 
          endTime: lastPing,
          duration: Math.min(duration, 3600),
        },
      });

      // Check time achievements
      await checkTimeAchievements(req.user.id);

      return res.json({ sessionEnded: true, message: 'Session was stale and has been ended' });
    }

    // Update last ping
    await prisma.learningSession.update({
      where: { id: sessionId },
      data: { lastPing: now },
    });

    res.json({ sessionActive: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

// End a learning session
export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - new Date(session.startTime)) / 1000);

    await prisma.learningSession.update({
      where: { id: sessionId },
      data: { 
        isActive: false, 
        endTime,
        duration: Math.min(duration, 3600), // Cap at 1 hour
      },
    });

    // Check time achievements
    await checkTimeAchievements(req.user.id);

    res.json({ message: 'Session ended', duration });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
};

// Get user learning stats
export const getLearningStats = async (req, res) => {
  try {
    const sessions = await prisma.learningSession.findMany({
      where: { userId: req.user.id, duration: { not: null } },
      select: { duration: true, moduleId: true, createdAt: true },
    });

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    // Group by module
    const byModule = {};
    for (const s of sessions) {
      byModule[s.moduleId] = (byModule[s.moduleId] || 0) + (s.duration || 0);
    }

    res.json({
      totalSeconds,
      totalMinutes: Math.floor(totalSeconds / 60),
      totalHours: Math.floor(totalSeconds / 3600),
      sessionCount: sessions.length,
      byModule,
    });
  } catch (error) {
    console.error('Get learning stats error:', error);
    res.status(500).json({ error: 'Failed to fetch learning stats' });
  }
};
