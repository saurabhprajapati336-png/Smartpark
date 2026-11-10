
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // FETCH USER FROM DATABASE
    const user = await User.findById(decoded.userId).select(
      "-password -resetPasswordOTP -resetPasswordOTPExpiry"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    // CHECK ACCOUNT STATUS
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact administrator.",
      });
    }

    // ATTACH CURRENT DATABASE USER
    req.user = {
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();

  } catch (error) {
    console.error("Authentication Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

module.exports = protect;
