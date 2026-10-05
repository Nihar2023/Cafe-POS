import { Router } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { pool } from "../db/pool.js";

const uploadDir = join(process.cwd(), "uploads");
mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({ destination: uploadDir, filename: (_req, file, done) => done(null, `${randomUUID()}${file.originalname.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ""}`) });
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_req, file, done) => done(null, file.mimetype.startsWith("image/")) });
const router = Router();
router.post("/menu-image", requireAuth, requireRole("OWNER"), upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose an image smaller than 2 MB" });
  res.status(201).json({ imageUrl: `/uploads/${req.file.filename}` });
});
router.post("/avatar", requireAuth, requireRole("OWNER"), upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose an image smaller than 2 MB" });
    const userId = String(req.body.userId ?? req.user!.id);
    const target = await pool.query("SELECT id,role FROM users WHERE id=$1", [userId]);
    if (!target.rowCount || (target.rows[0].role !== "CASHIER" && userId !== req.user!.id)) return res.status(404).json({ error: "Account not found" });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const updated = await pool.query(`UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id,name,email,mobile,avatar_url AS "avatarUrl",role,is_active AS "isActive",created_at AS "createdAt"`, [avatarUrl, userId]);
    res.status(201).json(updated.rows[0]);
  } catch (error) { next(error); }
});
export default router;
