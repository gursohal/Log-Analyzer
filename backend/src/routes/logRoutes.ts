import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import {
  getAnalysis,
  getUserLogs,
  uploadLog,
} from "../controllers/logController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * Configure Multer for file uploads
 */
const uploadDir = process.env.UPLOAD_DIR || "./uploads";

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept log files, txt files, and other common formats
  const allowedExtensions = [".log", ".txt", ".csv"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only .log, .txt, and .csv files are allowed."
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB default
  },
});

/**
 * Log Routes
 */

// POST /api/logs/upload - Upload and analyze log file
router.post("/upload", authenticateToken, upload.single("logFile"), uploadLog);

// GET /api/logs/:fileId/analysis - Get analysis results
router.get("/:fileId/analysis", authenticateToken, getAnalysis);

// GET /api/logs - Get user's log files
router.get("/", authenticateToken, getUserLogs);

export default router;
