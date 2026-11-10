
// ==========================================
// IMPORTS
// ==========================================

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { rateLimit } = require("express-rate-limit");

const { sendOTPEmail } = require("../config/mailer");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// RATE LIMIT CONFIGURATION
// ==========================================

// LOGIN: Maximum 10 failed requests in 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many failed login attempts. Please try again after 15 minutes.",
  },
});

// REGISTER: Maximum 5 requests in 1 hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

// FORGOT PASSWORD: Maximum 5 requests in 15 minutes
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 15 minutes.",
  },
});

// RESET PASSWORD: Maximum 10 requests in 15 minutes
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
});

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  next();
};

// EMAIL VALIDATION
const emailValidation = () =>
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Enter a valid email address.")
    .normalizeEmail();

// ==========================================
// USER REGISTRATION
// ==========================================

router.post(
  "/register",
  registerLimiter,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required.")
      .isLength({ max: 50 })
      .withMessage("Name cannot exceed 50 characters."),

    emailValidation(),

    body("password")
      .notEmpty()
      .withMessage("Password is required.")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),

    validateRequest,
  ],
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already registered.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        name: name.trim(),
        email,
        password: hashedPassword,
      });

      return res.status(201).json({
        success: true,
        message: "Registration successful!",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Email already registered.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Registration failed.",
      });
    }
  }
);

// ==========================================
// USER LOGIN
// ==========================================

router.post(
  "/login",
  loginLimiter,
  [
    emailValidation(),

    body("password")
      .notEmpty()
      .withMessage("Password is required."),

    validateRequest,
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          success: false,
          message: "Server authentication configuration error.",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const isMatch = await bcrypt.compare(
        password,
        user.password
      );

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      // Block deactivated accounts
      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message:
            "Your account has been deactivated. Contact administrator.",
        });
      }

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful!",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      return res.status(500).json({
        success: false,
        message: "Login failed.",
      });
    }
  }
);

// ==========================================
// GET LOGGED-IN USER PROFILE
// ==========================================

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -resetPasswordOTP -resetPasswordOTPExpiry -resetPasswordOTPAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profile.",
    });
  }
});

// ==========================================
// UPDATE USER PROFILE
// ==========================================

router.put(
  "/profile",
  protect,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required.")
      .isLength({ max: 50 })
      .withMessage("Name cannot exceed 50 characters."),

    emailValidation(),

    validateRequest,
  ],
  async (req, res) => {
    try {
      const cleanName = req.body.name.trim();
      const cleanEmail = req.body.email;

      const existingUser = await User.findOne({
        email: cleanEmail,
        _id: { $ne: req.user.userId },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "This email is already registered.",
        });
      }

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        {
          name: cleanName,
          email: cleanEmail,
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(
        "-password -resetPasswordOTP -resetPasswordOTPExpiry -resetPasswordOTPAttempts"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully!",
        user,
      });
    } catch (error) {
      console.error("Update profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update profile.",
      });
    }
  }
);

// ==========================================
// CHANGE PASSWORD
// ==========================================

router.patch(
  "/change-password",
  protect,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required."),

    body("newPassword")
      .notEmpty()
      .withMessage("New password is required.")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters."),

    validateRequest,
  ],
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const isMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }

      const samePassword = await bcrypt.compare(
        newPassword,
        user.password
      );

      if (samePassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different.",
        });
      }

      user.password = await bcrypt.hash(newPassword, 12);

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password changed successfully!",
      });
    } catch (error) {
      console.error("Change password error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update password.",
      });
    }
  }
);

// ==========================================
// FORGOT PASSWORD - SEND OTP
// ==========================================

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [
    emailValidation(),
    validateRequest,
  ],
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      // Do not reveal whether email is registered
      if (!user) {
        return res.status(200).json({
          success: true,
          message:
            "If the email is registered, an OTP will be sent.",
        });
      }

      // Generate secure 6-digit OTP
      const otp = crypto.randomInt(100000, 1000000).toString();

      // Store hashed OTP for 5 minutes
      user.resetPasswordOTP = await bcrypt.hash(otp, 10);

      user.resetPasswordOTPExpiry = new Date(
        Date.now() + 5 * 60 * 1000
      );

      user.resetPasswordOTPAttempts = 0;

      await user.save();

      try {
        await sendOTPEmail(user.email, otp);
      } catch (emailError) {
        console.error("OTP email error:", emailError);

        user.resetPasswordOTP = null;
        user.resetPasswordOTPExpiry = null;
        user.resetPasswordOTPAttempts = 0;

        await user.save();

        return res.status(500).json({
          success: false,
          message: "Unable to send OTP email. Please try again.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "If the email is registered, an OTP will be sent.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to process password reset request.",
      });
    }
  }
);

// ==========================================
// RESET PASSWORD - VERIFY OTP
// ==========================================

router.post(
  "/reset-password",
  resetPasswordLimiter,
  [
    emailValidation(),

    body("otp")
      .notEmpty()
      .withMessage("OTP is required.")
      .matches(/^\d{6}$/)
      .withMessage("Enter a valid 6-digit OTP."),

    body("newPassword")
      .notEmpty()
      .withMessage("New password is required.")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),

    validateRequest,
  ],
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      const user = await User.findOne({ email });

      if (!user || !user.resetPasswordOTP) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP.",
        });
      }

      // Check OTP expiry
      if (
        !user.resetPasswordOTPExpiry ||
        user.resetPasswordOTPExpiry.getTime() < Date.now()
      ) {
        user.resetPasswordOTP = null;
        user.resetPasswordOTPExpiry = null;
        user.resetPasswordOTPAttempts = 0;

        await user.save();

        return res.status(400).json({
          success: false,
          message: "OTP has expired. Please request a new OTP.",
        });
      }

      // Maximum 5 incorrect OTP attempts
      if (user.resetPasswordOTPAttempts >= 5) {
        user.resetPasswordOTP = null;
        user.resetPasswordOTPExpiry = null;
        user.resetPasswordOTPAttempts = 0;

        await user.save();

        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Request a new OTP.",
        });
      }

      const isOTPValid = await bcrypt.compare(
        otp,
        user.resetPasswordOTP
      );

      if (!isOTPValid) {
        user.resetPasswordOTPAttempts += 1;

        await user.save();

        return res.status(400).json({
          success: false,
          message: "Incorrect OTP.",
        });
      }

      // Update password
      user.password = await bcrypt.hash(newPassword, 12);

      // Clear OTP data after successful reset
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpiry = null;
      user.resetPasswordOTPAttempts = 0;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password reset successfully! Please login again.",
      });
    } catch (error) {
      console.error("Reset password error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to reset password.",
      });
    }
  }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
