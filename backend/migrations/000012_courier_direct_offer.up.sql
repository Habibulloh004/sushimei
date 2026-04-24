ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS offered_courier_id UUID REFERENCES employees(id),
    ADD COLUMN IF NOT EXISTS courier_offer_status VARCHAR(16) NOT NULL DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS courier_offer_decline_reason TEXT,
    ADD COLUMN IF NOT EXISTS courier_offered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS courier_offer_responded_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_courier_offer_status_check'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_courier_offer_status_check
            CHECK (courier_offer_status IN ('NONE', 'PENDING', 'ACCEPTED', 'DECLINED'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_offered_courier_status
    ON orders(offered_courier_id, courier_offer_status)
    WHERE offered_courier_id IS NOT NULL;
