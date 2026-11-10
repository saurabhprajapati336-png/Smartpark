
const mongoose = require("mongoose");
const express = require("express");

const ParkingSlot = require("../models/ParkingSlot");
const Booking = require("../models/Booking");
const User = require("../models/User");

const router = express.Router();

// ==========================================
// GET ADMIN DASHBOARD, BOOKING HISTORY
// AND REVENUE
// ==========================================

router.get("/dashboard", async (req, res) => {
  try {
    const totalSlots = await ParkingSlot.countDocuments();

    const availableSlots = await ParkingSlot.countDocuments({
      status: "Available",
    });

    const reservedSlots = await ParkingSlot.countDocuments({
      status: "Reserved",
    });

    const occupiedSlots = await ParkingSlot.countDocuments({
      status: "Occupied",
    });

    const bookings = await Booking.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const totalBookings = bookings.length;

    const completedBookings = bookings.filter(
      (booking) => booking.status === "Completed"
    ).length;

    const cancelledBookings = bookings.filter(
      (booking) => booking.status === "Cancelled"
    ).length;

    const activeBookings = bookings.filter(
      (booking) =>
        booking.status === "Reserved" ||
        booking.status === "Occupied"
    ).length;

    const totalRevenue = bookings
      .filter((booking) => booking.status !== "Cancelled")
      .reduce(
        (total, booking) => total + (booking.totalAmount || 0),
        0
      );

    const completedRevenue = bookings
      .filter((booking) => booking.status === "Completed")
      .reduce(
        (total, booking) => total + (booking.totalAmount || 0),
        0
      );

    const bookingRecords = bookings.map((booking) => {
      const record = booking.toObject();

      return {
        ...record,
        bookedBy: record.user,
        bookedAt: record.bookingDate,
      };
    });

    res.status(200).json({
      success: true,

      statistics: {
        totalSlots,
        availableSlots,
        reservedSlots,
        occupiedSlots,
      },

      bookingStatistics: {
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        completedRevenue,
      },

      bookings: bookingRecords,
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// GET MONTHLY REVENUE
// ==========================================

router.get("/monthly-revenue", async (req, res) => {
  try {
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: "Completed",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$bookingDate" },
            month: { $month: "$bookingDate" },
          },

          totalRevenue: {
            $sum: "$totalAmount",
          },

          totalBookings: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      monthlyRevenue,
    });

  } catch (error) {
    console.error("Monthly revenue error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// GET ALL PARKING SLOTS
// ==========================================

router.get("/slots", async (req, res) => {
  try {
    const slots = await ParkingSlot.find().sort({
      slotId: 1,
    });

    res.status(200).json({
      success: true,
      slots,
    });

  } catch (error) {
    console.error("Fetch slots error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// ADD NEW PARKING SLOT
// ==========================================

router.post("/slots", async (req, res) => {
  try {
    const { slotId, vehicleType, pricePerHour } = req.body;

    if (
      !slotId ||
      typeof slotId !== "string" ||
      !vehicleType ||
      pricePerHour === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide slot ID, vehicle type and price.",
      });
    }

    const allowedTypes = ["Car", "Bike", "Bus", "EV"];

    if (!allowedTypes.includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle type.",
      });
    }

    const price = Number(pricePerHour);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than zero.",
      });
    }

    const cleanSlotId = slotId.trim();

    if (!cleanSlotId) {
      return res.status(400).json({
        success: false,
        message: "Slot ID cannot be empty.",
      });
    }

    const existingSlot = await ParkingSlot.findOne({
      slotId: cleanSlotId,
    });

    if (existingSlot) {
      return res.status(409).json({
        success: false,
        message: "This slot ID already exists.",
      });
    }

    const newSlot = await ParkingSlot.create({
      slotId: cleanSlotId,
      vehicleType,
      pricePerHour: price,
    });

    res.status(201).json({
      success: true,
      message: "Parking slot added successfully.",
      slot: newSlot,
    });

  } catch (error) {
    console.error("Add slot error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// DELETE AVAILABLE PARKING SLOT
// ==========================================

router.delete("/slots/:id", async (req, res) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Parking slot not found.",
      });
    }

    if (slot.status !== "Available") {
      return res.status(400).json({
        success: false,
        message: "Only available slots can be deleted.",
      });
    }

    await ParkingSlot.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Parking slot deleted successfully.",
    });

  } catch (error) {
    console.error("Delete slot error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// UPDATE BOOKING STATUS
// ==========================================

router.patch("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Occupied", "Completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const slot = await ParkingSlot.findById(
      booking.parkingSlot
    );

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Parking slot not found.",
      });
    }

    if (status === "Occupied") {
      if (
        booking.status !== "Reserved" ||
        slot.status !== "Reserved" ||
        String(slot.bookedBy) !== String(booking.user)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only active reserved bookings can be marked occupied.",
        });
      }

      slot.status = "Occupied";
      await slot.save();

      booking.status = "Occupied";
      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Booking marked as occupied.",
        booking,
      });
    }

    if (status === "Completed") {
      if (
        booking.status !== "Occupied" ||
        slot.status !== "Occupied" ||
        String(slot.bookedBy) !== String(booking.user)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only active occupied bookings can be completed.",
        });
      }

      slot.status = "Available";
      slot.bookedBy = null;
      slot.bookedAt = null;
      slot.durationHours = 0;
      slot.totalAmount = 0;

      await slot.save();

      booking.status = "Completed";
      await booking.save();

      return res.status(200).json({
        success: true,
        message:
          "Booking completed. History has been saved.",
        booking,
        slot,
      });
    }

  } catch (error) {
    console.error("Booking status update error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// VERIFY PARKING QR CODE - ADMIN ONLY
// ==========================================

router.post("/bookings/verify-qr", async (req, res) => {
  try {
    const { qrToken } = req.body || {};

    if (
      typeof qrToken !== "string" ||
      !/^[a-f0-9]{64}$/.test(qrToken)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR token format.",
      });
    }

    const booking = await Booking.findOne({
      qrToken,
    }).populate("user", "name email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR Code. Booking not found.",
      });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking has been cancelled.",
      });
    }

    if (booking.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "This booking is already completed.",
      });
    }

    if (booking.status === "Occupied") {
      return res.status(409).json({
        success: false,
        message: "This booking is already occupied.",
      });
    }

    if (booking.status !== "Reserved") {
      return res.status(400).json({
        success: false,
        message: "Booking is not eligible for entry.",
      });
    }

    // CHECK CURRENT PARKING SLOT STATUS
    const slot = await ParkingSlot.findById(
      booking.parkingSlot
    );

    if (
      !slot ||
      slot.status !== "Reserved" ||
      String(slot.bookedBy) !== String(booking.user?._id)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Parking slot is not reserved for this booking.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "QR Code verified successfully!",

      booking: {
        _id: booking._id,
        slotId: booking.slotId,
        vehicleType: booking.vehicleType,
        bookingDate: booking.bookingDate,
        durationHours: booking.durationHours,
        totalAmount: booking.totalAmount,
        status: booking.status,
        customerName: booking.user?.name || "Unknown",
        customerEmail: booking.user?.email || "N/A",
      },
    });

  } catch (error) {
    console.error("QR verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify QR Code.",
    });
  }
});

