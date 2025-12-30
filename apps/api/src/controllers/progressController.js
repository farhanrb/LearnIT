import Joi from 'joi';
import prisma from '../config/database.js';
import { awardAchievement } from './achievementController.js';
import { createNotification } from './notificationController.js';

/**
 * Enroll user in a module
 * POST /api/progress/enroll
 */
export const enrollInModule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { moduleId } = req.body;

    if (!moduleId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Module ID is required',
      });
    }

    // Check if module exists
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      return res.status(404).json({
        error: 'Module not found',
      });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Already enrolled',
        message: 'You are already enrolled in this module',
      });
    }

    // **Validate subscription limits**
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { tier: true },
    });

    if (!subscription) {
      return res.status(403).json({ error: 'No subscription found' });
    }

    const enrollmentCount = await prisma.enrollment.count({ where: { userId } });
   const tier = subscription.tier;

    // BASIC - max 1 module
    if (tier.name === 'BASIC' && tier.moduleLimit && enrollmentCount >= tier.moduleLimit) {
      return res.status(403).json({
        error: 'Enrollment limit reached',
        message: `Basic tier allows only ${tier.moduleLimit} module`,
      });
    }

    // PRO - max 3, must be in bundle
    if (tier.name === 'PRO') {
      if (!subscription.selectedModules.includes(moduleId)) {
        return res.status(403).json({
          error: 'Module not in bundle',
          message: 'This module is not in your Pro bundle',
        });
      }
      if (tier.moduleLimit && enrollmentCount >= tier.moduleLimit) {
        return res.status(403).json({
          error: 'Enrollment limit reached',
          message: `Pro tier allows maximum ${tier.moduleLimit} modules`,
        });
      }
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        moduleId,
      },
    });

    res.status(201).json({
      message: 'Enrolled successfully',
      enrollment,
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to enroll in module',
    });
  }
};

/**
 * Mark lesson as completed
 * POST /api/progress/complete-lesson
 */
export const completLesson = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Lesson ID is required',
      });
    }

    // Check if lesson exists - include chapter to get moduleId
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { 
        chapter: {
          include: { module: true }
        }
      },
    });

    if (!lesson) {
      return res.status(404).json({
        error: 'Lesson not found',
      });
    }

    const moduleId = lesson.chapter.moduleId;

    // Check if enrolled in module
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        error: 'Not enrolled',
        message: 'You must enroll in the module first',
      });
    }

    // Create or update progress
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
    });

    // Update last accessed time
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastAccessedAt: new Date() },
    });

    // --- Achievement & Notification Triggers ---
    const module = lesson.chapter.module;
    const chapter = lesson.chapter;

    // Check if this is user's first completed lesson
    const completedLessonsCount = await prisma.userProgress.count({
      where: { userId, completed: true },
    });
    
    if (completedLessonsCount === 1) {
      await awardAchievement(userId, 'FIRST_LESSON');
    }

    // Create notification for lesson completion
    await createNotification(
      userId,
      'LESSON_COMPLETE',
      `Lesson Selesai: ${lesson.title}`,
      `Kamu telah menyelesaikan lesson "${lesson.title}"`,
      'check_circle',
      { lessonId, moduleId, chapterId: chapter.id }
    );

    // Check if chapter is complete
    const chapterLessons = await prisma.lesson.findMany({
      where: { chapterId: chapter.id },
      select: { id: true },
    });
    const chapterLessonIds = chapterLessons.map(l => l.id);
    const completedInChapter = await prisma.userProgress.count({
      where: { userId, lessonId: { in: chapterLessonIds }, completed: true },
    });

    if (completedInChapter === chapterLessons.length) {
      await awardAchievement(userId, 'CHAPTER_COMPLETE', { 
        chapterId: chapter.id, 
        chapterTitle: chapter.title,
        moduleId 
      });
      
      await createNotification(
        userId,
        'CHAPTER_COMPLETE',
        `Chapter Selesai: ${chapter.title}`,
        `Kamu telah menyelesaikan chapter "${chapter.title}"`,
        'menu_book',
        { chapterId: chapter.id, moduleId }
      );
    }

    // Check if module is complete
    const allModuleChapters = await prisma.chapter.findMany({
      where: { moduleId },
      include: { lessons: { select: { id: true } } },
    });
    const allLessonIds = allModuleChapters.flatMap(c => c.lessons.map(l => l.id));
    const completedInModule = await prisma.userProgress.count({
      where: { userId, lessonId: { in: allLessonIds }, completed: true },
    });

    if (completedInModule === allLessonIds.length && allLessonIds.length > 0) {
      await awardAchievement(userId, 'MODULE_COMPLETE', { 
        moduleId, 
        moduleTitle: module.title 
      });
      
      await createNotification(
        userId,
        'MODULE_COMPLETE',
        `🎉 Modul Selesai: ${module.title}`,
        `Selamat! Kamu telah menyelesaikan modul "${module.title}"`,
        'emoji_events',
        { moduleId }
      );
    }

    res.json({
      message: 'Lesson marked as completed',
      progress,
    });
  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete lesson',
    });
  }
};

