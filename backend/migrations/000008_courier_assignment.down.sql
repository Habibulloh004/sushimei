DROP INDEX IF EXISTS idx_orders_assigned_courier_status;

ALTER TABLE orders
    DROP COLUMN IF EXISTS delivered_at,
    DROP COLUMN IF EXISTS dispatched_at,
    DROP COLUMN IF EXISTS assigned_at,
    DROP COLUMN IF EXISTS delivery_longitude,
    DROP COLUMN IF EXISTS delivery_latitude,
    DROP COLUMN IF EXISTS assigned_courier_id;
