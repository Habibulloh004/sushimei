INSERT INTO system_settings (key, value, updated_at)
VALUES ('delivery.courier_target_minutes', '30', NOW())
ON CONFLICT (key) DO NOTHING;
