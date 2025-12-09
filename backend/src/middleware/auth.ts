import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWTPayload } from "../types";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Authentication middleware with improved security
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;

    // Enforce JWT_SECRET in production
    if (!secret || secret === "your-secret-key") {
      console.error("CRITICAL: JWT_SECRET not configured properly!");
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "Server configuration error" });
        return;
      }
    }

    const decoded = jwt.verify(
      token,
      secret || "fallback-secret"
    ) as JWTPayload;

    // Additional validation
    if (!decoded.userId || !decoded.email) {
      res.status(403).json({ error: "Invalid token payload" });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired" });
      return;
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }
    res.status(403).json({ error: "Authentication failed" });
    return;
  }
};
