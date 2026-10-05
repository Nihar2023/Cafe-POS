import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import pg from "pg";
// Workspace scripts run from /server, while the shared secret file lives at the project root.
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
