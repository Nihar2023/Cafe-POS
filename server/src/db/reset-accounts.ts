import "dotenv/config";
import { pool } from "./pool.js";

// Preserve menu and paid-bill history, but make every existing login unusable and free their email/mobile values for a fresh setup.
await pool.query("UPDATE users SET email='reset-' || id::text || '@invalid.local', mobile=NULL, avatar_url=NULL, is_active=false, role='CASHIER'");
await pool.end();
console.log("All existing logins were reset. Create a new owner account from the sign-up screen.");
