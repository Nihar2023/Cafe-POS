import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser, Role } from "../types.js";
import { pool } from "../db/pool.js";

declare global { namespace Express { interface Request { user?: AuthUser } } }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try { const tokenUser = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser; const result = await pool.query("SELECT id,name,email,mobile,avatar_url,role,is_active FROM users WHERE id=$1", [tokenUser.id]); const row = result.rows[0]; if (!row || !row.is_active) return res.status(403).json({ error: "This account is blocked or unavailable" }); req.user = { id: row.id, name: row.name, email: row.email, mobile: row.mobile, avatarUrl: row.avatar_url, role: row.role, isActive: row.is_active }; next(); }
  catch { return res.status(401).json({ error: "Invalid or expired session" }); }
}
export function requireRole(...roles: Role[]) { return (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "You do not have permission for this action" });
  next();
}; }

