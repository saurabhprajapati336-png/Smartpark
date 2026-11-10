
const mongoose = require("mongoose");
const crypto = require("crypto");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parkingSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingSlot",
      required: true,
    },

    slotId: {
      type: String,
      required: true,
    },

    vehicleType: {
      type: String,
      required: true,
      enum: ["Car", "Bike", "Bus", "EV"],
    },

    bookingDate: {
      type: Date,
      default: Date.now,
    },

    durationHours: {
      type: Number,
      required: true,
    },

    pricePerHour: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Reserved",
        "Occupied",
        "Completed",
        "Cancelled",
      ],
      default: "Reserved",
    },

    // Har booking ka unique QR token
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
