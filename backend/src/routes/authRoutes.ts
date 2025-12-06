import { Router } from "express";
import { login, register, verifyToken } from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * Authentication Routes
 */

// POST /api/auth/login - User login
router.post("/login", login);

// POST /api/auth/register - User registration
router.post("/register", register);

// GET /api/auth/verify - Verify JWT token
router.get("/verify", authenticateToken, verifyToken);

export default router;