// ==========================================
// GET ALL REGISTERED USERS
// ==========================================

router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "-password -resetPasswordOTP -resetPasswordOTPExpiry -resetPasswordOTPAttempts"
      )
      .sort({ createdAt: -1 })
      .lean();

    // GET BOOKING COUNTS FOR EACH USER
    const bookingCounts = await Booking.aggregate([
      {
        $group: {
          _id: "$user",
          totalBookings: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      bookingCounts.map((item) => [
        String(item._id),
        item.totalBookings,
      ])
    );

    const userRecords = users.map((user) => ({
      ...user,
      totalBookings:
        countMap.get(String(user._id)) || 0,
    }));

    return res.status(200).json({
      success: true,
      totalUsers: userRecords.length,
      users: userRecords,
    });

  } catch (error) {
    console.error("Fetch users error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch users.",
    });
  }
});

// ==========================================
// GET PARTICULAR USER BOOKING HISTORY
// ==========================================

router.get("/users/:id/bookings", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(req.params.id)
      .select("name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const bookings = await Booking.find({
      user: req.params.id,
    })
      .populate("parkingSlot", "slotId vehicleType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      user,
      totalBookings: bookings.length,
      bookings,
    });

  } catch (error) {
    console.error("User booking history error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user booking history.",
    });
  }
});

// ==========================================
// ACTIVATE / DEACTIVATE USER ACCOUNT
// ==========================================

router.patch("/users/:id/status", async (req, res) => {
  try {
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid account status.",
      });
    }

    // PREVENT ADMIN FROM CHANGING OWN ACCOUNT STATUS
    if (String(req.user.userId) === String(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own account status.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
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
      message: isActive
        ? "User account activated successfully."
        : "User account deactivated successfully.",
      user,
    });

  } catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update user status.",
    });
  }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
