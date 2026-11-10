
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
require("dotenv").config();

const { verifyMailer } = require("./config/mailer");

// Import Routes
const parkingRoutes = require("./routes/parkingRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Import Middleware
const protect = require("./middleware/authMiddleware");
const adminOnly = require("./middleware/adminMiddleware");

const app = express();

// Trust proxy: configure appropriately when deployed behind a trusted proxy
// app.set("trust proxy", 1);

// SECURITY MIDDLEWARE
app.use(helmet());

// CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// BODY PARSING
app.use(express.json({ limit: "10kb" }));

// REQUEST LOGGING (development only)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(
      `${new Date().toISOString()} | ${req.method} ${req.originalUrl}`
    );
    next();
  });
}

// API ROUTES
app.use("/api/parking", protect, parkingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", protect, adminOnly, adminRoutes);

// HOME API
app.get("/", (req, res) => {
  res.send("SmartPark Backend is Running!");
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// CENTRAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Server Error:", {
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    time: new Date().toISOString(),
  });

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Access denied by CORS policy.",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large.",
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

// START SERVER
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected Successfully!");

    verifyMailer();

    app.listen(PORT, () => {
      console.log(`SmartPark Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Server Startup Error:", error.message);
    process.exit(1);
  }
}

startServer();

// HANDLE UNEXPECTED ERRORS
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
