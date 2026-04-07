DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promo_reward_type') THEN
        CREATE TYPE promo_reward_type AS ENUM ('DISCOUNT', 'BONUS_POINTS', 'BONUS_PRODUCT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promo_applies_to') THEN
        CREATE TYPE promo_applies_to AS ENUM ('ORDER', 'PRODUCT');
    END IF;
END $$;

ALTER TABLE promo_codes
    ADD COLUMN IF NOT EXISTS reward_type promo_reward_type NOT NULL DEFAULT 'DISCOUNT',
    ADD COLUMN IF NOT EXISTS applies_to promo_applies_to NOT NULL DEFAULT 'ORDER',
    ADD COLUMN IF NOT EXISTS bonus_points INT,
    ADD COLUMN IF NOT EXISTS bonus_product_id UUID REFERENCES products(id),
    ADD COLUMN IF NOT EXISTS bonus_product_quantity INT NOT NULL DEFAULT 1;

UPDATE promo_codes
SET reward_type = 'DISCOUNT',
    applies_to = 'ORDER'
WHERE reward_type IS NULL
   OR applies_to IS NULL;

ALTER TABLE promo_codes
    DROP CONSTRAINT IF EXISTS chk_promo_codes_bonus_product_quantity;

ALTER TABLE promo_codes
    ADD CONSTRAINT chk_promo_codes_bonus_product_quantity
    CHECK (bonus_product_quantity > 0);
