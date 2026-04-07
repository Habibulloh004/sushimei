-- Seed data for SushiMei

-- Insert Spots (Restaurant branches)
INSERT INTO spots (id, code, name, phone, timezone, address_line1, city, latitude, longitude, delivery_fee, minimum_order, pickup_enabled, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'GINZA-MAIN', 'Ginza Main Store', '+81-3-1234-5678', 'Asia/Tokyo', '1-2-3 Ginza, Chuo-ku', 'Tokyo', 35.6762, 139.7640, 500, 2000, true, true),
    ('22222222-2222-2222-2222-222222222222', 'SHIBUYA-SKY', 'Shibuya Sky', '+81-3-2345-6789', 'Asia/Tokyo', '2-21-1 Shibuya', 'Tokyo', 35.6595, 139.7005, 600, 2500, true, true),
    ('33333333-3333-3333-3333-333333333333', 'SHINJUKU-GDN', 'Shinjuku Garden', '+81-3-3456-7890', 'Asia/Tokyo', '3-38-1 Shinjuku', 'Tokyo', 35.6896, 139.6917, 450, 1800, true, true)
ON CONFLICT (code) DO NOTHING;

-- Insert Operating Hours for spots
INSERT INTO spot_operating_hours (spot_id, weekday, opens_at, closes_at, is_closed)
SELECT s.id, d.weekday, '11:00'::time, '22:00'::time, false
FROM spots s, generate_series(0, 6) as d(weekday)
WHERE s.code IN ('GINZA-MAIN', 'SHIBUYA-SKY', 'SHINJUKU-GDN')
ON CONFLICT (spot_id, weekday) DO NOTHING;

