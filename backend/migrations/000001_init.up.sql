CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM ('ACTIVE', 'BLOCKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
        CREATE TYPE order_type AS ENUM ('DELIVERY', 'PICKUP', 'WALK_IN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
        CREATE TYPE payment_type AS ENUM ('CARD', 'CASH');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
        CREATE TYPE employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
        CREATE TYPE discount_type AS ENUM ('FIXED', 'PERCENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bonus_txn_type') THEN
        CREATE TYPE bonus_txn_type AS ENUM ('EARN', 'SPEND', 'ADJUSTMENT', 'EXPIRE', 'REFUND');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    phone VARCHAR(32),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tashkent',
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(128),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimum_order NUMERIC(12,2) NOT NULL DEFAULT 0,
    pickup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS spot_operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID NOT NULL REFERENCES spots(id),
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    opens_at TIME,
    closes_at TIME,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (spot_id, weekday)
);

CREATE TABLE IF NOT EXISTS spot_delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID NOT NULL REFERENCES spots(id),
    name VARCHAR(128) NOT NULL,
    zone_geojson JSONB NOT NULL,
    extra_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_eta_minutes INT,
    max_eta_minutes INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(32) NOT NULL UNIQUE,
    first_name VARCHAR(128),
    last_name VARCHAR(128),
    email CITEXT,
    status customer_status NOT NULL DEFAULT 'ACTIVE',
    language_code VARCHAR(8) NOT NULL DEFAULT 'en',
    bonus_balance INT NOT NULL DEFAULT 0,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customers_status_created_at ON customers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_phone_pattern ON customers USING btree (phone text_pattern_ops);

CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    label VARCHAR(64),
    city VARCHAR(128),
    street VARCHAR(255),
    house VARCHAR(64),
    entrance VARCHAR(32),
    floor VARCHAR(32),
    apartment VARCHAR(32),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    delivery_notes TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id),
    slug VARCHAR(128) NOT NULL UNIQUE,
    name_i18n JSONB NOT NULL,
    description_i18n JSONB,
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON categories(parent_id, sort_order);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id),
    sku VARCHAR(64) UNIQUE,
    slug VARCHAR(128) UNIQUE,
    name_i18n JSONB NOT NULL,
    description_i18n JSONB,
    base_price NUMERIC(12,2) NOT NULL,
    image_url TEXT,
    gallery JSONB,
    tags TEXT[] DEFAULT '{}',
    is_spicy BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
    is_halal BOOLEAN NOT NULL DEFAULT TRUE,
    allergens TEXT[] DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_search_name ON products USING GIN (name_i18n);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    name_i18n JSONB NOT NULL,
    sku VARCHAR(64),
    price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_i18n JSONB NOT NULL,
    min_select INT NOT NULL DEFAULT 0,
    max_select INT NOT NULL DEFAULT 1,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES modifier_groups(id),
    name_i18n JSONB NOT NULL,
    price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_modifier_groups (
    product_id UUID NOT NULL REFERENCES products(id),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id),
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, modifier_group_id)
);

CREATE TABLE IF NOT EXISTS product_availability (
    product_id UUID NOT NULL REFERENCES products(id),
    spot_id UUID NOT NULL REFERENCES spots(id),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    stock_qty INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, spot_id)
);

