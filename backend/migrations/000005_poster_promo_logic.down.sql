ALTER TABLE promo_codes
    DROP CONSTRAINT IF EXISTS chk_promo_codes_bonus_product_quantity;

ALTER TABLE promo_codes
    DROP COLUMN IF EXISTS bonus_product_quantity,
    DROP COLUMN IF EXISTS bonus_product_id,
    DROP COLUMN IF EXISTS bonus_points,
    DROP COLUMN IF EXISTS applies_to,
    DROP COLUMN IF EXISTS reward_type;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promo_applies_to') THEN
        DROP TYPE promo_applies_to;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promo_reward_type') THEN
        DROP TYPE promo_reward_type;
    END IF;
END $$;
