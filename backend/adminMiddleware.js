function adminOnly(req, res, next) {
  // Check whether user is logged in
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  // Check whether logged-in user is admin
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }

  next();
}

module.exports = adminOnly;