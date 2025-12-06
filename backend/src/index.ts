import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import morgan from "morgan";
import pool from "./config/database";
import authRoutes from "./routes/authRoutes";
import logRoutes from "./routes/logRoutes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Middleware
 */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // Request logging

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
app.get("/", (req, res) => {
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
app.get("/health", async (req, res) => {
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
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);

    if (err.name === "MulterError") {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File is too large" });
      }
      return res.status(400).json({ error: err.message });
    }

    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  }
);

/**
 * 404 handler
 */
app.use((req, res) => {
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
