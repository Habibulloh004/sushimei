-- Extended Seed Data for SushiMei - Complete Test Data for All Models
-- This file provides comprehensive test data for testing all features

-- =============================================
-- MODIFIER GROUPS & OPTIONS (for customization)
-- =============================================

INSERT INTO modifier_groups (id, name_i18n, min_select, max_select, required, sort_order)
VALUES
    ('a0000001-0001-0001-0001-000000000001',
     '{"en": "Rice Type", "ja": "ご飯の種類", "ru": "Тип риса"}',
     1, 1, true, 1),
    ('a0000002-0002-0002-0002-000000000002',
     '{"en": "Extra Toppings", "ja": "追加トッピング", "ru": "Дополнительные топпинги"}',
     0, 5, false, 2),
    ('a0000003-0003-0003-0003-000000000003',
     '{"en": "Spice Level", "ja": "辛さレベル", "ru": "Уровень остроты"}',
     1, 1, true, 3),
    ('a0000004-0004-0004-0004-000000000004',
     '{"en": "Sauce Choice", "ja": "ソースの選択", "ru": "Выбор соуса"}',
     0, 3, false, 4),
    ('a0000005-0005-0005-0005-000000000005',
     '{"en": "Drink Size", "ja": "ドリンクサイズ", "ru": "Размер напитка"}',
     1, 1, true, 5)
ON CONFLICT DO NOTHING;

-- Modifier Options for Rice Type
INSERT INTO modifier_options (id, group_id, name_i18n, price_delta, sort_order, is_active)
VALUES
    ('b0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001',
     '{"en": "White Rice", "ja": "白米", "ru": "Белый рис"}', 0, 1, true),
    ('b0000002-0002-0002-0002-000000000002', 'a0000001-0001-0001-0001-000000000001',
     '{"en": "Brown Rice", "ja": "玄米", "ru": "Коричневый рис"}', 100, 2, true),
    ('b0000003-0003-0003-0003-000000000003', 'a0000001-0001-0001-0001-000000000001',
     '{"en": "Sushi Rice (Premium)", "ja": "寿司飯（プレミアム）", "ru": "Рис для суши (премиум)"}', 200, 3, true),
-- Extra Toppings Options
    ('b0000004-0004-0004-0004-000000000004', 'a0000002-0002-0002-0002-000000000002',
     '{"en": "Avocado", "ja": "アボカド", "ru": "Авокадо"}', 300, 1, true),
    ('b0000005-0005-0005-0005-000000000005', 'a0000002-0002-0002-0002-000000000002',
     '{"en": "Cream Cheese", "ja": "クリームチーズ", "ru": "Сливочный сыр"}', 250, 2, true),
    ('b0000006-0006-0006-0006-000000000006', 'a0000002-0002-0002-0002-000000000002',
     '{"en": "Tobiko (Flying Fish Roe)", "ja": "とびこ", "ru": "Тобико (икра летучей рыбы)"}', 400, 3, true),
    ('b0000007-0007-0007-0007-000000000007', 'a0000002-0002-0002-0002-000000000002',
     '{"en": "Tempura Flakes", "ja": "天かす", "ru": "Хлопья темпуры"}', 150, 4, true),
    ('b0000008-0008-0008-0008-000000000008', 'a0000002-0002-0002-0002-000000000002',
     '{"en": "Extra Salmon", "ja": "サーモン追加", "ru": "Дополнительный лосось"}', 500, 5, true),
-- Spice Level Options
    ('b0000009-0009-0009-0009-000000000009', 'a0000003-0003-0003-0003-000000000003',
     '{"en": "Mild", "ja": "マイルド", "ru": "Мягкий"}', 0, 1, true),
    ('b0000010-0010-0010-0010-000000000010', 'a0000003-0003-0003-0003-000000000003',
     '{"en": "Medium", "ja": "中辛", "ru": "Средний"}', 0, 2, true),
    ('b0000011-0011-0011-0011-000000000011', 'a0000003-0003-0003-0003-000000000003',
     '{"en": "Hot", "ja": "辛口", "ru": "Острый"}', 0, 3, true),
    ('b0000012-0012-0012-0012-000000000012', 'a0000003-0003-0003-0003-000000000003',
     '{"en": "Extra Hot", "ja": "激辛", "ru": "Очень острый"}', 100, 4, true),
-- Sauce Options
    ('b0000013-0013-0013-0013-000000000013', 'a0000004-0004-0004-0004-000000000004',
     '{"en": "Soy Sauce", "ja": "醤油", "ru": "Соевый соус"}', 0, 1, true),
    ('b0000014-0014-0014-0014-000000000014', 'a0000004-0004-0004-0004-000000000004',
     '{"en": "Spicy Mayo", "ja": "スパイシーマヨ", "ru": "Острый майонез"}', 100, 2, true),
    ('b0000015-0015-0015-0015-000000000015', 'a0000004-0004-0004-0004-000000000004',
     '{"en": "Eel Sauce (Unagi)", "ja": "うなぎのタレ", "ru": "Соус унаги"}', 150, 3, true),
    ('b0000016-0016-0016-0016-000000000016', 'a0000004-0004-0004-0004-000000000004',
     '{"en": "Ponzu", "ja": "ポン酢", "ru": "Понзу"}', 100, 4, true),
-- Drink Size Options
    ('b0000017-0017-0017-0017-000000000017', 'a0000005-0005-0005-0005-000000000005',
     '{"en": "Small (200ml)", "ja": "S（200ml）", "ru": "Маленький (200мл)"}', 0, 1, true),
    ('b0000018-0018-0018-0018-000000000018', 'a0000005-0005-0005-0005-000000000005',
     '{"en": "Medium (350ml)", "ja": "M（350ml）", "ru": "Средний (350мл)"}', 150, 2, true),
    ('b0000019-0019-0019-0019-000000000019', 'a0000005-0005-0005-0005-000000000005',
     '{"en": "Large (500ml)", "ja": "L（500ml）", "ru": "Большой (500мл)"}', 280, 3, true)
ON CONFLICT DO NOTHING;

-- Link modifier groups to products
INSERT INTO product_modifier_groups (product_id, modifier_group_id, sort_order)
VALUES
    -- Signature sets get rice type and toppings
    ('bbbb0001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001', 1),
    ('bbbb0001-0001-0001-0001-000000000001', 'a0000002-0002-0002-0002-000000000002', 2),
    ('bbbb0002-0002-0002-0002-000000000002', 'a0000001-0001-0001-0001-000000000001', 1),
    ('bbbb0002-0002-0002-0002-000000000002', 'a0000002-0002-0002-0002-000000000002', 2),
    -- Spicy rolls get spice level
    ('bbbb0004-0004-0004-0004-000000000004', 'a0000003-0003-0003-0003-000000000003', 1),
    ('bbbb0004-0004-0004-0004-000000000004', 'a0000004-0004-0004-0004-000000000004', 2),
    -- Classic rolls get toppings and sauce
    ('bbbb0003-0003-0003-0003-000000000003', 'a0000002-0002-0002-0002-000000000002', 1),
    ('bbbb0003-0003-0003-0003-000000000003', 'a0000004-0004-0004-0004-000000000004', 2),
    ('bbbb0005-0005-0005-0005-000000000005', 'a0000002-0002-0002-0002-000000000002', 1),
    ('bbbb0005-0005-0005-0005-000000000005', 'a0000004-0004-0004-0004-000000000004', 2),
    -- Beverages get size option
    ('bbbb0013-0013-0013-0013-000000000013', 'a0000005-0005-0005-0005-000000000005', 1),
    ('bbbb0014-0014-0014-0014-000000000014', 'a0000005-0005-0005-0005-000000000005', 1)