/**
 * Get lesson by ID with content
 * GET /api/progress/lesson/:lessonId
 */
export const getLessonById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.params;

    // Get lesson with chapter and module info
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          include: {
            module: {
              include: {
                chapters: {
                  orderBy: { order: 'asc' },
                  include: {
                    lessons: {
                      orderBy: { order: 'asc' },
                      select: {
                        id: true,
                        title: true,
                        order: true,
                        estimatedMinutes: true,
                        difficulty: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({
        error: 'Lesson not found',
      });
    }

    const module = lesson.chapter.module;
    const moduleId = module.id;

    // Check if enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_moduleId: { userId, moduleId },
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        error: 'Not enrolled',
        message: 'You must enroll in the module to access lessons',
      });
    }

    // Get all lesson IDs for progress check
    const allLessons = module.chapters.flatMap(ch => ch.lessons.map(l => l.id));

    // Get user progress for all lessons in this module
    const progressRecords = await prisma.userProgress.findMany({
      where: {
        userId,
        lessonId: { in: allLessons },
      },
    });

    const progressMap = new Map(progressRecords.map(p => [p.lessonId, p.completed]));

    // Build chapters with progress
    const chaptersWithProgress = module.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      lessons: chapter.lessons.map(l => ({
        ...l,
        completed: progressMap.get(l.id) || false,
        isActive: l.id === lessonId,
      })),
    }));

    // Calculate overall progress
    const totalLessons = allLessons.length;
    const completedLessons = progressRecords.filter(p => p.completed).length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Find prev/next lessons
    const flatLessons = module.chapters.flatMap(ch => ch.lessons);
    const currentIndex = flatLessons.findIndex(l => l.id === lessonId);
    const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

    // Update last accessed
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastAccessedAt: new Date() },
    });

    res.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        estimatedMinutes: lesson.estimatedMinutes,
        difficulty: lesson.difficulty,
        order: lesson.order,
      },
      chapter: {
        id: lesson.chapter.id,
        title: lesson.chapter.title,
      },
      module: {
        id: module.id,
        title: module.title,
        slug: module.slug,
      },
      progress: {
        totalLessons,
        completedLessons,
        progressPercentage,
      },
      chapters: chaptersWithProgress,
      navigation: {
        prev: prevLesson,
        next: nextLesson,
      },
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get lesson',
    });
  }
};

/**
 * Get user's progress across all modules
 * GET /api/progress/user
 */
export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        module: {
          include: {
            chapters: {
              include: {
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    const progressData = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get all lesson IDs from all chapters
        const allLessons = enrollment.module.chapters.flatMap(ch => ch.lessons.map(l => l.id));
        const totalLessons = allLessons.length;
        
        const completedLessons = await prisma.userProgress.count({
          where: {
            userId,
            lessonId: { in: allLessons },
            completed: true,
          },
        });

        const progressPercentage = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        return {
          moduleId: enrollment.module.id,
          moduleTitle: enrollment.module.title,
          moduleSlug: enrollment.module.slug,
          enrolledAt: enrollment.enrolledAt,
          lastAccessedAt: enrollment.lastAccessedAt,
          totalLessons,
          completedLessons,
          progressPercentage,
        };
      })
    );

    res.json({
      progress: progressData,
    });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get progress',
    });
  }
};

/**
 * Get progress for specific module
 * GET /api/progress/module/:moduleId
 */
export const getModuleProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { moduleId } = req.params;

    // Get module with chapters and lessons
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!module) {
      return res.status(404).json({
        error: 'Module not found',
      });
    }

    // Get all lesson IDs
    const allLessons = module.chapters.flatMap(ch => ch.lessons);

    // Get user progress for each lesson
    const progressRecords = await prisma.userProgress.findMany({
      where: {
        userId,
        lessonId: { in: allLessons.map(l => l.id) },
      },
    });

    const progressMap = new Map(progressRecords.map(p => [p.lessonId, { completed: p.completed, completedAt: p.completedAt }]));

    // Build chapters with lessons and progress
    const chaptersWithProgress = module.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      lessons: chapter.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        difficulty: lesson.difficulty,
        completed: progressMap.get(lesson.id)?.completed || false,
        completedAt: progressMap.get(lesson.id)?.completedAt || null,
      })),
    }));

    const completedCount = progressRecords.filter(p => p.completed).length;
    const progressPercentage = allLessons.length > 0
      ? Math.round((completedCount / allLessons.length) * 100)
      : 0;

    res.json({
      module: {
        id: module.id,
        title: module.title,
        slug: module.slug,
      },
      totalLessons: allLessons.length,
      completedLessons: completedCount,
      progressPercentage,
      chapters: chaptersWithProgress,
    });
  } catch (error) {
    console.error('Get module progress error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get module progress',
    });
  }
};
