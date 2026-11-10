
const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      required: true,
      unique: true,
    },

    vehicleType: {
      type: String,
      required: true,
      enum: ["Car", "Bike", "Bus", "EV"],
    },

    status: {
      type: String,
      enum: ["Available", "Reserved", "Occupied"],
      default: "Available",
    },

    pricePerHour: {
      type: Number,
      required: true,
    },

    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    bookedAt: {
      type: Date,
      default: null,
    },

    durationHours: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ParkingSlot = mongoose.model(
  "ParkingSlot",
  parkingSlotSchema
);

module.exports = ParkingSlot;
