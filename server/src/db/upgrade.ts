import "dotenv/config";
import { pool } from "./pool.js";

await pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile TEXT UNIQUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_verified_at TIMESTAMPTZ;
  UPDATE users SET is_active=true WHERE is_active IS NULL;
  UPDATE users SET email_verified_at=now() WHERE email_verified_at IS NULL;
`);
await pool.end();
console.log("Account fields upgraded.");
