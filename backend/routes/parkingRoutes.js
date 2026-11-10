
const crypto = require("crypto");
const express = require("express");
const router = express.Router();

const ParkingSlot = require("../models/ParkingSlot");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { transporter } = require("../config/mailer");

// ==========================================
// SEND BOOKING CONFIRMATION EMAIL TO USER
// ==========================================

async function sendBookingConfirmationEmail(user, booking) {
  if (!user.email) {
    throw new Error("User email address not found.");
  }

  const bookingDate = new Date(booking.bookingDate).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

  await transporter.sendMail({
    from: `"SmartPark" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "SmartPark - Booking Confirmation",

    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>

      <body style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 20px;">

        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden;">

          <div style="background: #0f172a; color: white; padding: 25px; text-align: center;">
            <h1 style="margin: 0;">SmartPark</h1>
            <p style="color: #38bdf8;">Smart Parking Solution</p>
          </div>

          <div style="padding: 25px;">

            <h2 style="color: #15803d;">Booking Confirmed!</h2>

            <p>Hello <strong>${user.name || "User"}</strong>,</p>

            <p>Your parking slot has been successfully booked.</p>

            <h3>Booking Details</h3>

            <table style="width: 100%; border-collapse: collapse;">

              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Booking ID</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${booking._id}</strong></td>
              </tr>

              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Parking Slot</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${booking.slotId}</strong></td>
              </tr>

              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Vehicle Type</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.vehicleType}</td>
              </tr>

              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Booking Date</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${bookingDate}</td>
              </tr>

              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Duration</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.durationHours} Hours</td>
              </tr>

              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Price Per Hour</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${booking.pricePerHour}</td>
              </tr>

              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Total Amount</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>₹${booking.totalAmount}</strong></td>
              </tr>

              <tr>
                <td style="padding: 10px;">Booking Status</td>
                <td style="padding: 10px;"><strong style="color: #15803d;">${booking.status}</strong></td>
              </tr>

            </table>

            <p style="margin-top: 25px;">
              Please keep this email for your booking reference.
            </p>

            <p>
              Thank you,<br>
              <strong>SmartPark Team</strong>
            </p>

          </div>

          <div style="background: #e2e8f0; padding: 15px; text-align: center; color: #64748b;">
            © 2026 SmartPark. All Rights Reserved.
          </div>

        </div>

      </body>
      </html>
    `,
  });
}

// ==========================================
// SEND BOOKING CANCELLATION EMAIL TO USER
// ==========================================

async function sendCancellationEmail(user, booking) {
  if (!user.email) {
    throw new Error("User email address not found.");
  }

  await transporter.sendMail({
    from: `"SmartPark" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "SmartPark - Booking Cancellation Confirmation",

    html: `
      <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 20px;">

        <div style="max-width: 600px; margin: auto; background: white; padding: 25px; border-radius: 10px;">

          <h2 style="color: #2563eb;">SmartPark</h2>

          <h3 style="color: #dc2626;">
            Booking Cancelled Successfully
          </h3>

          <p>Hello <strong>${user.name || "User"}</strong>,</p>

          <p>Your parking booking has been cancelled successfully.</p>

          <hr />

          <h3>Cancellation Details</h3>

          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Parking Slot:</strong> ${booking.slotId}</p>
          <p><strong>Vehicle Type:</strong> ${booking.vehicleType}</p>
          <p><strong>Duration:</strong> ${booking.durationHours} Hours</p>
          <p><strong>Amount:</strong> ₹${booking.totalAmount}</p>
          <p><strong>Status:</strong> Cancelled</p>

          <hr />

          <p>Thank you for using SmartPark.</p>
          <p><strong>SmartPark Team</strong></p>

        </div>

      </div>
    `,
  });
}

// ==========================================
// SEND NEW BOOKING NOTIFICATION TO ADMIN
// ==========================================

async function sendAdminBookingNotification(booking, customer) {
  const admins = await User.find({
    role: "admin",
    isActive: { $ne: false },
  }).select("name email");

  if (admins.length === 0) {
    throw new Error("No active admin account found.");
  }

  const results = await Promise.allSettled(
    admins.map((admin) => {
      if (!admin.email) {
        throw new Error("Admin email address not found.");
      }

      return transporter.sendMail({
        from: `"SmartPark" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: "SmartPark - New Parking Booking",

        html: `
          <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 20px;">

            <div style="max-width: 600px; margin: auto; background: white; padding: 25px; border-radius: 10px;">

              <h2 style="color: #2563eb;">SmartPark Admin</h2>

              <h3 style="color: #15803d;">New Booking Received!</h3>

              <p>Hello <strong>${admin.name || "Admin"}</strong>,</p>

              <p>A new parking booking has been made.</p>

              <hr />

              <h3>Customer Details</h3>

              <p><strong>Name:</strong> ${customer?.name || "User"}</p>
              <p><strong>Email:</strong> ${customer?.email || "Not available"}</p>

              <hr />

              <h3>Booking Details</h3>

              <p><strong>Booking ID:</strong> ${booking._id}</p>
              <p><strong>Parking Slot:</strong> ${booking.slotId}</p>
              <p><strong>Vehicle Type:</strong> ${booking.vehicleType}</p>
              <p><strong>Duration:</strong> ${booking.durationHours} Hours</p>
              <p><strong>Price Per Hour:</strong> ₹${booking.pricePerHour}</p>
              <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
              <p><strong>Status:</strong> ${booking.status}</p>

              <hr />

              <p>Please check your SmartPark Admin Dashboard.</p>

              <strong>SmartPark Team</strong>

            </div>

          </div>
        `,
      });
    })
  );

  const failed = results.filter(
    (result) => result.status === "rejected"
  );

  if (failed.length > 0) {
    throw new Error(
      `${failed.length} admin notification email(s) failed.`
    );
  }

  return true;
}

