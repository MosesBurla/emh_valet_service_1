const rbac = (roles) => (req, res, next) => {
  console.log("RBAC check => allowed:", roles, "user role:", req.user?.role);

  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ msg: 'Access denied: Insufficient permissions' });
  }
  next();
};

module.exports = rbac;
