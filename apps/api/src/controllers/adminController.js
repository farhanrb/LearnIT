import prisma from '../config/database.js';

/**
 * Get admin dashboard statistics
 * GET /api/admin/stats
 */
export const getStats = async (req, res) => {
  try {
    // Total students (users with USER role)
    const totalStudents = await prisma.user.count({
      where: { role: 'USER' },
    });

    // All modules count
    const activeModules = await prisma.module.count();

    // Total enrollments
    const totalEnrollments = await prisma.enrollment.count();

    // Calculate average completion
    const allProgress = await prisma.userProgress.findMany({
      where: { completed: true },
    });
    const totalLessons = await prisma.lesson.count();
    const avgCompletion = totalLessons > 0 
      ? Math.round((allProgress.length / (totalStudents * totalLessons || 1)) * 100) 
      : 0;

    res.json({
      totalStudents: {
        value: totalStudents,
        change: '+5%',
        trend: 'up',
      },
      activeModules: {
        value: activeModules,
        change: '+2',
        trend: 'up',
      },
      avgCompletion: {
        value: Math.min(avgCompletion, 100),
        change: '+12%',
        trend: 'up',
      },
      totalEnrollments: {
        value: totalEnrollments,
        change: '+8%',
        trend: 'up',
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

/**
 * Get recent activity for admin dashboard
 * GET /api/admin/activity
 */
export const getRecentActivity = async (req, res) => {
  try {
    // Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, username: true, email: true, profile: { select: { nickname: true } } },
        },
      },
    });

    // Get recent user registrations
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, username: true, email: true, createdAt: true, profile: { select: { nickname: true } } },
    });

    // Get recent enrollments - use enrolledAt not createdAt
    const recentEnrollments = await prisma.enrollment.findMany({
      orderBy: { enrolledAt: 'desc' },
      take: 5,
      include: {
        user: { select: { username: true, profile: { select: { nickname: true } } } },
        module: { select: { title: true } },
      },
    });

    // Format activities
    const activities = [
      ...recentNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        description: `${n.user?.profile?.nickname || n.user?.username || 'User'}: ${n.message}`,
        timestamp: n.createdAt,
        icon: n.type === 'MODULE_COMPLETE' ? 'check' : n.type === 'ACHIEVEMENT' ? 'military_tech' : 'notifications',
        color: n.type === 'MODULE_COMPLETE' ? 'green' : n.type === 'ACHIEVEMENT' ? 'purple' : 'primary',
      })),
      ...recentUsers.map(u => ({
        id: `user-${u.id}`,
        type: 'NEW_USER',
        title: 'New Registration',
        description: `${u.profile?.nickname || u.username} joined the platform`,
        timestamp: u.createdAt,
        icon: 'person_add',
        color: 'primary',
      })),
      ...recentEnrollments.map(e => ({
        id: `enrollment-${e.id}`,
        type: 'ENROLLMENT',
        title: 'New Enrollment',
        description: `${e.user?.profile?.nickname || e.user?.username} enrolled in ${e.module?.title}`,
        timestamp: e.enrolledAt,
        icon: 'school',
        color: 'blue',
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    res.json({ activities });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

/**
 * Get user progress overview for admin dashboard
 * GET /api/admin/user-progress
 */
export const getUserProgressOverview = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users with their progress
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      take: parseInt(limit),
      include: {
        profile: { select: { avatarUrl: true, nickname: true } },
        enrollments: {
          include: {
            module: {
              include: {
                chapters: {
                  include: {
                    lessons: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
        progress: {
          where: { completed: true },
          select: { lessonId: true },
        },
      },
    });

    const userProgress = users.map(user => {
      // Calculate total lessons from enrolled modules
      const totalLessons = user.enrollments.reduce((sum, e) => {
        return sum + e.module.chapters.reduce((chSum, ch) => chSum + ch.lessons.length, 0);
      }, 0);

      const completedLessons = user.progress.length;
      const progressPercent = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100) 
        : 0;

      return {
        id: user.id,
        name: user.profile?.nickname || user.username,
        email: user.email,
        avatarUrl: user.profile?.avatarUrl,
        progressPercent: Math.min(progressPercent, 100),
        completedLessons,
        totalLessons,
        enrolledModules: user.enrollments.length,
      };
    });

    // Sort by progress
    userProgress.sort((a, b) => b.progressPercent - a.progressPercent);

    res.json({ users: userProgress });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
};
