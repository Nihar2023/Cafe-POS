import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthUser } from "../types.js";

const router = Router();
const credentials = z.object({ identifier: z.string().trim().min(3).max(160), password: z.string().min(8) });
const signup = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), mobile: z.string().trim().min(8).max(20), password: z.string().min(8) });
const safeUser = (row: any): AuthUser => ({ id: row.id, name: row.name, email: row.email, mobile: row.mobile, avatarUrl: row.avatar_url, role: row.role, isActive: row.is_active });
const tokenFor = (user: AuthUser) => jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: "12h" });

router.get("/signup-available", async (_req, res, next) => {
  try {
    const existingOwner = await pool.query("SELECT id FROM users WHERE role='OWNER' LIMIT 1");
    res.json({ available: !existingOwner.rowCount });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => { try {
  const input = credentials.parse(req.body);
  const result = await pool.query(
    "SELECT * FROM users WHERE mobile=$1 OR lower(email)=lower($1) ORDER BY CASE WHEN role='OWNER' THEN 0 ELSE 1 END LIMIT 1",
    [input.identifier.trim()]
  );
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(input.password, row.password_hash))) return res.status(401).json({ error: "Incorrect email/mobile number or password" });
  if (!row.is_active) return res.status(403).json({ error: "This account has been blocked. Please contact the cafe owner." });
  const user = safeUser(row); res.json({ token: tokenFor(user), user });
} catch (error) { next(error); } });

router.post("/signup/owner", async (req, res, next) => { try {
  const input = signup.parse(req.body); const existingOwner = await pool.query("SELECT id FROM users WHERE role='OWNER' LIMIT 1");
  if (existingOwner.rowCount) return res.status(409).json({ error: "This cafe already has an owner account." });
  const hash = await bcrypt.hash(input.password, 12);
  const created = await pool.query("INSERT INTO users(name,email,mobile,password_hash,role,is_active,email_verified_at,mobile_verified_at) VALUES($1,$2,$3,$4,'OWNER',true,now(),now()) RETURNING *", [input.name, input.email.toLowerCase(), input.mobile, hash]);
  const user = safeUser(created.rows[0]); res.status(201).json({ token: tokenFor(user), user });
} catch (error) { next(error); } });

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
export default router;
