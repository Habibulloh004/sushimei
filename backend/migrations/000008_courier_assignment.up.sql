ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS assigned_courier_id UUID REFERENCES employees(id),
    ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier_status
    ON orders(assigned_courier_id, status)
    WHERE assigned_courier_id IS NOT NULL;
