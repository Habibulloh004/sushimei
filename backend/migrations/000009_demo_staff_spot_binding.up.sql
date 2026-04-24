-- Bind demo staff accounts to the first seeded spot so spot-scoped queries work out of the box.
UPDATE employees
SET spot_id = '11111111-1111-1111-1111-111111111111'
WHERE email IN (
    'manager@sushimei.jp',
    'kitchen@sushimei.jp',
    'cashier@sushimei.jp',
    'courier@sushimei.jp'
)
  AND spot_id IS NULL;
