import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { query } from "../config/database";

/**
 * Authentication Controller
 * Handles user login and authentication
 */

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Find user
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || "your-secret-key";

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions
    );

    // Return user data and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, passwordHash, name]
    );

    const user = result.rows[0];

    // Generate JWT token
    const secret = process.env.JWT_SECRET || "your-secret-key";

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Token is already verified by authenticateToken middleware
    // Just return user info
    const authReq = req as any;
    if (authReq.user) {
      const result = await query(
        "SELECT id, email, name FROM users WHERE id = $1",
        [authReq.user.userId]
      );

      if (result.rows.length > 0) {
        res.json({ user: result.rows[0] });
        return;
      }
    }

    res.status(401).json({ error: "Invalid token" });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
