import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
const router = Router();
const schema = z.object({ name: z.string().trim().min(1).max(80), sortOrder: z.number().int().min(0).default(0) });
router.use(requireAuth);
router.get("/", async (_req, res, next) => { try { const r = await pool.query("SELECT id, name, sort_order AS \"sortOrder\" FROM categories ORDER BY sort_order, name"); res.json(r.rows); } catch (e) { next(e); } });
router.post("/", requireRole("OWNER"), async (req, res, next) => { try { const x = schema.parse(req.body); const r = await pool.query("INSERT INTO categories(name, sort_order) VALUES ($1,$2) RETURNING id,name,sort_order AS \"sortOrder\"", [x.name, x.sortOrder]); res.status(201).json(r.rows[0]); } catch (e) { next(e); } });
router.delete("/:id", requireRole("OWNER"), async (req, res, next) => { try { const r = await pool.query("DELETE FROM categories WHERE id=$1 RETURNING id", [req.params.id]); if (!r.rowCount) return res.status(404).json({ error: "Category not found" }); res.status(204).end(); } catch (e) { next(e); } });
export default router;

