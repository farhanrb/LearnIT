import prisma from '../config/database.js';
import bcrypt from 'bcrypt';
import path from 'path';

/**
 * Update user profile
 * PUT /api/user/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nickname, email, bio } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          error: 'Email already in use',
        });
      }
    }

    // Update user email if provided
    if (email) {
      await prisma.user.update({
        where: { id: userId },
        data: { email },
      });
    }

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        nickname: nickname || undefined,
        description: bio || undefined,
      },
      create: {
        userId,
        nickname: nickname || 'User',
        description: bio || '',
      },
    });

    // Get updated user with profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        profile: updatedUser.profile,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile',
    });
  }
};

/**
 * Change user password
 * PUT /api/user/password
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters',
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password',
    });
  }
};

/**
 * Upload avatar
 * POST /api/user/avatar
 */
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    // Generate avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update or create profile with avatar URL
    await prisma.profile.upsert({
      where: { userId },
      update: {
        avatarUrl,
      },
      create: {
        userId,
        nickname: 'User',
        avatarUrl,
      },
    });

    // Get updated user with profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        profile: updatedUser.profile,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload avatar',
    });
  }
};
