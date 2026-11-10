
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    isActive: {
  type: Boolean,
  default: true
},

    // FORGOT PASSWORD OTP
    resetPasswordOTP: {
      type: String,
      default: null
    },

    // OTP EXPIRY TIME
    resetPasswordOTPExpiry: {
      type: Date,
      default: null
    },

    // OTP VERIFICATION ATTEMPTS
    resetPasswordOTPAttempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