ON CONFLICT DO NOTHING;

-- =============================================
-- PRODUCT VARIANTS (sizes/options)
-- =============================================

INSERT INTO product_variants (id, product_id, name_i18n, sku, price_delta, is_default, sort_order, is_active)
VALUES
    -- Omakase set sizes
    ('c0000001-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000001',
     '{"en": "Regular (12 pcs)", "ja": "レギュラー（12貫）", "ru": "Обычный (12 шт)"}',
     'SIG-001-REG', 0, true, 1, true),
    ('c0000002-0002-0002-0002-000000000002', 'bbbb0001-0001-0001-0001-000000000001',
     '{"en": "Large (18 pcs)", "ja": "ラージ（18貫）", "ru": "Большой (18 шт)"}',
     'SIG-001-LRG', 3500, false, 2, true),
    ('c0000003-0003-0003-0003-000000000003', 'bbbb0001-0001-0001-0001-000000000001',
     '{"en": "Premium (24 pcs)", "ja": "プレミアム（24貫）", "ru": "Премиум (24 шт)"}',
     'SIG-001-PRM', 7000, false, 3, true),
    -- Deluxe platter sizes
    ('c0000004-0004-0004-0004-000000000004', 'bbbb0002-0002-0002-0002-000000000002',
     '{"en": "Regular (18 pcs)", "ja": "レギュラー（18貫）", "ru": "Обычный (18 шт)"}',
     'SIG-002-REG', 0, true, 1, true),
    ('c0000005-0005-0005-0005-000000000005', 'bbbb0002-0002-0002-0002-000000000002',
     '{"en": "Family (36 pcs)", "ja": "ファミリー（36貫）", "ru": "Семейный (36 шт)"}',
     'SIG-002-FAM', 10000, false, 2, true),
    -- Roll sizes
    ('c0000006-0006-0006-0006-000000000006', 'bbbb0003-0003-0003-0003-000000000003',
     '{"en": "6 pieces", "ja": "6貫", "ru": "6 шт"}',
     'ROLL-001-6', 0, true, 1, true),
    ('c0000007-0007-0007-0007-000000000007', 'bbbb0003-0003-0003-0003-000000000003',
     '{"en": "8 pieces", "ja": "8貫", "ru": "8 шт"}',
     'ROLL-001-8', 800, false, 2, true),
    ('c0000008-0008-0008-0008-000000000008', 'bbbb0004-0004-0004-0004-000000000004',
     '{"en": "6 pieces", "ja": "6貫", "ru": "6 шт"}',
     'ROLL-002-6', 0, true, 1, true),
    ('c0000009-0009-0009-0009-000000000009', 'bbbb0004-0004-0004-0004-000000000004',
     '{"en": "8 pieces", "ja": "8貫", "ru": "8 шт"}',
     'ROLL-002-8', 900, false, 2, true),
    -- Nigiri portions
    ('c0000010-0010-0010-0010-000000000010', 'bbbb0006-0006-0006-0006-000000000006',
     '{"en": "2 pieces", "ja": "2貫", "ru": "2 шт"}',
     'NIG-001-2', 0, true, 1, true),
    ('c0000011-0011-0011-0011-000000000011', 'bbbb0006-0006-0006-0006-000000000006',
     '{"en": "4 pieces", "ja": "4貫", "ru": "4 шт"}',
     'NIG-001-4', 1600, false, 2, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- ADDITIONAL CATEGORIES
-- =============================================

INSERT INTO categories (id, slug, name_i18n, image_url, sort_order, is_active)
VALUES
    ('aaaa0007-0007-0007-0007-000000000007', 'combo-meals',
     '{"en": "Combo Meals", "ja": "コンボセット", "ru": "Комбо обеды"}',
     'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400', 7, true),
    ('aaaa0008-0008-0008-0008-000000000008', 'desserts',
     '{"en": "Desserts", "ja": "デザート", "ru": "Десерты"}',
     'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', 8, true),
    ('aaaa0009-0009-0009-0009-000000000009', 'soups',
     '{"en": "Soups", "ja": "スープ", "ru": "Супы"}',
     'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- ADDITIONAL PRODUCTS
-- =============================================

INSERT INTO products (id, category_id, sku, slug, name_i18n, description_i18n, base_price, image_url, tags, is_spicy, is_vegan, is_halal, allergens, sort_order, is_active)
VALUES
    -- Combo Meals
    ('bbbb0015-0015-0015-0015-000000000015', 'aaaa0007-0007-0007-0007-000000000007', 'COMBO-001', 'lunch-combo-a',
     '{"en": "Lunch Combo A", "ja": "ランチコンボA", "ru": "Ланч комбо А"}',
     '{"en": "8pc California roll + Miso soup + Green tea", "ja": "カリフォルニアロール8貫+味噌汁+緑茶", "ru": "8 Калифорния + Мисо суп + Зеленый чай"}',
     1580, 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600', ARRAY['lunch', 'value'], false, false, true, ARRAY['fish', 'soy', 'gluten'], 1, true),

    ('bbbb0016-0016-0016-0016-000000000016', 'aaaa0007-0007-0007-0007-000000000007', 'COMBO-002', 'lunch-combo-b',
     '{"en": "Lunch Combo B", "ja": "ランチコンボB", "ru": "Ланч комбо Б"}',
     '{"en": "6pc salmon nigiri + Edamame + Miso soup", "ja": "サーモン握り6貫+枝豆+味噌汁", "ru": "6 Лосось нигири + Эдамаме + Мисо суп"}',
     1980, 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600', ARRAY['lunch', 'popular'], false, false, true, ARRAY['fish', 'soy'], 2, true),

    ('bbbb0017-0017-0017-0017-000000000017', 'aaaa0007-0007-0007-0007-000000000007', 'COMBO-003', 'dinner-set',
     '{"en": "Premium Dinner Set", "ja": "プレミアムディナーセット", "ru": "Премиум ужин"}',
     '{"en": "12pc chef selection + 6pc sashimi + Miso soup + Dessert", "ja": "シェフ厳選12貫+刺身6切れ+味噌汁+デザート", "ru": "12 шеф выбор + 6 сашими + Мисо суп + Десерт"}',
     4980, 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600', ARRAY['dinner', 'premium'], false, false, true, ARRAY['fish', 'soy', 'shellfish'], 3, true),

    -- Desserts
    ('bbbb0018-0018-0018-0018-000000000018', 'aaaa0008-0008-0008-0008-000000000008', 'DSRT-001', 'matcha-mochi',
     '{"en": "Matcha Mochi Ice Cream", "ja": "抹茶もちアイス", "ru": "Мочи с мороженым матча"}',
     '{"en": "3 pieces of premium matcha flavored mochi ice cream", "ja": "プレミアム抹茶もちアイス3個", "ru": "3 штуки мочи с премиум мороженым матча"}',
     680, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600', ARRAY['dessert', 'sweet'], false, false, true, ARRAY['dairy', 'gluten'], 1, true),

    ('bbbb0019-0019-0019-0019-000000000019', 'aaaa0008-0008-0008-0008-000000000008', 'DSRT-002', 'black-sesame-pudding',
     '{"en": "Black Sesame Pudding", "ja": "黒ごまプリン", "ru": "Пудинг с черным кунжутом"}',
     '{"en": "Silky smooth black sesame pudding with kinako powder", "ja": "きな粉を添えた滑らかな黒ごまプリン", "ru": "Нежный пудинг с черным кунжутом"}',
     580, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600', ARRAY['dessert', 'traditional'], false, false, true, ARRAY['dairy', 'sesame'], 2, true),

    ('bbbb0020-0020-0020-0020-000000000020', 'aaaa0008-0008-0008-0008-000000000008', 'DSRT-003', 'yuzu-cheesecake',
     '{"en": "Yuzu Cheesecake", "ja": "柚子チーズケーキ", "ru": "Чизкейк с юдзу"}',
     '{"en": "Light and creamy cheesecake with citrus yuzu flavor", "ja": "さっぱりとした柚子風味のチーズケーキ", "ru": "Легкий кремовый чизкейк с цитрусом юдзу"}',
     780, 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=600', ARRAY['dessert', 'premium'], false, false, true, ARRAY['dairy', 'egg', 'gluten'], 3, true),

    -- Soups
    ('bbbb0021-0021-0021-0021-000000000021', 'aaaa0009-0009-0009-0009-000000000009', 'SOUP-001', 'miso-soup',
     '{"en": "Classic Miso Soup", "ja": "味噌汁", "ru": "Классический мисо суп"}',
     '{"en": "Traditional miso soup with tofu, wakame seaweed, and green onion", "ja": "豆腐、わかめ、ネギの伝統的な味噌汁", "ru": "Традиционный мисо суп с тофу и водорослями"}',
     280, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600', ARRAY['soup', 'traditional'], false, true, true, ARRAY['soy'], 1, true),

    ('bbbb0022-0022-0022-0022-000000000022', 'aaaa0009-0009-0009-0009-000000000009', 'SOUP-002', 'seafood-miso',
     '{"en": "Seafood Miso Soup", "ja": "海鮮味噌汁", "ru": "Мисо суп с морепродуктами"}',
     '{"en": "Rich miso soup with shrimp, clams, and fish", "ja": "エビ、あさり、魚の濃厚な味噌汁", "ru": "Насыщенный мисо суп с креветками и моллюсками"}',
     580, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600', ARRAY['soup', 'seafood'], false, false, true, ARRAY['soy', 'shellfish', 'fish'], 2, true),

    ('bbbb0023-0023-0023-0023-000000000023', 'aaaa0009-0009-0009-0009-000000000009', 'SOUP-003', 'spicy-ramen',
     '{"en": "Spicy Tonkotsu Ramen", "ja": "辛口とんこつラーメン", "ru": "Острый рамен тонкоцу"}',
     '{"en": "Rich pork bone broth with chashu, egg, nori, and spicy oil", "ja": "チャーシュー、卵、海苔、辛味オイルの豚骨ブロス", "ru": "Насыщенный бульон с чашу, яйцом и острым маслом"}',
     1280, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600', ARRAY['soup', 'spicy', 'popular'], true, false, false, ARRAY['pork', 'egg', 'gluten', 'soy'], 3, true),

    -- Additional rolls for more variety
    ('bbbb0024-0024-0024-0024-000000000024', 'aaaa0002-0002-0002-0002-000000000002', 'ROLL-004', 'rainbow-roll',
     '{"en": "Rainbow Roll", "ja": "レインボーロール", "ru": "Ролл Радуга"}',
     '{"en": "California roll topped with assorted sashimi", "ja": "様々な刺身をのせたカリフォルニアロール", "ru": "Калифорния с ассорти сашими"}',
     2400, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600', ARRAY['colorful', 'popular'], false, false, true, ARRAY['fish', 'shellfish', 'soy'], 4, true),

    ('bbbb0025-0025-0025-0025-000000000025', 'aaaa0002-0002-0002-0002-000000000002', 'ROLL-005', 'tempura-shrimp-roll',
     '{"en": "Tempura Shrimp Roll", "ja": "エビ天ロール", "ru": "Ролл с креветкой темпура"}',
     '{"en": "Crispy shrimp tempura with avocado and spicy mayo", "ja": "アボカドとスパイシーマヨのエビ天ぷら", "ru": "Хрустящая креветка темпура с авокадо"}',
     1980, 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600', ARRAY['crispy', 'popular'], false, false, true, ARRAY['shellfish', 'egg', 'gluten', 'soy'], 5, true),

    ('bbbb0026-0026-0026-0026-000000000026', 'aaaa0002-0002-0002-0002-000000000002', 'ROLL-006', 'philadelphia-roll',
     '{"en": "Philadelphia Roll", "ja": "フィラデルフィアロール", "ru": "Ролл Филадельфия"}',
     '{"en": "Fresh salmon with cream cheese and cucumber", "ja": "クリームチーズときゅうりのフレッシュサーモン", "ru": "Свежий лосось со сливочным сыром"}',
     1680, 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600', ARRAY['classic', 'popular'], false, false, true, ARRAY['fish', 'dairy', 'soy'], 6, true),

    -- Additional nigiri
    ('bbbb0027-0027-0027-0027-000000000027', 'aaaa0003-0003-0003-0003-000000000003', 'NIG-003', 'salmon-nigiri',
     '{"en": "Salmon Nigiri", "ja": "サーモンにぎり", "ru": "Нигири с лососем"}',
     '{"en": "Fresh Atlantic salmon over seasoned sushi rice", "ja": "新鮮なアトランティックサーモンの握り", "ru": "Свежий атлантический лосось на рисе"}',
     480, 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=600', ARRAY['classic'], false, false, true, ARRAY['fish', 'soy'], 3, true),

    ('bbbb0028-0028-0028-0028-000000000028', 'aaaa0003-0003-0003-0003-000000000003', 'NIG-004', 'ebi-nigiri',
     '{"en": "Ebi (Shrimp) Nigiri", "ja": "エビにぎり", "ru": "Нигири с креветкой"}',
     '{"en": "Cooked butterfly shrimp over seasoned rice", "ja": "蝶々開きのエビ握り", "ru": "Вареная креветка на рисе"}',
     420, 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=600', ARRAY['classic'], false, false, true, ARRAY['shellfish', 'soy'], 4, true),

    ('bbbb0029-0029-0029-0029-000000000029', 'aaaa0003-0003-0003-0003-000000000003', 'NIG-005', 'unagi-nigiri',
     '{"en": "Unagi (Eel) Nigiri", "ja": "うなぎにぎり", "ru": "Нигири с угрем"}',
     '{"en": "Grilled freshwater eel with sweet soy glaze", "ja": "甘いタレで焼き上げたうなぎ", "ru": "Жареный угорь в сладком соусе"}',
     680, 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=600', ARRAY['premium', 'traditional'], false, false, false, ARRAY['fish', 'soy'], 5, true)
ON CONFLICT (sku) DO NOTHING;

-- =============================================
-- ADDITIONAL CUSTOMERS (various scenarios)
-- =============================================

INSERT INTO customers (id, phone, first_name, last_name, email, status, bonus_balance, marketing_opt_in, language_code)
VALUES
    -- Regular customers
    ('cccc0007-0007-0007-0007-000000000007', '+81-90-7890-1234', 'Akiko', 'Nakamura', 'akiko.n@email.com', 'ACTIVE', 5500, true, 'ja'),
    ('cccc0008-0008-0008-0008-000000000008', '+81-80-8901-2345', 'Taro', 'Kobayashi', 'taro.k@email.com', 'ACTIVE', 12000, true, 'ja'),
    ('cccc0009-0009-0009-0009-000000000009', '+81-70-9012-3456', 'Maria', 'Garcia', 'maria.g@email.com', 'ACTIVE', 800, true, 'en'),
    ('cccc0010-0010-0010-0010-000000000010', '+81-90-0123-4567', 'Alex', 'Johnson', 'alex.j@email.com', 'ACTIVE', 3200, false, 'en'),
    ('cccc0011-0011-0011-0011-000000000011', '+81-80-1234-5670', 'Dmitri', 'Petrov', 'dmitri.p@email.com', 'ACTIVE', 6800, true, 'ru'),
    ('cccc0012-0012-0012-0012-000000000012', '+81-70-2345-6781', 'Anna', 'Sokolova', 'anna.s@email.com', 'ACTIVE', 950, true, 'ru'),
    -- VIP customers (high bonus balance)
    ('cccc0013-0013-0013-0013-000000000013', '+81-90-3456-7892', 'Masahiro', 'Hayashi', 'masahiro.h@email.com', 'ACTIVE', 25000, true, 'ja'),
    ('cccc0014-0014-0014-0014-000000000014', '+81-80-4567-8903', 'Emily', 'Chen', 'emily.c@email.com', 'ACTIVE', 18500, true, 'en'),
    -- New customer (no orders yet)
    ('cccc0015-0015-0015-0015-000000000015', '+81-70-5678-9014', 'New', 'Customer', 'new.customer@email.com', 'ACTIVE', 500, true, 'en')
ON CONFLICT (phone) DO NOTHING;

-- Additional customer addresses
INSERT INTO customer_addresses (customer_id, label, city, street, house, latitude, longitude, is_default)
VALUES
    ('cccc0007-0007-0007-0007-000000000007', 'Home', 'Tokyo', 'Meguro-ku', '3-15-8', 35.6413, 139.6980, true),
    ('cccc0008-0008-0008-0008-000000000008', 'Home', 'Tokyo', 'Setagaya-ku', '2-8-15', 35.6462, 139.6532, true),
    ('cccc0008-0008-0008-0008-000000000008', 'Work', 'Tokyo', 'Marunouchi', '1-1-1', 35.6812, 139.7671, false),
    ('cccc0009-0009-0009-0009-000000000009', 'Apartment', 'Tokyo', 'Roppongi', '6-10-1', 35.6605, 139.7292, true),
    ('cccc0010-0010-0010-0010-000000000010', 'Home', 'Tokyo', 'Nakano-ku', '5-52-15', 35.7074, 139.6638, true),
    ('cccc0011-0011-0011-0011-000000000011', 'Home', 'Tokyo', 'Shibuya-ku', '4-21-1', 35.6580, 139.7016, true),
    ('cccc0012-0012-0012-0012-000000000012', 'Home', 'Tokyo', 'Shinjuku-ku', '1-1-3', 35.6938, 139.7034, true),
    ('cccc0013-0013-0013-0013-000000000013', 'Home', 'Tokyo', 'Minato-ku', '4-2-8', 35.6628, 139.7400, true),
    ('cccc0013-0013-0013-0013-000000000013', 'Country House', 'Kanagawa', 'Kamakura', '2-3-5', 35.3192, 139.5467, false),
    ('cccc0014-0014-0014-0014-000000000014', 'Home', 'Tokyo', 'Bunkyo-ku', '3-28-6', 35.7090, 139.7527, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- ADDITIONAL EMPLOYEES
-- =============================================

INSERT INTO employees (id, role_code, email, phone, first_name, last_name, password_hash, status, is_active)
VALUES
    -- Super Admin
    ('dddd0006-0006-0006-0006-000000000006', 'SUPER_ADMIN', 'superadmin@sushimei.jp', '+81-3-0000-0006', 'Super', 'Admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    -- Additional managers for different spots
    ('dddd0007-0007-0007-0007-000000000007', 'MANAGER', 'manager.shibuya@sushimei.jp', '+81-3-0000-0007', 'Shibuya', 'Manager', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    ('dddd0008-0008-0008-0008-000000000008', 'MANAGER', 'manager.shinjuku@sushimei.jp', '+81-3-0000-0008', 'Shinjuku', 'Manager', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    -- Additional kitchen staff
    ('dddd0009-0009-0009-0009-000000000009', 'KITCHEN', 'chef.shibuya@sushimei.jp', '+81-3-0000-0009', 'Shibuya', 'Chef', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    ('dddd0010-0010-0010-0010-000000000010', 'KITCHEN', 'chef.shinjuku@sushimei.jp', '+81-3-0000-0010', 'Shinjuku', 'Chef', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    -- Additional couriers
    ('dddd0011-0011-0011-0011-000000000011', 'COURIER', 'courier2@sushimei.jp', '+81-3-0000-0011', 'Courier', 'Two', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    ('dddd0012-0012-0012-0012-000000000012', 'COURIER', 'courier3@sushimei.jp', '+81-3-0000-0012', 'Courier', 'Three', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    -- Spot operator
    ('dddd0013-0013-0013-0013-000000000013', 'SPOT_OPERATOR', 'operator@sushimei.jp', '+81-3-0000-0013', 'Spot', 'Operator', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'ACTIVE', true),
    -- Inactive employee
    ('dddd0014-0014-0014-0014-000000000014', 'CASHIER', 'inactive@sushimei.jp', '+81-3-0000-0014', 'Inactive', 'Employee', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MJ0KjlF6DuXpqGwBh8F5k2K8Y9E8O4e', 'INACTIVE', false)
ON CONFLICT (email) DO NOTHING;

-- Assign additional employees to spots
INSERT INTO employee_spots (employee_id, spot_id)
VALUES
    ('dddd0007-0007-0007-0007-000000000007', '22222222-2222-2222-2222-222222222222'),
    ('dddd0008-0008-0008-0008-000000000008', '33333333-3333-3333-3333-333333333333'),
    ('dddd0009-0009-0009-0009-000000000009', '22222222-2222-2222-2222-222222222222'),
    ('dddd0010-0010-0010-0010-000000000010', '33333333-3333-3333-3333-333333333333'),
    ('dddd0011-0011-0011-0011-000000000011', '11111111-1111-1111-1111-111111111111'),
    ('dddd0011-0011-0011-0011-000000000011', '22222222-2222-2222-2222-222222222222'),
    ('dddd0012-0012-0012-0012-000000000012', '22222222-2222-2222-2222-222222222222'),
    ('dddd0012-0012-0012-0012-000000000012', '33333333-3333-3333-3333-333333333333'),
    ('dddd0013-0013-0013-0013-000000000013', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- =============================================
-- ADDITIONAL PROMO CODES
-- =============================================

INSERT INTO promo_codes (id, code, title_i18n, description_i18n, discount_type, discount_value, min_order_amount, max_discount_amount, total_usage_limit, per_user_usage_limit, valid_from, valid_to, is_active)
VALUES
    ('eeee0004-0004-0004-0004-000000000004', 'LUNCH30',
     '{"en": "30% Off Lunch", "ja": "ランチ30%オフ", "ru": "Скидка 30% на ланч"}',
     '{"en": "30% off lunch combos (11AM-3PM)", "ja": "ランチコンボ30%オフ（11時〜15時）", "ru": "30% скидка на комбо ланч (11-15)"}',
     'PERCENT', 30, 1000, 1500, 200, 2, NOW(), NOW() + INTERVAL '2 weeks', true),

    ('eeee0005-0005-0005-0005-000000000005', 'FREEDELIVER',
     '{"en": "Free Delivery", "ja": "配達無料", "ru": "Бесплатная доставка"}',
     '{"en": "Free delivery on orders over ¥5000", "ja": "5000円以上で配達無料", "ru": "Бесплатная доставка от ¥5000"}',
     'FIXED', 600, 5000, 600, NULL, 5, NOW(), NOW() + INTERVAL '1 month', true),

    ('eeee0006-0006-0006-0006-000000000006', 'BIRTHDAY50',
     '{"en": "Birthday 50% Off", "ja": "誕生日50%オフ", "ru": "Скидка 50% на день рождения"}',
     '{"en": "50% off on your birthday month!", "ja": "誕生月50%オフ！", "ru": "50% скидка в месяц вашего дня рождения!"}',
     'PERCENT', 50, 3000, 10000, NULL, 1, NOW(), NOW() + INTERVAL '1 year', true),

    ('eeee0007-0007-0007-0007-000000000007', 'EXPIRED2023',
     '{"en": "Expired Promo", "ja": "期限切れ", "ru": "Истекший купон"}',
     '{"en": "This promo has expired", "ja": "このプロモは期限切れです", "ru": "Купон истек"}',
     'PERCENT', 25, 1000, 2000, 100, 1, NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', false),

    ('eeee0008-0008-0008-0008-000000000008', 'FUTURE2025',
     '{"en": "Future Promo", "ja": "将来のプロモ", "ru": "Будущий купон"}',
     '{"en": "Coming soon!", "ja": "近日公開！", "ru": "Скоро!"}',
     'PERCENT', 40, 2000, 5000, 500, 2, NOW() + INTERVAL '6 months', NOW() + INTERVAL '8 months', true)
ON CONFLICT (code) DO NOTHING;

-- Link some promos to specific spots
INSERT INTO promo_code_spots (promo_code_id, spot_id)
VALUES
    ('eeee0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111'),
    ('eeee0004-0004-0004-0004-000000000004', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Link some promos to specific categories
INSERT INTO promo_code_categories (promo_code_id, category_id)
VALUES
    ('eeee0004-0004-0004-0004-000000000004', 'aaaa0007-0007-0007-0007-000000000007')
ON CONFLICT DO NOTHING;

-- =============================================
-- ADDITIONAL ORDERS (various statuses)
-- =============================================

INSERT INTO orders (id, order_number, customer_id, spot_id, status, order_type, payment_type, customer_name, customer_phone, subtotal_amount, delivery_fee_amount, total_amount, created_at)
VALUES
    -- More recent orders
    ('ffff0007-0007-0007-0007-000000000007', 'ORD-2024-0007', 'cccc0007-0007-0007-0007-000000000007', '11111111-1111-1111-1111-111111111111', 'RECEIVED', 'DELIVERY', 'CARD', 'Akiko Nakamura', '+81-90-7890-1234', 4980, 500, 5480, NOW() - INTERVAL '2 minutes'),
    ('ffff0008-0008-0008-0008-000000000008', 'ORD-2024-0008', 'cccc0008-0008-0008-0008-000000000008', '22222222-2222-2222-2222-222222222222', 'CONFIRMED', 'PICKUP', 'CASH', 'Taro Kobayashi', '+81-80-8901-2345', 8900, 0, 8900, NOW() - INTERVAL '8 minutes'),
    ('ffff0009-0009-0009-0009-000000000009', 'ORD-2024-0009', 'cccc0009-0009-0009-0009-000000000009', '33333333-3333-3333-3333-333333333333', 'PREPARING', 'DELIVERY', 'CARD', 'Maria Garcia', '+81-70-9012-3456', 6200, 450, 6650, NOW() - INTERVAL '12 minutes'),
    ('ffff0010-0010-0010-0010-000000000010', 'ORD-2024-0010', 'cccc0010-0010-0010-0010-000000000010', '11111111-1111-1111-1111-111111111111', 'READY', 'PICKUP', 'CARD', 'Alex Johnson', '+81-90-0123-4567', 3180, 0, 3180, NOW() - INTERVAL '18 minutes'),
    ('ffff0011-0011-0011-0011-000000000011', 'ORD-2024-0011', 'cccc0011-0011-0011-0011-000000000011', '22222222-2222-2222-2222-222222222222', 'ON_THE_WAY', 'DELIVERY', 'CASH', 'Dmitri Petrov', '+81-80-1234-5670', 12500, 600, 13100, NOW() - INTERVAL '25 minutes'),
    ('ffff0012-0012-0012-0012-000000000012', 'ORD-2024-0012', 'cccc0012-0012-0012-0012-000000000012', '33333333-3333-3333-3333-333333333333', 'DELIVERED', 'DELIVERY', 'CARD', 'Anna Sokolova', '+81-70-2345-6781', 7800, 450, 8250, NOW() - INTERVAL '45 minutes'),
    -- VIP orders
    ('ffff0013-0013-0013-0013-000000000013', 'ORD-2024-0013', 'cccc0013-0013-0013-0013-000000000013', '11111111-1111-1111-1111-111111111111', 'COMPLETED', 'DELIVERY', 'CARD', 'Masahiro Hayashi', '+81-90-3456-7892', 25800, 500, 26300, NOW() - INTERVAL '2 hours'),
    ('ffff0014-0014-0014-0014-000000000014', 'ORD-2024-0014', 'cccc0014-0014-0014-0014-000000000014', '22222222-2222-2222-2222-222222222222', 'COMPLETED', 'PICKUP', 'CARD', 'Emily Chen', '+81-80-4567-8903', 18900, 0, 18900, NOW() - INTERVAL '3 hours'),
    -- Cancelled order
    ('ffff0015-0015-0015-0015-000000000015', 'ORD-2024-0015', 'cccc0007-0007-0007-0007-000000000007', '11111111-1111-1111-1111-111111111111', 'CANCELLED', 'DELIVERY', 'CARD', 'Akiko Nakamura', '+81-90-7890-1234', 5600, 500, 6100, NOW() - INTERVAL '1 day'),
    -- Rejected order
    ('ffff0016-0016-0016-0016-000000000016', 'ORD-2024-0016', 'cccc0009-0009-0009-0009-000000000009', '33333333-3333-3333-3333-333333333333', 'REJECTED', 'DELIVERY', 'CASH', 'Maria Garcia', '+81-70-9012-3456', 4200, 450, 4650, NOW() - INTERVAL '5 hours'),
    -- Historical orders (older)
    ('ffff0017-0017-0017-0017-000000000017', 'ORD-2024-0017', 'cccc0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'COMPLETED', 'DELIVERY', 'CARD', 'Yuki Tanaka', '+81-90-1234-5678', 9800, 500, 10300, NOW() - INTERVAL '3 days'),
    ('ffff0018-0018-0018-0018-000000000018', 'ORD-2024-0018', 'cccc0002-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 'COMPLETED', 'PICKUP', 'CASH', 'Kenji Yamamoto', '+81-90-2345-6789', 5600, 0, 5600, NOW() - INTERVAL '4 days'),
    ('ffff0019-0019-0019-0019-000000000019', 'ORD-2024-0019', 'cccc0003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'COMPLETED', 'DELIVERY', 'CARD', 'Sakura Sato', '+81-80-3456-7890', 14200, 450, 14650, NOW() - INTERVAL '5 days'),
    ('ffff0020-0020-0020-0020-000000000020', 'ORD-2024-0020', 'cccc0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'COMPLETED', 'DELIVERY', 'CARD', 'Hiroshi Suzuki', '+81-70-4567-8901', 7400, 500, 7900, NOW() - INTERVAL '6 days')
ON CONFLICT (order_number) DO NOTHING;

-- Order items for new orders
INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
VALUES
    -- Order 7
    ('ffff0007-0007-0007-0007-000000000007', 'bbbb0017-0017-0017-0017-000000000017', '{"en": "Premium Dinner Set"}', 4980, 1, 4980),
    -- Order 8
    ('ffff0008-0008-0008-0008-000000000008', 'bbbb0001-0001-0001-0001-000000000001', '{"en": "Omakase Signature Set"}', 8900, 1, 8900),
    -- Order 9
    ('ffff0009-0009-0009-0009-000000000009', 'bbbb0003-0003-0003-0003-000000000003', '{"en": "Truffle Salmon Aburi"}', 2800, 1, 2800),
    ('ffff0009-0009-0009-0009-000000000009', 'bbbb0004-0004-0004-0004-000000000004', '{"en": "Spicy Bluefin Tuna Roll"}', 3200, 1, 3200),
    -- Order 10
    ('ffff0010-0010-0010-0010-000000000010', 'bbbb0015-0015-0015-0015-000000000015', '{"en": "Lunch Combo A"}', 1580, 2, 3160),
    -- Order 11
    ('ffff0011-0011-0011-0011-000000000011', 'bbbb0002-0002-0002-0002-000000000002', '{"en": "Deluxe Sushi Platter"}', 12500, 1, 12500),
    -- Order 12
    ('ffff0012-0012-0012-0012-000000000012', 'bbbb0006-0006-0006-0006-000000000006', '{"en": "Wagyu Beef Nigiri"}', 1800, 2, 3600),
    ('ffff0012-0012-0012-0012-000000000012', 'bbbb0007-0007-0007-0007-000000000007', '{"en": "Otoro (Fatty Tuna) Nigiri"}', 2200, 2, 4200),
    -- Order 13 (VIP)
    ('ffff0013-0013-0013-0013-000000000013', 'bbbb0001-0001-0001-0001-000000000001', '{"en": "Omakase Signature Set"}', 8900, 2, 17800),
    ('ffff0013-0013-0013-0013-000000000013', 'bbbb0008-0008-0008-0008-000000000008', '{"en": "Wagyu Sashimi"}', 3500, 2, 7000),
    -- Order 14 (VIP)
    ('ffff0014-0014-0014-0014-000000000014', 'bbbb0002-0002-0002-0002-000000000002', '{"en": "Deluxe Sushi Platter"}', 12500, 1, 12500),
    ('ffff0014-0014-0014-0014-000000000014', 'bbbb0009-0009-0009-0009-000000000009', '{"en": "Yellowtail Jalapeño"}', 2400, 2, 4800),
    ('ffff0014-0014-0014-0014-000000000014', 'bbbb0015-0015-0015-0015-000000000015', '{"en": "Lunch Combo A"}', 1580, 1, 1580)
ON CONFLICT DO NOTHING;

-- Order status timeline for new orders
INSERT INTO order_status_timeline (order_id, status, changed_by, note, created_at)
VALUES
    ('ffff0007-0007-0007-0007-000000000007', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '2 minutes'),
    ('ffff0008-0008-0008-0008-000000000008', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '8 minutes'),
    ('ffff0008-0008-0008-0008-000000000008', 'CONFIRMED', 'dddd0007-0007-0007-0007-000000000007', 'Confirmed by Shibuya Manager', NOW() - INTERVAL '5 minutes'),
    ('ffff0009-0009-0009-0009-000000000009', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '12 minutes'),
    ('ffff0009-0009-0009-0009-000000000009', 'CONFIRMED', 'dddd0008-0008-0008-0008-000000000008', 'Confirmed', NOW() - INTERVAL '10 minutes'),
    ('ffff0009-0009-0009-0009-000000000009', 'PREPARING', 'dddd0010-0010-0010-0010-000000000010', 'Kitchen started', NOW() - INTERVAL '8 minutes'),
    ('ffff0010-0010-0010-0010-000000000010', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '18 minutes'),
    ('ffff0010-0010-0010-0010-000000000010', 'CONFIRMED', 'dddd0002-0002-0002-0002-000000000002', 'Confirmed', NOW() - INTERVAL '15 minutes'),
    ('ffff0010-0010-0010-0010-000000000010', 'PREPARING', 'dddd0003-0003-0003-0003-000000000003', 'Kitchen started', NOW() - INTERVAL '12 minutes'),
    ('ffff0010-0010-0010-0010-000000000010', 'READY', 'dddd0003-0003-0003-0003-000000000003', 'Ready for pickup', NOW() - INTERVAL '5 minutes'),
    ('ffff0011-0011-0011-0011-000000000011', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '25 minutes'),
    ('ffff0011-0011-0011-0011-000000000011', 'CONFIRMED', 'dddd0007-0007-0007-0007-000000000007', 'Confirmed', NOW() - INTERVAL '22 minutes'),
    ('ffff0011-0011-0011-0011-000000000011', 'PREPARING', 'dddd0009-0009-0009-0009-000000000009', 'Kitchen started', NOW() - INTERVAL '18 minutes'),
    ('ffff0011-0011-0011-0011-000000000011', 'READY', 'dddd0009-0009-0009-0009-000000000009', 'Ready', NOW() - INTERVAL '10 minutes'),
    ('ffff0011-0011-0011-0011-000000000011', 'ON_THE_WAY', 'dddd0012-0012-0012-0012-000000000012', 'Out for delivery', NOW() - INTERVAL '5 minutes'),
    ('ffff0015-0015-0015-0015-000000000015', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '1 day'),
    ('ffff0015-0015-0015-0015-000000000015', 'CANCELLED', 'cccc0007-0007-0007-0007-000000000007', 'Customer cancelled: Changed mind', NOW() - INTERVAL '23 hours'),
    ('ffff0016-0016-0016-0016-000000000016', 'RECEIVED', NULL, 'Order placed', NOW() - INTERVAL '5 hours'),
    ('ffff0016-0016-0016-0016-000000000016', 'REJECTED', 'dddd0008-0008-0008-0008-000000000008', 'Out of stock for key ingredients', NOW() - INTERVAL '4 hours 55 minutes')
ON CONFLICT DO NOTHING;

-- =============================================
-- REVIEWS
-- =============================================

INSERT INTO reviews (order_id, customer_id, rating, comment, created_at)
VALUES
    ('ffff0001-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000001', 5, 'Absolutely amazing! The freshest sushi I have ever had. Will definitely order again!', NOW() - INTERVAL '1 day 20 hours'),
    ('ffff0002-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000002', 4, 'Great quality and fast service. Pickup was easy.', NOW() - INTERVAL '20 hours'),
    ('ffff0012-0012-0012-0012-000000000012', 'cccc0012-0012-0012-0012-000000000012', 5, 'The wagyu nigiri was incredible! Melted in my mouth.', NOW() - INTERVAL '30 minutes'),
    ('ffff0013-0013-0013-0013-000000000013', 'cccc0013-0013-0013-0013-000000000013', 5, 'As a regular customer, I can say the quality is consistently excellent. VIP treatment is appreciated!', NOW() - INTERVAL '1 hour 45 minutes'),
    ('ffff0014-0014-0014-0014-000000000014', 'cccc0014-0014-0014-0014-000000000014', 4, 'Delicious as always. The yellowtail was perfect.', NOW() - INTERVAL '2 hours 30 minutes'),
    ('ffff0017-0017-0017-0017-000000000017', 'cccc0001-0001-0001-0001-000000000001', 5, 'Second order this week and still impressed!', NOW() - INTERVAL '2 days 18 hours'),
    ('ffff0018-0018-0018-0018-000000000018', 'cccc0002-0002-0002-0002-000000000002', 3, 'Good sushi but the wait was a bit longer than expected.', NOW() - INTERVAL '3 days 20 hours'),
    ('ffff0019-0019-0019-0019-000000000019', 'cccc0003-0003-0003-0003-000000000003', 5, 'Perfect for our family dinner. Everyone loved it!', NOW() - INTERVAL '4 days 18 hours')
ON CONFLICT (order_id, customer_id) DO NOTHING;

-- =============================================
-- FAVORITE PRODUCTS
-- =============================================

INSERT INTO favorite_products (customer_id, product_id, created_at)
VALUES
    ('cccc0001-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000001', NOW() - INTERVAL '10 days'),
    ('cccc0001-0001-0001-0001-000000000001', 'bbbb0003-0003-0003-0003-000000000003', NOW() - INTERVAL '8 days'),
    ('cccc0002-0002-0002-0002-000000000002', 'bbbb0001-0001-0001-0001-000000000001', NOW() - INTERVAL '15 days'),
    ('cccc0002-0002-0002-0002-000000000002', 'bbbb0006-0006-0006-0006-000000000006', NOW() - INTERVAL '12 days'),
    ('cccc0003-0003-0003-0003-000000000003', 'bbbb0002-0002-0002-0002-000000000002', NOW() - INTERVAL '20 days'),
    ('cccc0007-0007-0007-0007-000000000007', 'bbbb0004-0004-0004-0004-000000000004', NOW() - INTERVAL '5 days'),
    ('cccc0008-0008-0008-0008-000000000008', 'bbbb0007-0007-0007-0007-000000000007', NOW() - INTERVAL '7 days'),
    ('cccc0008-0008-0008-0008-000000000008', 'bbbb0008-0008-0008-0008-000000000008', NOW() - INTERVAL '6 days'),
    ('cccc0013-0013-0013-0013-000000000013', 'bbbb0001-0001-0001-0001-000000000001', NOW() - INTERVAL '30 days'),
    ('cccc0013-0013-0013-0013-000000000013', 'bbbb0002-0002-0002-0002-000000000002', NOW() - INTERVAL '25 days'),
    ('cccc0013-0013-0013-0013-000000000013', 'bbbb0008-0008-0008-0008-000000000008', NOW() - INTERVAL '20 days'),
    ('cccc0014-0014-0014-0014-000000000014', 'bbbb0009-0009-0009-0009-000000000009', NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- PROMO USAGES
-- =============================================

INSERT INTO promo_usages (promo_code_id, customer_id, order_id, discount_amount, used_at)
VALUES
    ('eeee0001-0001-0001-0001-000000000001', 'cccc0007-0007-0007-0007-000000000007', 'ffff0007-0007-0007-0007-000000000007', 996, NOW() - INTERVAL '2 minutes'),
    ('eeee0002-0002-0002-0002-000000000002', 'cccc0011-0011-0011-0011-000000000011', 'ffff0011-0011-0011-0011-000000000011', 500, NOW() - INTERVAL '25 minutes'),
    ('eeee0003-0003-0003-0003-000000000003', 'cccc0013-0013-0013-0013-000000000013', 'ffff0013-0013-0013-0013-000000000013', 3870, NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- =============================================
-- BONUS LEDGER (more transactions)
-- =============================================

INSERT INTO bonus_ledger (customer_id, order_id, txn_type, points, balance_after, reason)
VALUES
    ('cccc0007-0007-0007-0007-000000000007', 'ffff0007-0007-0007-0007-000000000007', 'EARN', 54, 5500, 'Earned from order ORD-2024-0007'),
    ('cccc0008-0008-0008-0008-000000000008', 'ffff0008-0008-0008-0008-000000000008', 'EARN', 89, 12000, 'Earned from order ORD-2024-0008'),
    ('cccc0013-0013-0013-0013-000000000013', NULL, 'ADJUSTMENT', 2500, 25000, 'VIP tier upgrade bonus'),
    ('cccc0013-0013-0013-0013-000000000013', 'ffff0013-0013-0013-0013-000000000013', 'SPEND', -2000, 23000, 'Used for order ORD-2024-0013'),
    ('cccc0013-0013-0013-0013-000000000013', 'ffff0013-0013-0013-0013-000000000013', 'EARN', 263, 23263, 'Earned from order ORD-2024-0013'),
    ('cccc0014-0014-0014-0014-000000000014', NULL, 'ADJUSTMENT', 1000, 18500, 'Birthday bonus'),
    ('cccc0014-0014-0014-0014-000000000014', 'ffff0014-0014-0014-0014-000000000014', 'EARN', 189, 18689, 'Earned from order ORD-2024-0014')
ON CONFLICT DO NOTHING;

-- =============================================
-- BONUS RULES
-- =============================================

INSERT INTO bonus_rules (id, is_active, earn_percent, spend_rate, min_order_to_earn, max_spend_percent, expires_in_days)
VALUES
    ('d0000001-0001-0001-0001-000000000001', true, 1.00, 1.00, 1000, 50, 365)
ON CONFLICT DO NOTHING;

-- =============================================
-- DELIVERY ZONES
-- =============================================

INSERT INTO spot_delivery_zones (spot_id, name, zone_geojson, extra_fee, min_eta_minutes, max_eta_minutes, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Zone A - Central',
     '{"type": "Polygon", "coordinates": [[[139.75, 35.66], [139.78, 35.66], [139.78, 35.69], [139.75, 35.69], [139.75, 35.66]]]}',
     0, 15, 25, true),
    ('11111111-1111-1111-1111-111111111111', 'Zone B - Extended',
     '{"type": "Polygon", "coordinates": [[[139.72, 35.63], [139.81, 35.63], [139.81, 35.72], [139.72, 35.72], [139.72, 35.63]]]}',
     200, 25, 40, true),
    ('22222222-2222-2222-2222-222222222222', 'Zone A - Shibuya Center',
     '{"type": "Polygon", "coordinates": [[[139.68, 35.64], [139.72, 35.64], [139.72, 35.68], [139.68, 35.68], [139.68, 35.64]]]}',
     0, 15, 25, true),
    ('33333333-3333-3333-3333-333333333333', 'Zone A - Shinjuku Center',
     '{"type": "Polygon", "coordinates": [[[139.68, 35.68], [139.72, 35.68], [139.72, 35.72], [139.68, 35.72], [139.68, 35.68]]]}',
     0, 15, 25, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- NOTIFICATION TEMPLATES
-- =============================================

INSERT INTO notification_templates (id, channel, code, subject_template, body_template_i18n, is_active)
VALUES
    ('e0000001-0001-0001-0001-000000000001', 'SMS', 'order_confirmed',
     NULL,
     '{"en": "Your order #{{order_number}} has been confirmed! Estimated time: {{eta}} minutes.", "ja": "ご注文 #{{order_number}} が確認されました！予想時間：{{eta}}分", "ru": "Ваш заказ #{{order_number}} подтвержден! Ожидаемое время: {{eta}} минут."}',
     true),
    ('e0000002-0002-0002-0002-000000000002', 'SMS', 'order_ready',
     NULL,
     '{"en": "Your order #{{order_number}} is ready for pickup!", "ja": "ご注文 #{{order_number}} の準備ができました！", "ru": "Ваш заказ #{{order_number}} готов к выдаче!"}',
     true),
    ('e0000003-0003-0003-0003-000000000003', 'SMS', 'order_on_way',
     NULL,
     '{"en": "Your order #{{order_number}} is on the way! Driver: {{driver_name}}", "ja": "ご注文 #{{order_number}} は配達中です！ドライバー：{{driver_name}}", "ru": "Ваш заказ #{{order_number}} в пути! Курьер: {{driver_name}}"}',
     true),
    ('e0000004-0004-0004-0004-000000000004', 'EMAIL', 'welcome',
     'Welcome to SushiMei!',
     '{"en": "Welcome to SushiMei, {{name}}! Enjoy premium sushi delivered to your door. Use code WELCOME20 for 20% off your first order!", "ja": "{{name}}様、寿司美へようこそ！プレミアム寿司をお届けします。初回注文20%オフコード：WELCOME20", "ru": "Добро пожаловать в SushiMei, {{name}}! Премиум суши с доставкой. Используйте код WELCOME20 для скидки 20% на первый заказ!"}',
     true),
    ('e0000005-0005-0005-0005-000000000005', 'EMAIL', 'order_receipt',
     'Your SushiMei Order Receipt #{{order_number}}',
     '{"en": "Thank you for your order! Here is your receipt for order #{{order_number}}. Total: {{total}}", "ja": "ご注文ありがとうございます！注文 #{{order_number}} の領収書です。合計：{{total}}", "ru": "Спасибо за заказ! Вот ваш чек для заказа #{{order_number}}. Итого: {{total}}"}',
     true)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- SYSTEM SETTINGS
-- =============================================

INSERT INTO system_settings (key, value, updated_at)
VALUES
    ('general.currency', '"JPY"', NOW()),
    ('general.timezone', '"Asia/Tokyo"', NOW()),
    ('general.languages', '["en", "ja", "ru"]', NOW()),
    ('order.min_order_amount', '1000', NOW()),
    ('order.max_order_amount', '500000', NOW()),
    ('order.auto_confirm_enabled', 'false', NOW()),
    ('order.auto_confirm_delay_minutes', '5', NOW()),
    ('delivery.default_fee', '500', NOW()),
    ('delivery.free_delivery_threshold', '5000', NOW()),
    ('delivery.max_distance_km', '10', NOW()),
    ('bonus.earn_rate_percent', '1', NOW()),
    ('bonus.min_order_to_earn', '1000', NOW()),
    ('bonus.max_spend_percent', '50', NOW()),
    ('bonus.expiry_days', '365', NOW()),
    ('notification.sms_enabled', 'true', NOW()),
    ('notification.email_enabled', 'true', NOW()),
    ('notification.push_enabled', 'false', NOW()),
    ('app.maintenance_mode', 'false', NOW()),
    ('app.version', '"1.0.0"', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =============================================
-- AUDIT LOGS (sample entries)
-- =============================================

INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data, ip_address, created_at)
VALUES
    ('dddd0001-0001-0001-0001-000000000001', 'ADMIN', 'CREATE', 'promo_code', 'eeee0001-0001-0001-0001-000000000001', NULL, '{"code": "WELCOME20", "discount_value": 20}', '192.168.1.1', NOW() - INTERVAL '30 days'),
    ('dddd0002-0002-0002-0002-000000000002', 'MANAGER', 'UPDATE', 'order', 'ffff0001-0001-0001-0001-000000000001', '{"status": "RECEIVED"}', '{"status": "CONFIRMED"}', '192.168.1.2', NOW() - INTERVAL '2 days'),
    ('dddd0003-0003-0003-0003-000000000003', 'KITCHEN', 'UPDATE', 'order', 'ffff0001-0001-0001-0001-000000000001', '{"status": "CONFIRMED"}', '{"status": "PREPARING"}', '192.168.1.3', NOW() - INTERVAL '2 days'),
    ('dddd0005-0005-0005-0005-000000000005', 'COURIER', 'UPDATE', 'order', 'ffff0001-0001-0001-0001-000000000001', '{"status": "READY"}', '{"status": "ON_THE_WAY"}', '192.168.1.5', NOW() - INTERVAL '2 days'),
    ('dddd0001-0001-0001-0001-000000000001', 'ADMIN', 'CREATE', 'employee', 'dddd0007-0007-0007-0007-000000000007', NULL, '{"email": "manager.shibuya@sushimei.jp", "role_code": "MANAGER"}', '192.168.1.1', NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- Update product availability for all new products
INSERT INTO product_availability (product_id, spot_id, is_available, stock_qty)
SELECT p.id, s.id, true, 50
FROM products p, spots s
WHERE p.deleted_at IS NULL AND s.deleted_at IS NULL
ON CONFLICT (product_id, spot_id) DO NOTHING;
