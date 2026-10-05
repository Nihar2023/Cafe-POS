CREATE TYPE user_role AS ENUM ('OWNER', 'CASHIER');
CREATE TYPE payment_method AS ENUM ('CASH', 'ONLINE');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE, avatar_url TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ, mobile_verified_at TIMESTAMPTZ,
  password_hash TEXT NOT NULL, role user_role NOT NULL DEFAULT 'CASHIER', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL, description TEXT, price_paise INTEGER NOT NULL CHECK (price_paise >= 0), image_url TEXT,
  is_veg BOOLEAN NOT NULL DEFAULT true, is_available BOOLEAN NOT NULL DEFAULT true, tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps >= 0), archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_number BIGSERIAL UNIQUE,
  customer_name TEXT, customer_phone TEXT, customer_email TEXT,
  subtotal_paise INTEGER NOT NULL DEFAULT 0, discount_paise INTEGER NOT NULL DEFAULT 0, tax_paise INTEGER NOT NULL DEFAULT 0, total_paise INTEGER NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, menu_item_id UUID REFERENCES menu_items(id),
  item_name TEXT NOT NULL, unit_price_paise INTEGER NOT NULL, tax_rate_bps INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0), note TEXT, line_total_paise INTEGER NOT NULL
);
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id), method payment_method NOT NULL, status payment_status NOT NULL DEFAULT 'PENDING', amount_paise INTEGER NOT NULL,
  gateway_payment_id TEXT UNIQUE, gateway_qr_id TEXT UNIQUE, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
