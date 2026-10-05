import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router(); router.use(requireAuth);
const ownerProfile = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), mobile: z.string().trim().min(8).max(20) });
const cashierCreate = z.object({ name: z.string().trim().min(2).max(100), mobile: z.string().trim().min(8).max(20), password: z.string().min(8).max(100) });
const cashierUpdate = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: z.string().trim().min(8).max(20),
  password: z.preprocess((value) => (typeof value === "string" && !value.trim() ? undefined : value), z.string().min(8).max(100).optional()),
});
const selected = `id,name,email,mobile,avatar_url AS "avatarUrl",role,is_active AS "isActive",created_at AS "createdAt"`;

router.get("/profile", requireRole("OWNER"), async (req, res, next) => { try { const result = await pool.query(`SELECT ${selected} FROM users WHERE id=$1`, [req.user!.id]); res.json(result.rows[0]); } catch (error) { next(error); } });
router.put("/profile", requireRole("OWNER"), async (req, res, next) => { try { const input = ownerProfile.parse(req.body); const result = await pool.query(`UPDATE users SET name=$1,email=$2,mobile=$3 WHERE id=$4 RETURNING ${selected}`, [input.name, input.email.toLowerCase(), input.mobile, req.user!.id]); res.json(result.rows[0]); } catch (error) { next(error); } });
router.post("/profile/password", requireRole("OWNER"), async (req, res, next) => { try { const input = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(8).max(100) }).parse(req.body); const current = await pool.query("SELECT password_hash FROM users WHERE id=$1", [req.user!.id]); if (!(await bcrypt.compare(input.currentPassword, current.rows[0].password_hash))) return res.status(400).json({ error: "Current password is incorrect" }); await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [await bcrypt.hash(input.newPassword, 12), req.user!.id]); res.status(204).end(); } catch (error) { next(error); } });

router.get("/cashiers", requireRole("OWNER"), async (_req, res, next) => { try { const result = await pool.query(`SELECT ${selected} FROM users WHERE role='CASHIER' ORDER BY created_at DESC`); res.json(result.rows); } catch (error) { next(error); } });
router.post("/cashiers", requireRole("OWNER"), async (req, res, next) => { try { const input = cashierCreate.parse(req.body); const internalEmail = `cashier-${randomUUID()}@internal.cafe.local`; const result = await pool.query(`INSERT INTO users(name,email,mobile,password_hash,role,is_active) VALUES($1,$2,$3,$4,'CASHIER',true) RETURNING ${selected}`, [input.name, internalEmail, input.mobile, await bcrypt.hash(input.password, 12)]); res.status(201).json(result.rows[0]); } catch (error) { next(error); } });
router.put("/cashiers/:id", requireRole("OWNER"), async (req, res, next) => { try { const input = cashierUpdate.parse(req.body); const values: unknown[] = [input.name, input.mobile]; let update = "name=$1,mobile=$2"; if (input.password) { values.push(await bcrypt.hash(input.password, 12)); update += `,password_hash=$${values.length}`; } values.push(req.params.id); const result = await pool.query(`UPDATE users SET ${update} WHERE id=$${values.length} AND role='CASHIER' RETURNING ${selected}`, values); if (!result.rowCount) return res.status(404).json({ error: "Cashier not found" }); res.json(result.rows[0]); } catch (error) { next(error); } });
router.delete("/cashiers/:id", requireRole("OWNER"), async (req, res, next) => { try { const result = await pool.query("DELETE FROM users WHERE id=$1 AND role='CASHIER' RETURNING id", [req.params.id]); if (!result.rowCount) return res.status(404).json({ error: "Cashier not found or has bill history" }); res.status(204).end(); } catch (error) { if ((error as { code?:string }).code === "23503") return res.status(409).json({ error: "This cashier has bill history and cannot be deleted. Block the account instead." }); next(error); } });
router.patch("/cashiers/:id/status", requireRole("OWNER"), async (req, res, next) => { try { const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body); const result = await pool.query(`UPDATE users SET is_active=$1 WHERE id=$2 AND role='CASHIER' RETURNING ${selected}`, [isActive, req.params.id]); if (!result.rowCount) return res.status(404).json({ error: "Cashier not found" }); res.json(result.rows[0]); } catch (error) { next(error); } });
router.post("/cashiers/:id/password", requireRole("OWNER"), async (req, res, next) => {
  try {
    const { password } = z.object({ password: z.string().min(8).max(100) }).parse(req.body);
    const result = await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2 AND role='CASHIER' RETURNING id", [await bcrypt.hash(password, 12), req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Cashier not found" });
    res.status(204).end();
  } catch (error) { next(error); }
});
export default router;
