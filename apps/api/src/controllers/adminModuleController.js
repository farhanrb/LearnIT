import prisma from '../config/database.js';

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
};

/**
 * Get all modules for admin
 * GET /api/admin/modules
 */
export const getModules = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const modules = await prisma.module.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        chapters: {
          include: {
            lessons: { select: { id: true } },
          },
        },
        enrollments: {
          select: { id: true },
        },
      },
    });

    const formattedModules = modules.map(m => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      description: m.description,
      category: m.category,
      isPublished: true, // All existing modules are published
      status: 'Active',
      chaptersCount: m.chapters.length,
      lessonsCount: m.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0),
      studentsCount: m.enrollments.length,
      estimatedHours: m.estimatedHours,
      thumbnailUrl: m.thumbnailUrl,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    res.json({ modules: formattedModules });
  } catch (error) {
    console.error('Get admin modules error:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
};

/**
 * Get single module with full details for editing
 * GET /api/admin/modules/:id
 */
export const getModuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
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
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({ module });
  } catch (error) {
    console.error('Get module by id error:', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
};

/**
 * Create new module
 * POST /api/admin/modules
 */
export const createModule = async (req, res) => {
  try {
    const { title, description, category, estimatedHours, thumbnailUrl } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const slug = generateSlug(title);

    const module = await prisma.module.create({
      data: {
        title,
        slug,
        description: description || '',
        category: category || 'FUNDAMENTAL',
        estimatedHours: estimatedHours || 1,
        thumbnailUrl: thumbnailUrl || null,
      },
    });

    res.status(201).json({ module, message: 'Module created successfully' });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
};

/**
 * Update module
 * PUT /api/admin/modules/:id
 */
export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, estimatedHours, thumbnailUrl } = req.body;

    const module = await prisma.module.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(estimatedHours !== undefined && { estimatedHours }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      },
    });

    res.json({ module, message: 'Module updated successfully' });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
};

/**
 * Delete module
 * DELETE /api/admin/modules/:id
 */
export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete in correct order due to relations
    await prisma.$transaction(async (tx) => {
      // Delete all user progress for lessons in this module
      const lessons = await tx.lesson.findMany({
        where: { chapter: { moduleId: id } },
        select: { id: true },
      });
      const lessonIds = lessons.map(l => l.id);
      
      await tx.userProgress.deleteMany({
        where: { lessonId: { in: lessonIds } },
      });

      // Delete learning sessions
      await tx.learningSession.deleteMany({
        where: { moduleId: id },
      });

      // Delete enrollments
      await tx.enrollment.deleteMany({
        where: { moduleId: id },
      });

      // Delete lessons
      await tx.lesson.deleteMany({
        where: { chapter: { moduleId: id } },
      });

      // Delete chapters
      await tx.chapter.deleteMany({
        where: { moduleId: id },
      });

      // Delete module prerequisites
      await tx.modulePrerequisite.deleteMany({
        where: { OR: [{ moduleId: id }, { prerequisiteId: id }] },
      });

      // Delete module
      await tx.module.delete({
        where: { id },
      });
    });

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
};

/**
 * Create chapter in module
 * POST /api/admin/modules/:moduleId/chapters
 */
export const createChapter = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get next order
    const lastChapter = await prisma.chapter.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastChapter?.order || 0) + 1;

    const chapter = await prisma.chapter.create({
      data: {
        moduleId,
        title,
        order: nextOrder,
      },
    });

    res.status(201).json({ chapter, message: 'Chapter created successfully' });
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
};

/**
 * Update chapter
 * PUT /api/admin/chapters/:id
 */
export const updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, order } = req.body;

    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ chapter, message: 'Chapter updated successfully' });
  } catch (error) {
    console.error('Update chapter error:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
};

/**
 * Delete chapter
 * DELETE /api/admin/chapters/:id
 */
export const deleteChapter = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      // Delete lessons in chapter
      const lessons = await tx.lesson.findMany({
        where: { chapterId: id },
        select: { id: true },
      });
      const lessonIds = lessons.map(l => l.id);

      await tx.userProgress.deleteMany({
        where: { lessonId: { in: lessonIds } },
      });

      await tx.lesson.deleteMany({
        where: { chapterId: id },
      });

      await tx.chapter.delete({
        where: { id },
      });
    });

    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Delete chapter error:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
};

/**
 * Create lesson in chapter
 * POST /api/admin/chapters/:chapterId/lessons
 */
export const createLesson = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { title, content, estimatedMinutes } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get next order
    const lastLesson = await prisma.lesson.findFirst({
      where: { chapterId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastLesson?.order || 0) + 1;

    const lesson = await prisma.lesson.create({
      data: {
        chapterId,
        title,
        content: content || '',
        estimatedMinutes: estimatedMinutes || 15,
        order: nextOrder,
      },
    });

    res.status(201).json({ lesson, message: 'Lesson created successfully' });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
};

/**
 * Update lesson
 * PUT /api/admin/lessons/:id
 */
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, estimatedMinutes, order } = req.body;

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ lesson, message: 'Lesson updated successfully' });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};

/**
 * Delete lesson
 * DELETE /api/admin/lessons/:id
 */
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      await tx.userProgress.deleteMany({
        where: { lessonId: id },
      });

      await tx.lesson.delete({
        where: { id },
      });
    });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
};
