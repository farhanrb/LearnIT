/**
 * Admin Middleware - Verify user has ADMIN role
 */
export const adminMiddleware = (req, res, next) => {
  // Check if user exists (should be set by authMiddleware)
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required' 
    });
  }

  // Check if user has ADMIN role
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Admin access required' 
    });
  }

  next();
};