CREATE TABLE IF NOT EXISTS favorite_products (
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    title_i18n JSONB NOT NULL,
    description_i18n JSONB,
    discount_type discount_type NOT NULL,
    discount_value NUMERIC(12,2) NOT NULL,
    min_order_amount NUMERIC(12,2),
    max_discount_amount NUMERIC(12,2),
    total_usage_limit INT,
    per_user_usage_limit INT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS promo_code_categories (
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    PRIMARY KEY (promo_code_id, category_id)
);

CREATE TABLE IF NOT EXISTS promo_code_products (
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
    product_id UUID NOT NULL REFERENCES products(id),
    PRIMARY KEY (promo_code_id, product_id)
);

CREATE TABLE IF NOT EXISTS promo_code_spots (
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
    spot_id UUID NOT NULL REFERENCES spots(id),
    PRIMARY KEY (promo_code_id, spot_id)
);

CREATE TABLE IF NOT EXISTS promo_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID,
    discount_amount NUMERIC(12,2) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_usages_code_customer ON promo_usages(promo_code_id, customer_id);

CREATE TABLE IF NOT EXISTS bonus_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    earn_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    spend_rate NUMERIC(12,2) NOT NULL DEFAULT 1,
    min_order_to_earn NUMERIC(12,2) NOT NULL DEFAULT 0,
    max_spend_percent NUMERIC(5,2) NOT NULL DEFAULT 100,
    expires_in_days INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bonus_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID,
    txn_type bonus_txn_type NOT NULL,
    points INT NOT NULL,
    balance_after INT NOT NULL,
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonus_ledger_customer_created ON bonus_ledger(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS roles (
    code VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    code VARCHAR(128) PRIMARY KEY,
    module VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_code VARCHAR(64) NOT NULL REFERENCES roles(code),
    permission_code VARCHAR(128) NOT NULL REFERENCES permissions(code),
    PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(64) NOT NULL REFERENCES roles(code),
    spot_id UUID REFERENCES spots(id),
    email CITEXT NOT NULL UNIQUE,
    phone VARCHAR(32) UNIQUE,
    first_name VARCHAR(128),
    last_name VARCHAR(128),
    password_hash TEXT NOT NULL,
    status employee_status NOT NULL DEFAULT 'ACTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employees_role_spot ON employees(role_code, spot_id);

CREATE TABLE IF NOT EXISTS employee_spots (
    employee_id UUID NOT NULL REFERENCES employees(id),
    spot_id UUID NOT NULL REFERENCES spots(id),
    PRIMARY KEY (employee_id, spot_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_code VARCHAR(64) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_role ON refresh_tokens(user_id, role_code, expires_at DESC);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    spot_id UUID NOT NULL REFERENCES spots(id),
    status order_status NOT NULL DEFAULT 'RECEIVED',
    order_type order_type NOT NULL,
    payment_type payment_type NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(32),
    delivery_address JSONB,
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    promo_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    bonus_spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    service_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    promo_code_id UUID REFERENCES promo_codes(id),
    bonus_earned_points INT NOT NULL DEFAULT 0,
    notes TEXT,
    cancellation_reason TEXT,
    rejected_reason TEXT,
    created_by_employee_id UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_spot_created ON orders(spot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type_created ON orders(payment_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_type_created ON orders(order_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    product_variant_id UUID REFERENCES product_variants(id),
    product_name_snapshot JSONB NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    quantity INT NOT NULL,
    line_total NUMERIC(12,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    modifier_option_id UUID REFERENCES modifier_options(id),
    modifier_name_snapshot JSONB NOT NULL,
    price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_type payment_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    provider VARCHAR(64),
    provider_txn_id VARCHAR(128),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_status_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    status order_status NOT NULL,
    changed_by UUID,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_timeline_order_created ON order_status_timeline(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, customer_id)
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(16) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    subject_template TEXT,
    body_template_i18n JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    channel VARCHAR(16) NOT NULL,
    template_id UUID REFERENCES notification_templates(id),
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES notification_campaigns(id),
    customer_id UUID REFERENCES customers(id),
    channel VARCHAR(16) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    provider_message_id VARCHAR(128),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role VARCHAR(64),
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at DESC);

INSERT INTO roles (code, title) VALUES
('SUPER_ADMIN', 'Super Admin'),
('ADMIN', 'Admin'),
('MANAGER', 'Manager'),
('CASHIER', 'Cashier'),
('KITCHEN', 'Kitchen'),
('COURIER', 'Courier'),
('SPOT_OPERATOR', 'Spot Operator'),
('CUSTOMER', 'Customer')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, module, title) VALUES
('dashboard.read', 'dashboard', 'Read dashboard KPIs'),
('customers.read', 'customers', 'Read customer profiles'),
('customers.bonus.write', 'customers', 'Adjust customer bonus'),
('promos.read', 'promos', 'Read promo list'),
('promos.write', 'promos', 'Manage promo rules'),
('menu.read', 'menu', 'Read menu entities'),
('menu.write', 'menu', 'Manage menu entities'),
('spots.read', 'spots', 'Read spots'),
('spots.write', 'spots', 'Manage spots'),
('orders.read', 'orders', 'Read orders'),
('orders.write', 'orders', 'Manage order statuses'),
('employees.read', 'employees', 'Read employees'),
('employees.write', 'employees', 'Manage employees'),
('reports.read', 'reports', 'Read analytics'),
('settings.write', 'settings', 'Manage system settings'),
('customer.profile.read', 'customer', 'Read own profile'),
('customer.order.write', 'customer', 'Create own order')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code)
SELECT 'ADMIN', code FROM permissions WHERE code NOT IN ('customer.profile.read', 'customer.order.write')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
('MANAGER', 'dashboard.read'),
('MANAGER', 'orders.read'),
('MANAGER', 'orders.write'),
('MANAGER', 'menu.read'),
('MANAGER', 'reports.read'),
('CASHIER', 'orders.read'),
('CASHIER', 'orders.write'),
('KITCHEN', 'orders.read'),
('KITCHEN', 'orders.write'),
('COURIER', 'orders.read'),
('COURIER', 'orders.write'),
('SPOT_OPERATOR', 'orders.read'),
('SPOT_OPERATOR', 'orders.write'),
('SPOT_OPERATOR', 'menu.read'),
('CUSTOMER', 'customer.profile.read'),
('CUSTOMER', 'customer.order.write')
ON CONFLICT DO NOTHING;
