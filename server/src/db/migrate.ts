import "dotenv/config";
import { readFile } from "node:fs/promises";
import { pool } from "./pool.js";

const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
await pool.query(sql);
await pool.end();
console.log("Database migrated.");

