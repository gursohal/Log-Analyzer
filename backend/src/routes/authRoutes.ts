import { Router } from "express";
import { login, register, verifyToken } from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";
import {
  authLimiter,
  handleValidationErrors,
  validateLogin,
  validateRegistration,
} from "../middleware/security";

const router = Router();

// POST /api/auth/login - User login (with rate limiting and validation)
router.post(
  "/login",
  authLimiter,
  validateLogin,
  handleValidationErrors,
  login
);

// POST /api/auth/register - User registration (with validation)
router.post(
  "/register",
  validateRegistration,
  handleValidationErrors,
  register
);

// GET /api/auth/verify - Verify JWT token
router.get("/verify", authenticateToken, verifyToken);

export default router;