-- Insert Categories
INSERT INTO categories (id, slug, name_i18n, image_url, sort_order, is_active)
VALUES
    ('aaaa0001-0001-0001-0001-000000000001', 'signature-sets', '{"en": "Signature Sets", "ja": "シグネチャーセット", "ru": "Фирменные сеты"}', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400', 1, true),
    ('aaaa0002-0002-0002-0002-000000000002', 'classic-rolls', '{"en": "Classic Rolls", "ja": "クラシックロール", "ru": "Классические роллы"}', 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400', 2, true),
    ('aaaa0003-0003-0003-0003-000000000003', 'nigiri-sushi', '{"en": "Nigiri Sushi", "ja": "にぎり寿司", "ru": "Нигири суши"}', 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400', 3, true),
    ('aaaa0004-0004-0004-0004-000000000004', 'sashimi', '{"en": "Sashimi", "ja": "刺身", "ru": "Сашими"}', 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400', 4, true),
    ('aaaa0005-0005-0005-0005-000000000005', 'sides-starters', '{"en": "Sides & Starters", "ja": "サイド＆スターター", "ru": "Закуски"}', 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', 5, true),
    ('aaaa0006-0006-0006-0006-000000000006', 'beverages', '{"en": "Beverages", "ja": "飲み物", "ru": "Напитки"}', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Products
INSERT INTO products (id, category_id, sku, slug, name_i18n, description_i18n, base_price, image_url, tags, is_spicy, is_vegan, is_halal, allergens, sort_order, is_active)
VALUES
    -- Signature Sets
    ('bbbb0001-0001-0001-0001-000000000001', 'aaaa0001-0001-0001-0001-000000000001', 'SIG-001', 'omakase-signature-set',
     '{"en": "Omakase Signature Set", "ja": "おまかせシグネチャーセット", "ru": "Омакасе Сигнатурный Сет"}',
     '{"en": "Chef''s selection of 12 premium nigiri pieces with seasonal fish", "ja": "シェフ厳選の12貫プレミアムにぎり", "ru": "Выбор шеф-повара из 12 премиальных нигири"}',
     8900, 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600', ARRAY['premium', 'chef-special'], false, false, true, ARRAY['fish', 'shellfish', 'soy'], 1, true),

    ('bbbb0002-0002-0002-0002-000000000002', 'aaaa0001-0001-0001-0001-000000000001', 'SIG-002', 'deluxe-sushi-platter',
     '{"en": "Deluxe Sushi Platter", "ja": "デラックス寿司盛り合わせ", "ru": "Делюкс Суши Плато"}',
     '{"en": "Assortment of 18 pieces including nigiri, maki, and sashimi", "ja": "にぎり、巻き、刺身を含む18貫の盛り合わせ", "ru": "Ассорти из 18 шт нигири, маки и сашими"}',
     12500, 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600', ARRAY['premium', 'popular'], false, false, true, ARRAY['fish', 'shellfish', 'soy'], 2, true),

    -- Classic Rolls
    ('bbbb0003-0003-0003-0003-000000000003', 'aaaa0002-0002-0002-0002-000000000002', 'ROLL-001', 'truffle-salmon-aburi',
     '{"en": "Truffle Salmon Aburi", "ja": "トリュフサーモン炙り", "ru": "Трюфельный Лосось Абури"}',
     '{"en": "Torch-seared salmon with truffle oil and gold flakes", "ja": "トリュフオイルと金箔を添えた炙りサーモン", "ru": "Обожженный лосось с трюфельным маслом"}',
     2800, 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600', ARRAY['premium', 'signature'], false, false, true, ARRAY['fish', 'soy'], 1, true),

    ('bbbb0004-0004-0004-0004-000000000004', 'aaaa0002-0002-0002-0002-000000000002', 'ROLL-002', 'spicy-bluefin-tuna-roll',
     '{"en": "Spicy Bluefin Tuna Roll", "ja": "スパイシー本マグロロール", "ru": "Острый ролл с голубым тунцом"}',
     '{"en": "Premium bluefin tuna with spicy mayo and crispy tempura bits", "ja": "スパイシーマヨと天かすを添えた本マグロ", "ru": "Премиальный тунец со спайси майонезом"}',
     3200, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600', ARRAY['spicy', 'popular'], true, false, true, ARRAY['fish', 'soy', 'egg'], 2, true),

    ('bbbb0005-0005-0005-0005-000000000005', 'aaaa0002-0002-0002-0002-000000000002', 'ROLL-003', 'dragon-eel-roll',
     '{"en": "Dragon Eel Roll", "ja": "ドラゴンうなぎロール", "ru": "Ролл Дракон с угрем"}',
     '{"en": "Grilled eel with avocado, cucumber topped with sweet sauce", "ja": "アボカドときゅうりの上に甘だれうなぎ", "ru": "Жареный угорь с авокадо и сладким соусом"}',
     2600, 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600', ARRAY['popular', 'signature'], false, false, false, ARRAY['fish', 'soy'], 3, true),

    -- Nigiri Sushi
    ('bbbb0006-0006-0006-0006-000000000006', 'aaaa0003-0003-0003-0003-000000000003', 'NIG-001', 'wagyu-beef-nigiri',
     '{"en": "Wagyu Beef Nigiri", "ja": "和牛にぎり", "ru": "Нигири с говядиной Вагю"}',
     '{"en": "A5 grade wagyu beef lightly seared, served over seasoned rice", "ja": "A5等級和牛の軽い炙り、酢飯の上に", "ru": "Слегка обжаренная говядина А5 на рисе"}',
     1800, 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600', ARRAY['premium', 'signature'], false, false, true, ARRAY['beef', 'soy'], 1, true),

    ('bbbb0007-0007-0007-0007-000000000007', 'aaaa0003-0003-0003-0003-000000000003', 'NIG-002', 'otoro-nigiri',
     '{"en": "Otoro (Fatty Tuna) Nigiri", "ja": "大トロにぎり", "ru": "Нигири Оторо"}',
     '{"en": "Premium fatty tuna belly, melt-in-your-mouth texture", "ja": "口の中でとろける最高級大トロ", "ru": "Премиальное жирное брюшко тунца"}',
     2200, 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=600', ARRAY['premium'], false, false, true, ARRAY['fish', 'soy'], 2, true),

    -- Sashimi
    ('bbbb0008-0008-0008-0008-000000000008', 'aaaa0004-0004-0004-0004-000000000004', 'SASH-001', 'wagyu-sashimi',
     '{"en": "Wagyu Sashimi", "ja": "和牛刺身", "ru": "Сашими из Вагю"}',
     '{"en": "Thinly sliced A5 wagyu beef with ponzu sauce", "ja": "ポン酢添えA5和牛薄切り", "ru": "Тонко нарезанная говядина Вагю"}',
     3500, 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600', ARRAY['premium'], false, false, true, ARRAY['beef', 'soy'], 1, true),

    ('bbbb0009-0009-0009-0009-000000000009', 'aaaa0004-0004-0004-0004-000000000004', 'SASH-002', 'yellowtail-jalapeno',
     '{"en": "Yellowtail Jalapeño", "ja": "ハマチハラペーニョ", "ru": "Желтохвост с халапеньо"}',
     '{"en": "Fresh yellowtail with jalapeño, cilantro and yuzu ponzu", "ja": "ハラペーニョとパクチー、柚子ポン酢添え", "ru": "Свежий желтохвост с халапеньо и юдзу"}',
     2400, 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600', ARRAY['spicy', 'signature'], true, false, true, ARRAY['fish', 'soy'], 2, true),

    -- Sides & Starters
    ('bbbb0010-0010-0010-0010-000000000010', 'aaaa0005-0005-0005-0005-000000000005', 'SIDE-001', 'asparagus-tempura',
     '{"en": "Asparagus Tempura", "ja": "アスパラガス天ぷら", "ru": "Темпура из спаржи"}',
     '{"en": "Crispy battered asparagus with matcha salt", "ja": "抹茶塩添えサクサクアスパラ天ぷら", "ru": "Хрустящая темпура из спаржи с солью матча"}',
     980, 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600', ARRAY['vegetarian'], false, true, true, ARRAY['gluten', 'egg'], 1, true),

    ('bbbb0011-0011-0011-0011-000000000011', 'aaaa0005-0005-0005-0005-000000000005', 'SIDE-002', 'miso-sea-bass',
     '{"en": "Miso Sea Bass", "ja": "味噌シーバス", "ru": "Сибас в мисо"}',
     '{"en": "Black cod marinated in sweet miso, broiled to perfection", "ja": "甘味噌漬けの銀だら、香ばしく焼き上げ", "ru": "Черная треска в сладком мисо"}',
     4200, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', ARRAY['signature', 'popular'], false, false, true, ARRAY['fish', 'soy'], 2, true),

    ('bbbb0012-0012-0012-0012-000000000012', 'aaaa0005-0005-0005-0005-000000000005', 'SIDE-003', 'edamame',
     '{"en": "Edamame", "ja": "枝豆", "ru": "Эдамаме"}',
     '{"en": "Steamed young soybeans with sea salt", "ja": "塩茹で枝豆", "ru": "Молодые соевые бобы с морской солью"}',
     580, 'https://images.unsplash.com/photo-1564894809611-1742fc40ed80?w=600', ARRAY['vegetarian', 'healthy'], false, true, true, ARRAY['soy'], 3, true),

    -- Beverages
    ('bbbb0013-0013-0013-0013-000000000013', 'aaaa0006-0006-0006-0006-000000000006', 'BEV-001', 'premium-sake',
     '{"en": "Premium Sake (300ml)", "ja": "プレミアム日本酒", "ru": "Премиум Саке"}',
     '{"en": "Junmai Daiginjo from Niigata prefecture", "ja": "新潟県産純米大吟醸", "ru": "Джунмай Дайгинджо из Ниигаты"}',
     2800, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600', ARRAY['alcohol', 'premium'], false, true, true, ARRAY['alcohol'], 1, true),

    ('bbbb0014-0014-0014-0014-000000000014', 'aaaa0006-0006-0006-0006-000000000006', 'BEV-002', 'green-tea',
     '{"en": "Japanese Green Tea", "ja": "日本茶", "ru": "Японский зеленый чай"}',
     '{"en": "Traditional Sencha green tea, hot or cold", "ja": "伝統的な煎茶、温かいまたは冷たい", "ru": "Традиционный чай сенча"}',
     380, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600', ARRAY['healthy', 'popular'], false, true, true, ARRAY[]::TEXT[], 2, true)
ON CONFLICT (sku) DO NOTHING;

-- Insert Customers
INSERT INTO customers (id, phone, first_name, last_name, email, status, bonus_balance, marketing_opt_in, language_code)
VALUES
    ('cccc0001-0001-0001-0001-000000000001', '+81-90-1234-5678', 'Yuki', 'Tanaka', 'yuki.tanaka@email.com', 'ACTIVE', 2500, true, 'ja'),
    ('cccc0002-0002-0002-0002-000000000002', '+81-90-2345-6789', 'Kenji', 'Yamamoto', 'kenji.y@email.com', 'ACTIVE', 1800, false, 'ja'),
    ('cccc0003-0003-0003-0003-000000000003', '+81-80-3456-7890', 'Sakura', 'Sato', 'sakura.sato@email.com', 'ACTIVE', 4200, true, 'en'),
    ('cccc0004-0004-0004-0004-000000000004', '+81-70-4567-8901', 'Hiroshi', 'Suzuki', 'hiroshi.s@email.com', 'ACTIVE', 950, true, 'ja'),
    ('cccc0005-0005-0005-0005-000000000005', '+81-90-5678-9012', 'Mika', 'Watanabe', 'mika.w@email.com', 'ACTIVE', 3100, false, 'en'),
    ('cccc0006-0006-0006-0006-000000000006', '+81-80-6789-0123', 'Takeshi', 'Ito', 'takeshi.ito@email.com', 'BLOCKED', 0, false, 'ja')
ON CONFLICT (phone) DO NOTHING;

-- Insert Customer Addresses
INSERT INTO customer_addresses (customer_id, label, city, street, house, latitude, longitude, is_default)
VALUES
    ('cccc0001-0001-0001-0001-000000000001', 'Home', 'Tokyo', 'Shibuya-ku', '1-23-4', 35.6580, 139.7016, true),
    ('cccc0001-0001-0001-0001-000000000001', 'Office', 'Tokyo', 'Minato-ku', '5-6-7', 35.6628, 139.7400, false),
    ('cccc0002-0002-0002-0002-000000000002', 'Home', 'Tokyo', 'Shinjuku-ku', '8-9-10', 35.6938, 139.7034, true),
    ('cccc0003-0003-0003-0003-000000000003', 'Home', 'Tokyo', 'Chiyoda-ku', '11-12-13', 35.6940, 139.7536, true)
ON CONFLICT DO NOTHING;

-- Insert Admin Employee (password: admin123)
INSERT INTO employees (id, role_code, email, phone, first_name, last_name, password_hash, status, is_active)
VALUES
    ('dddd0001-0001-0001-0001-000000000001', 'ADMIN', 'admin@sushimei.jp', '+81-3-0000-0001', 'Admin', 'User', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    ('dddd0002-0002-0002-0002-000000000002', 'MANAGER', 'manager@sushimei.jp', '+81-3-0000-0002', 'Takuya', 'Manager', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    ('dddd0003-0003-0003-0003-000000000003', 'KITCHEN', 'kitchen@sushimei.jp', '+81-3-0000-0003', 'Chef', 'Nakamura', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    ('dddd0004-0004-0004-0004-000000000004', 'CASHIER', 'cashier@sushimei.jp', '+81-3-0000-0004', 'Yui', 'Cashier', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    ('dddd0005-0005-0005-0005-000000000005', 'COURIER', 'courier@sushimei.jp', '+81-3-0000-0005', 'Ryu', 'Courier', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true)
ON CONFLICT (email) DO NOTHING;

-- Assign employees to spots
INSERT INTO employee_spots (employee_id, spot_id)
VALUES
    ('dddd0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111'),
    ('dddd0003-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111'),
    ('dddd0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111'),
    ('dddd0005-0005-0005-0005-000000000005', '11111111-1111-1111-1111-111111111111'),
    ('dddd0003-0003-0003-0003-000000000003', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert Promo Codes
INSERT INTO promo_codes (id, code, title_i18n, description_i18n, discount_type, discount_value, min_order_amount, max_discount_amount, total_usage_limit, per_user_usage_limit, valid_from, valid_to, is_active)
VALUES
    ('eeee0001-0001-0001-0001-000000000001', 'WELCOME20',
     '{"en": "Welcome 20% Off", "ja": "新規20%オフ", "ru": "Скидка 20% для новых"}',
     '{"en": "20% off your first order", "ja": "初回注文20%オフ", "ru": "20% скидка на первый заказ"}',
     'PERCENT', 20, 2000, 3000, 1000, 1, NOW(), NOW() + INTERVAL '3 months', true),

    ('eeee0002-0002-0002-0002-000000000002', 'SUSHI500',
     '{"en": "¥500 Off", "ja": "500円オフ", "ru": "Скидка ¥500"}',
     '{"en": "Get ¥500 off orders over ¥3000", "ja": "3000円以上で500円オフ", "ru": "¥500 скидка при заказе от ¥3000"}',
     'FIXED', 500, 3000, NULL, 500, 3, NOW(), NOW() + INTERVAL '1 month', true),

    ('eeee0003-0003-0003-0003-000000000003', 'VIP15',
     '{"en": "VIP 15% Off", "ja": "VIP15%オフ", "ru": "VIP скидка 15%"}',
     '{"en": "Exclusive 15% discount for VIP members", "ja": "VIP会員限定15%オフ", "ru": "Эксклюзивная скидка 15% для VIP"}',
     'PERCENT', 15, 5000, 5000, NULL, NULL, NOW(), NOW() + INTERVAL '6 months', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Orders
INSERT INTO orders (id, order_number, customer_id, spot_id, status, order_type, payment_type, customer_name, customer_phone, subtotal_amount, delivery_fee_amount, total_amount, created_at)
VALUES
    ('ffff0001-0001-0001-0001-000000000001', 'ORD-2024-0001', 'cccc0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'DELIVERED', 'DELIVERY', 'CARD', 'Yuki Tanaka', '+81-90-1234-5678', 11700, 500, 12200, NOW() - INTERVAL '2 days'),
    ('ffff0002-0002-0002-0002-000000000002', 'ORD-2024-0002', 'cccc0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'COMPLETED', 'PICKUP', 'CASH', 'Kenji Yamamoto', '+81-90-2345-6789', 8900, 0, 8900, NOW() - INTERVAL '1 day'),
    ('ffff0003-0003-0003-0003-000000000003', 'ORD-2024-0003', 'cccc0003-0003-0003-0003-000000000003', '22222222-2222-2222-2222-222222222222', 'PREPARING', 'DELIVERY', 'CARD', 'Sakura Sato', '+81-80-3456-7890', 15600, 600, 16200, NOW() - INTERVAL '30 minutes'),
    ('ffff0004-0004-0004-0004-000000000004', 'ORD-2024-0004', 'cccc0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'CONFIRMED', 'DELIVERY', 'CARD', 'Hiroshi Suzuki', '+81-70-4567-8901', 6200, 500, 6700, NOW() - INTERVAL '15 minutes'),
    ('ffff0005-0005-0005-0005-000000000005', 'ORD-2024-0005', 'cccc0005-0005-0005-0005-000000000005', '33333333-3333-3333-3333-333333333333', 'RECEIVED', 'PICKUP', 'CASH', 'Mika Watanabe', '+81-90-5678-9012', 4200, 0, 4200, NOW() - INTERVAL '5 minutes'),
    ('ffff0006-0006-0006-0006-000000000006', 'ORD-2024-0006', NULL, '11111111-1111-1111-1111-111111111111', 'READY', 'WALK_IN', 'CASH', 'Guest', NULL, 3380, 0, 3380, NOW() - INTERVAL '10 minutes')
ON CONFLICT (order_number) DO NOTHING;

-- Insert Order Items
INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
VALUES
    -- Order 1
    ('ffff0001-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000001', '{"en": "Omakase Signature Set"}', 8900, 1, 8900),
    ('ffff0001-0001-0001-0001-000000000001', 'bbbb0003-0003-0003-0003-000000000003', '{"en": "Truffle Salmon Aburi"}', 2800, 1, 2800),
    -- Order 2
    ('ffff0002-0002-0002-0002-000000000002', 'bbbb0001-0001-0001-0001-000000000001', '{"en": "Omakase Signature Set"}', 8900, 1, 8900),
    -- Order 3
    ('ffff0003-0003-0003-0003-000000000003', 'bbbb0002-0002-0002-0002-000000000002', '{"en": "Deluxe Sushi Platter"}', 12500, 1, 12500),
    ('ffff0003-0003-0003-0003-000000000003', 'bbbb0004-0004-0004-0004-000000000004', '{"en": "Spicy Bluefin Tuna Roll"}', 3200, 1, 3200),
    -- Order 4
    ('ffff0004-0004-0004-0004-000000000004', 'bbbb0005-0005-0005-0005-000000000005', '{"en": "Dragon Eel Roll"}', 2600, 1, 2600),
    ('ffff0004-0004-0004-0004-000000000004', 'bbbb0006-0006-0006-0006-000000000006', '{"en": "Wagyu Beef Nigiri"}', 1800, 2, 3600),
    -- Order 5
    ('ffff0005-0005-0005-0005-000000000005', 'bbbb0011-0011-0011-0011-000000000011', '{"en": "Miso Sea Bass"}', 4200, 1, 4200),
    -- Order 6
    ('ffff0006-0006-0006-0006-000000000006', 'bbbb0010-0010-0010-0010-000000000010', '{"en": "Asparagus Tempura"}', 980, 2, 1960),
    ('ffff0006-0006-0006-0006-000000000006', 'bbbb0012-0012-0012-0012-000000000012', '{"en": "Edamame"}', 580, 1, 580),
    ('ffff0006-0006-0006-0006-000000000006', 'bbbb0014-0014-0014-0014-000000000014', '{"en": "Japanese Green Tea"}', 380, 2, 760)
ON CONFLICT DO NOTHING;

-- Insert Order Status Timeline
INSERT INTO order_status_timeline (order_id, status, changed_by, note, created_at)
VALUES
    ('ffff0001-0001-0001-0001-000000000001', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '2 days'),
    ('ffff0001-0001-0001-0001-000000000001', 'CONFIRMED', 'dddd0002-0002-0002-0002-000000000002', 'Order confirmed', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
    ('ffff0001-0001-0001-0001-000000000001', 'PREPARING', 'dddd0003-0003-0003-0003-000000000003', 'Started preparation', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
    ('ffff0001-0001-0001-0001-000000000001', 'READY', 'dddd0003-0003-0003-0003-000000000003', 'Ready for pickup', NOW() - INTERVAL '2 days' + INTERVAL '25 minutes'),
    ('ffff0001-0001-0001-0001-000000000001', 'ON_THE_WAY', 'dddd0005-0005-0005-0005-000000000005', 'Out for delivery', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
    ('ffff0001-0001-0001-0001-000000000001', 'DELIVERED', 'dddd0005-0005-0005-0005-000000000005', 'Delivered successfully', NOW() - INTERVAL '2 days' + INTERVAL '50 minutes'),
    ('ffff0002-0002-0002-0002-000000000002', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '1 day'),
    ('ffff0002-0002-0002-0002-000000000002', 'COMPLETED', 'dddd0004-0004-0004-0004-000000000004', 'Picked up by customer', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
    ('ffff0003-0003-0003-0003-000000000003', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '30 minutes'),
    ('ffff0003-0003-0003-0003-000000000003', 'CONFIRMED', 'dddd0002-0002-0002-0002-000000000002', 'Order confirmed', NOW() - INTERVAL '25 minutes'),
    ('ffff0003-0003-0003-0003-000000000003', 'PREPARING', 'dddd0003-0003-0003-0003-000000000003', 'Started preparation', NOW() - INTERVAL '20 minutes'),
    ('ffff0004-0004-0004-0004-000000000004', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '15 minutes'),
    ('ffff0004-0004-0004-0004-000000000004', 'CONFIRMED', 'dddd0002-0002-0002-0002-000000000002', 'Order confirmed', NOW() - INTERVAL '10 minutes'),
    ('ffff0005-0005-0005-0005-000000000005', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '5 minutes'),
    ('ffff0006-0006-0006-0006-000000000006', 'RECEIVED', NULL, 'Walk-in order', NOW() - INTERVAL '10 minutes'),
    ('ffff0006-0006-0006-0006-000000000006', 'PREPARING', 'dddd0003-0003-0003-0003-000000000003', 'Started preparation', NOW() - INTERVAL '8 minutes'),
    ('ffff0006-0006-0006-0006-000000000006', 'READY', 'dddd0003-0003-0003-0003-000000000003', 'Ready for pickup', NOW() - INTERVAL '2 minutes')
ON CONFLICT DO NOTHING;

-- Insert Bonus Ledger entries
INSERT INTO bonus_ledger (customer_id, order_id, txn_type, points, balance_after, reason)
VALUES
    ('cccc0001-0001-0001-0001-000000000001', 'ffff0001-0001-0001-0001-000000000001', 'EARN', 122, 2500, 'Earned from order ORD-2024-0001'),
    ('cccc0002-0002-0002-0002-000000000002', 'ffff0002-0002-0002-0002-000000000002', 'EARN', 89, 1800, 'Earned from order ORD-2024-0002'),
    ('cccc0003-0003-0003-0003-000000000003', NULL, 'ADJUSTMENT', 500, 4200, 'Welcome bonus'),
    ('cccc0005-0005-0005-0005-000000000005', NULL, 'EARN', 100, 3100, 'Referral bonus')
ON CONFLICT DO NOTHING;

-- Insert product availability for all spots
INSERT INTO product_availability (product_id, spot_id, is_available, stock_qty)
SELECT p.id, s.id, true, 50
FROM products p, spots s
WHERE p.deleted_at IS NULL AND s.deleted_at IS NULL
ON CONFLICT (product_id, spot_id) DO NOTHING;
