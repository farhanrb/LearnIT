import prisma from '../config/database.js';

/**
 * Get all learning paths
 * GET /api/learning-paths
 */
export const getLearningPaths = async (req, res) => {
  try {
    const paths = await prisma.learningPath.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // For each path, get module details
    const pathsWithModules = await Promise.all(
      paths.map(async (path) => {
        const moduleIds = path.modules;
        const modules = await prisma.module.findMany({
          where: {
            id: { in: moduleIds },
          },
          orderBy: { order: 'asc' },
        });

        return {
          ...path,
          moduleDetails: modules,
        };
      })
    );

    res.json({
      paths: pathsWithModules,
    });
  } catch (error) {
    console.error('Get learning paths error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch learning paths',
    });
  }
};

/**
 * Get specific learning path
 * GET /api/learning-paths/:id
 */
export const getLearningPathById = async (req, res) => {
  try {
    const { id } = req.params;

    const path = await prisma.learningPath.findUnique({
      where: { id },
    });

    if (!path) {
      return res.status(404).json({
        error: 'Learning path not found',
      });
    }

    // Get module details
    const moduleIds = path.modules;
    const modules = await prisma.module.findMany({
      where: {
        id: { in: moduleIds },
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      path: {
        ...path,
        moduleDetails: modules,
      },
    });
  } catch (error) {
    console.error('Get learning path error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch learning path',
    });
  }
};

/**
 * Get module prerequisites
 * GET /api/modules/:id/prerequisites
 */
export const getModulePrerequisites = async (req, res) => {
  try {
    const { id } = req.params;

    // Get module
    const module = await prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      return res.status(404).json({
        error: 'Module not found',
      });
    }

    // Get prerequisites
    const prerequisites = await prisma.modulePrerequisite.findMany({
      where: { moduleId: id },
      include: {
        prerequisite: true,
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      module,
      prerequisites: prerequisites.map((p) => p.prerequisite),
    });
  } catch (error) {
    console.error('Get module prerequisites error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch prerequisites',
    });
  }
};

/**
 * Get module roadmap (full learning path)
 * GET /api/modules/:id/roadmap
 */
export const getModuleRoadmap = async (req, res) => {
  try {
    const { id } = req.params;

    // Get module
    const module = await prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      return res.status(404).json({
        error: 'Module not found',
      });
    }

    // Find learning paths containing this module
    const allPaths = await prisma.learningPath.findMany();
    const relevantPaths = allPaths.filter((path) => {
      const moduleIds = path.modules;
      return moduleIds.includes(id);
    });

    // For each path, get all module details and module position
    const roadmaps = await Promise.all(
      relevantPaths.map(async (path) => {
        const moduleIds = path.modules;
        const modules = await prisma.module.findMany({
          where: { id: { in: moduleIds } },
        });

        // Sort modules by path order
        const sortedModules = moduleIds
          .map((modId) => modules.find((m) => m.id === modId))
          .filter(Boolean);

        const currentIndex = moduleIds.indexOf(id);

        return {
          path,
          modules: sortedModules,
          currentModuleIndex: currentIndex,
          previousModules: sortedModules.slice(0, currentIndex),
          nextModules: sortedModules.slice(currentIndex + 1),
        };
      })
    );

    res.json({
      module,
      roadmaps,
    });
  } catch (error) {
    console.error('Get module roadmap error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch module roadmap',
    });
  }
};
