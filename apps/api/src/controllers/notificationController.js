import prisma from '../config/database.js';

// Get user notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await prisma.notification.update({
      where: { id: notificationId, userId: req.user.id },
      data: { read: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications' });
  }
};

// Create notification helper (internal use)
export const createNotification = async (userId, type, title, message, icon = null, metadata = null) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        icon,
        metadata,
      },
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};
