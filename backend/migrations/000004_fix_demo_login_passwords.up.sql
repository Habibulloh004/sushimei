-- Align demo employee passwords with UI test credentials: admin123
UPDATE employees
SET password_hash = '$2a$10$JWe.PVEokLuou/migyiG8OgLmimq48ujuvG8LvsThLBeVvlfIaZOG',
    updated_at = NOW()
WHERE email IN (
    'admin@sushimei.jp',
    'manager@sushimei.jp',
    'kitchen@sushimei.jp',
    'cashier@sushimei.jp',
    'courier@sushimei.jp',
    'superadmin@sushimei.jp',
    'manager.shibuya@sushimei.jp',
    'manager.shinjuku@sushimei.jp',
    'chef.shibuya@sushimei.jp',
    'chef.shinjuku@sushimei.jp',
    'courier2@sushimei.jp',
    'courier3@sushimei.jp',
    'operator@sushimei.jp'
);
