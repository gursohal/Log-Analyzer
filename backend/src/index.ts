import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import pool from "./config/database";
import { apiLimiter } from "./middleware/security";
import authRoutes from "./routes/authRoutes";
import logRoutes from "./routes/logRoutes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Security Middleware
 */
app.use(helmet()); // Security headers

/**
 * CORS Configuration
 */
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * Request Logging
 */
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined")); // Detailed logging for production
} else {
  app.use(morgan("dev")); // Concise logging for development
}

/**
 * Rate Limiting
 */
app.use("/api/", apiLimiter);

/**
 * Ensure uploads directory exists
 */
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Routes
 */
app.get("/", (_req, res) => {
  res.json({
    message: "Claude Log Analyzer API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      logs: "/api/logs",
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);

/**
 * Health check endpoint
 */
app.get("/health", async (_req, res) => {
  try {
    // Check database connection
    await pool.query("SELECT 1");
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
});

/**
 * Error handling middleware
 */
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ): void => {
    console.error("Error:", err);

    // Handle Multer errors
    if (err.name === "MulterError") {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "File is too large" });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }

    // Handle CORS errors
    if (err.message === "Not allowed by CORS") {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    // Sanitize error messages in production
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error";

    res.status(err.status || 500).json({ error: message });
  }
);

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  pool.end(() => {
    console.log("Database pool has ended");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  pool.end(() => {
    console.log("Database pool has ended");
    process.exit(0);
  });
});
