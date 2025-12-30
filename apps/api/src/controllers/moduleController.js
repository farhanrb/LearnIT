import Joi from 'joi';
import prisma from '../config/database.js';

// Validation schemas
const createModuleSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  slug: Joi.string().min(3).max(100).required(),
  description: Joi.string().required(),
  estimatedHours: Joi.number().integer().min(1).required(),
  category: Joi.string().valid('ANDROID_DEV', 'IOS_DEV', 'WEB_DEV', 'FUNDAMENTAL').required(),
  thumbnailUrl: Joi.string().uri().optional(),
});

/**
 * Get all modules
 * GET /api/modules
 */
export const getAllModules = async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { order: 'asc' },
      include: {
        chapters: {
          include: {
            _count: { select: { lessons: true } }
          }
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    res.json({
      modules: modules.map(module => {
        // Count total lessons across all chapters
        const lessonCount = module.chapters.reduce((acc, ch) => acc + ch._count.lessons, 0);
        return {
          id: module.id,
          title: module.title,
          slug: module.slug,
          description: module.description,
          estimatedHours: module.estimatedHours,
          category: module.category,
          thumbnailUrl: module.thumbnailUrl,
          lessonCount,
          studentCount: module._count.enrollments,
        };
      }),
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch modules',
    });
  }
};

/**
 * Get module by ID with chapters and lessons
 * GET /api/modules/:id
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
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!module) {
      return res.status(404).json({
        error: 'Module not found',
      });
    }

    // Calculate total lessons
    const lessonCount = module.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);

    res.json({
      module: {
        id: module.id,
        title: module.title,
        slug: module.slug,
        description: module.description,
        estimatedHours: module.estimatedHours,
        category: module.category,
        thumbnailUrl: module.thumbnailUrl,
        studentCount: module._count.enrollments,
        lessonCount,
        chapters: module.chapters,
      },
    });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch module',
    });
  }
};

/**
 * Create new module (Admin only)
 * POST /api/modules
 */
export const createModule = async (req, res) => {
  try {
    const { error, value } = createModuleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
      });
    }

    // Check if slug already exists
    const existing = await prisma.module.findUnique({
      where: { slug: value.slug },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Module already exists',
        message: 'Slug already in use',
      });
    }

    const module = await prisma.module.create({
      data: value,
    });

    res.status(201).json({
      message: 'Module created successfully',
      module,
    });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create module',
    });
  }
};

/**
 * Update module (Admin only)
 * PUT /api/modules/:id
 */
export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createModuleSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
      });
    }

    const module = await prisma.module.update({
      where: { id },
      data: value,
    });

    res.json({
      message: 'Module updated successfully',
      module,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Module not found',
      });
    }
    console.error('Update module error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update module',
    });
  }
};

/**
 * Delete module (Admin only)
 * DELETE /api/modules/:id
 */
export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.module.delete({
      where: { id },
    });

    res.json({
      message: 'Module deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Module not found',
      });
    }
    console.error('Delete module error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete module',
    });
  }
};
