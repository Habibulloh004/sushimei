DROP INDEX IF EXISTS idx_orders_offered_courier_status;

ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_courier_offer_status_check,
    DROP COLUMN IF EXISTS courier_offer_responded_at,
    DROP COLUMN IF EXISTS courier_offered_at,
    DROP COLUMN IF EXISTS courier_offer_decline_reason,
    DROP COLUMN IF EXISTS courier_offer_status,
    DROP COLUMN IF EXISTS offered_courier_id;
