import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

const password = await bcrypt.hash("Cafe12345", 12);
const owner = await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES ('Cafe Owner','owner@cafe.local',$1,'OWNER') ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id", [password]);
await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES ('Counter Cashier','cashier@cafe.local',$1,'CASHIER') ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash", [password]);
const categories = ["Coffee", "Tea", "Cold Drinks", "Snacks"];
for (let i = 0; i < categories.length; i++) await pool.query("INSERT INTO categories(name,sort_order) VALUES($1,$2) ON CONFLICT(name) DO NOTHING", [categories[i], i]);
const catRows = await pool.query<{ id: string; name: string }>("SELECT id,name FROM categories"); const cat = Object.fromEntries(catRows.rows.map(x => [x.name, x.id]));
const menu = [["Espresso","Coffee",12000],["Cappuccino","Coffee",18000],["Masala Chai","Tea",6000],["Iced Latte","Cold Drinks",20000],["Veg Sandwich","Snacks",14000]] as const;
for (const [name, category, price] of menu) await pool.query("INSERT INTO menu_items(name,category_id,price_paise,tax_rate_bps) VALUES($1,$2,$3,500) ON CONFLICT DO NOTHING", [name,cat[category],price]);
await pool.end(); console.log("Seed complete. Login: owner@cafe.local / Cafe12345");