// ==========================================
// GET ALL PARKING SLOTS
// ==========================================

router.get("/slots", async (req, res) => {
  try {
    const slots = await ParkingSlot.find();

    res.status(200).json({
      success: true,
      total: slots.length,
      slots,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// INITIALIZE PARKING SLOTS
// ==========================================

router.post("/initialize", async (req, res) => {
  try {
    const demoSlots = [
      ...["C01", "C02", "C03", "C04"].map((slotId) => ({
        slotId,
        vehicleType: "Car",
        pricePerHour: 50,
      })),

      ...["B01", "B02", "B03", "B04"].map((slotId) => ({
        slotId,
        vehicleType: "Bike",
        pricePerHour: 20,
      })),

      ...["BUS01", "BUS02", "BUS03"].map((slotId) => ({
        slotId,
        vehicleType: "Bus",
        pricePerHour: 100,
      })),

      ...["EV01", "EV02", "EV03"].map((slotId) => ({
        slotId,
        vehicleType: "EV",
        pricePerHour: 70,
      })),
    ];

    const operations = demoSlots.map((slot) => ({
      updateOne: {
        filter: { slotId: slot.slotId },
        update: { $setOnInsert: slot },
        upsert: true,
      },
    }));

    await ParkingSlot.bulkWrite(operations);

    res.status(201).json({
      success: true,
      message: "Parking slots initialized successfully!",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// BOOK A PARKING SLOT
// ==========================================

router.post("/slots/:slotId/book", async (req, res) => {
  let reservedSlot = null;

  try {
    const { vehicleType, durationHours } = req.body;
    const hours = Number(durationHours);

    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return res.status(400).json({
        success: false,
        message: "Duration must be between 1 and 24 hours.",
      });
    }

    // FIND AVAILABLE SLOT
    const availableSlot = await ParkingSlot.findOne({
      slotId: req.params.slotId,
      vehicleType,
      status: "Available",
    });

    if (!availableSlot) {
      return res.status(409).json({
        success: false,
        message: "Slot unavailable or already booked.",
      });
    }

    const totalAmount = availableSlot.pricePerHour * hours;

    // RESERVE SLOT ATOMICALLY
    reservedSlot = await ParkingSlot.findOneAndUpdate(
      {
        slotId: req.params.slotId,
        vehicleType,
        status: "Available",
      },
      {
        $set: {
          status: "Reserved",
          bookedBy: req.user.userId,
          bookedAt: new Date(),
          durationHours: hours,
          totalAmount,
        },
      },
      { new: true }
    );

    if (!reservedSlot) {
      return res.status(409).json({
        success: false,
        message: "Slot was just booked by another user.",
      });
    }

    // CREATE PERMANENT BOOKING HISTORY
    const booking = await Booking.create({
      user: req.user.userId,
      parkingSlot: reservedSlot._id,
      slotId: reservedSlot.slotId,
      vehicleType: reservedSlot.vehicleType,
      bookingDate: reservedSlot.bookedAt,
      durationHours: hours,
      pricePerHour: reservedSlot.pricePerHour,
      totalAmount,
      status: "Reserved",
    });

    // FETCH CUSTOMER DETAILS
    const customer = await User.findById(req.user.userId)
      .select("name email");

    // SEND USER CONFIRMATION EMAIL
    let emailSent = false;

    try {
      await sendBookingConfirmationEmail(req.user, booking);
      emailSent = true;

      console.log("Booking confirmation email sent:", req.user.email);

    } catch (emailError) {
      console.error(
        "Booking confirmation email failed:",
        emailError.message
      );
    }

    // SEND ADMIN NOTIFICATION EMAIL
    let adminEmailSent = false;

    try {
      await sendAdminBookingNotification(booking, customer);
      adminEmailSent = true;

      console.log("Admin booking notification sent successfully.");

    } catch (adminEmailError) {
      console.error(
        "Admin notification failed:",
        adminEmailError.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Parking slot booked successfully!",

      emailSent,
      adminEmailSent,

      emailMessage: emailSent
        ? "Booking confirmation email sent successfully."
        : "Booking successful, but user confirmation email could not be sent.",

      adminEmailMessage: adminEmailSent
        ? "Admin notification email sent successfully."
        : "Booking successful, but admin notification email could not be sent.",

      slot: reservedSlot,
      booking,

      bill: {
        pricePerHour: reservedSlot.pricePerHour,
        durationHours: hours,
        totalAmount,
      },
    });

  } catch (error) {
    console.error("Booking error:", error);

    // ROLL BACK SLOT IF BOOKING HISTORY COULD NOT BE SAVED
    if (reservedSlot) {
      await ParkingSlot.findOneAndUpdate(
        {
          _id: reservedSlot._id,
          status: "Reserved",
          bookedBy: req.user.userId,
        },
        {
          $set: {
            status: "Available",
            bookedBy: null,
            bookedAt: null,
            durationHours: 0,
            totalAmount: 0,
          },
        }
      ).catch((rollbackError) => {
        console.error("Booking rollback error:", rollbackError);
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to complete booking.",
    });
  }
});

// ==========================================
// GET ALL BOOKINGS OF LOGGED-IN USER
// ==========================================

router.get("/my-bookings", async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    // GENERATE QR TOKEN FOR OLD BOOKINGS
    for (const booking of bookings) {
      if (!booking.qrToken) {
        booking.qrToken = crypto.randomBytes(32).toString("hex");
        await booking.save();
      }
    }

    res.status(200).json({
      success: true,
      total: bookings.length,
      bookings,
    });

  } catch (error) {
    console.error("My Bookings Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch bookings.",
    });
  }
});

// ==========================================
// CANCEL A RESERVED BOOKING
// ==========================================

router.patch("/slots/:slotId/cancel", async (req, res) => {
  try {
    // FIND USER'S RESERVED SLOT
    const slot = await ParkingSlot.findOne({
      slotId: req.params.slotId,
      bookedBy: req.user.userId,
      status: "Reserved",
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Your reserved booking was not found.",
      });
    }

    // UPDATE PERMANENT HISTORY FIRST
    const booking = await Booking.findOneAndUpdate(
      {
        parkingSlot: slot._id,
        user: req.user.userId,
        status: "Reserved",
      },
      {
        $set: { status: "Cancelled" },
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking history record was not found.",
      });
    }

    // RELEASE THE PARKING SLOT
    const updatedSlot = await ParkingSlot.findOneAndUpdate(
      {
        _id: slot._id,
        bookedBy: req.user.userId,
        status: "Reserved",
      },
      {
        $set: {
          status: "Available",
          bookedBy: null,
          bookedAt: null,
          durationHours: 0,
          totalAmount: 0,
        },
      },
      { new: true }
    );

    if (!updatedSlot) {
      // RESTORE BOOKING STATUS IF SLOT RELEASE FAILED
      await Booking.findByIdAndUpdate(booking._id, {
        $set: { status: "Reserved" },
      });

      return res.status(409).json({
        success: false,
        message: "Unable to release the parking slot.",
      });
    }

    // SEND CANCELLATION EMAIL
    let emailSent = false;

    try {
      await sendCancellationEmail(req.user, booking);
      emailSent = true;

      console.log("Cancellation email sent:", req.user.email);

    } catch (emailError) {
      console.error(
        "Cancellation email failed:",
        emailError.message
      );
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully!",

      emailSent,

      emailMessage: emailSent
        ? "Cancellation email sent successfully."
        : "Booking cancelled, but cancellation email could not be sent.",

      slot: updatedSlot,
      booking,
    });

  } catch (error) {
    console.error("Cancellation error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
