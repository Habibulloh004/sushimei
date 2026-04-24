UPDATE employees
SET spot_id = NULL
WHERE email IN (
    'manager@sushimei.jp',
    'kitchen@sushimei.jp',
    'cashier@sushimei.jp',
    'courier@sushimei.jp'
);
