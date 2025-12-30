import prisma from '../config/database.js';

/**
 * Get all users for admin
 * GET /api/admin/users
 */
export const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { select: { avatarUrl: true, nickname: true, description: true } },
          subscription: {
            include: { tier: { select: { name: true, displayName: true } } },
          },
          enrollments: { select: { id: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map(u => ({
      id: u.id,
      name: u.profile?.nickname || u.username,
      email: u.email,
      role: u.role,
      avatarUrl: u.profile?.avatarUrl,
      bio: u.profile?.description,
      subscriptionTier: u.subscription?.tier?.displayName || 'None',
      enrolledModules: u.enrollments.length,
      createdAt: u.createdAt,
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get user by ID with full details
 * GET /api/admin/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscription: {
          include: { tier: true },
        },
        enrollments: {
          include: {
            module: { select: { id: true, title: true } },
          },
        },
        progress: {
          where: { completed: true },
          select: { lessonId: true, completedAt: true },
        },
        achievements: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Update user role
 * PUT /api/admin/users/:id/role
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent self role change
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, username: true, email: true, role: true },
    });

    res.json({ user, message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.$transaction(async (tx) => {
      // Delete user's data in order
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.achievement.deleteMany({ where: { userId: id } });
      await tx.learningSession.deleteMany({ where: { userId: id } });
      await tx.userProgress.deleteMany({ where: { userId: id } });
      await tx.enrollment.deleteMany({ where: { userId: id } });
      await tx.userSubscription.deleteMany({ where: { userId: id } });
      await tx.profile.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
