-- ============================================================
-- Test SQL: Insert sample addons and a customer order with addons
-- Run in Supabase SQL Editor to test addon display in POS
-- ============================================================

-- 1. Insert sample addons (uses text IDs to match existing schema)
INSERT INTO addons (id, name, price, is_available) VALUES
  ('addon-rice',    'Extra Rice',     25.00, true),
  ('addon-sauce',   'Extra Sauce',    15.00, true),
  ('addon-egg',     'Egg',            20.00, true),
  ('addon-cheese',  'Cheese',         30.00, true),
  ('addon-spicy',   'Spicy Upgrade',  10.00, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Verify addons were inserted
SELECT * FROM addons;

-- 3. Insert a test customer order with addons
--    Replace the productID values below with actual IDs from your products table.
--    Run: SELECT "productID", "productName", price FROM products WHERE is_current = true LIMIT 5;

-- First, create a guest session (simulates a customer scanning QR)
INSERT INTO guest_sessions ("sessionID", status)
VALUES (gen_random_uuid(), 'active')
RETURNING "sessionID";
-- Copy the returned sessionID and paste below:

-- INSERT the order (replace <SESSION_ID> with the UUID from above)
-- The queue number trigger will auto-set queueNumber
/*
INSERT INTO orders ("sessionID", "orderType", "discountType", status, paymentstatus)
VALUES ('<SESSION_ID>', 'Dine-In', 'None', 'Pending', 'Unpaid')
RETURNING "orderID", "queueNumber";
*/

-- INSERT order items with addons (replace <ORDER_ID> and <PRODUCT_ID>)
/*
INSERT INTO order_items ("orderID", "productID", quantity, price, "selectedAddons")
VALUES
  (<ORDER_ID>, <PRODUCT_ID_1>, 2, 150.00,
    '[{"id": "addon-rice", "name": "Extra Rice", "price": 25}, {"id": "addon-egg", "name": "Egg", "price": 20}]'::jsonb
  ),
  (<ORDER_ID>, <PRODUCT_ID_2>, 1, 200.00,
    '[{"id": "addon-sauce", "name": "Extra Sauce", "price": 15}]'::jsonb
  );
*/

-- ============================================================
-- Quick one-shot version (creates everything in one go):
-- ============================================================
DO $$
DECLARE
  v_session UUID;
  v_order_id INT;
  v_product_1 INT;
  v_product_2 INT;
BEGIN
  -- Pick two available products
  SELECT "productID" INTO v_product_1
    FROM products WHERE is_current = true AND status = 'AVAILABLE'
    ORDER BY "productID" LIMIT 1;

  SELECT "productID" INTO v_product_2
    FROM products WHERE is_current = true AND status = 'AVAILABLE'
    ORDER BY "productID" LIMIT 1 OFFSET 1;

  IF v_product_1 IS NULL OR v_product_2 IS NULL THEN
    RAISE EXCEPTION 'Need at least 2 available products to run this test';
  END IF;

  -- Create guest session
  INSERT INTO guest_sessions ("sessionID", status)
  VALUES (gen_random_uuid(), 'active')
  RETURNING "sessionID" INTO v_session;

  -- Create order (queue number trigger fires here)
  INSERT INTO orders ("sessionID", "orderType", "discountType", status, paymentstatus)
  VALUES (v_session, 'Dine-In', 'Senior', 'Pending', 'Unpaid')
  RETURNING "orderID" INTO v_order_id;

  -- Insert items with addons
  INSERT INTO order_items ("orderID", "productID", quantity, price, "selectedAddons")
  VALUES
    (v_order_id, v_product_1, 2, (SELECT price FROM products WHERE "productID" = v_product_1),
      '[{"id": "addon-rice", "name": "Extra Rice", "price": 25}, {"id": "addon-egg", "name": "Egg", "price": 20}]'::jsonb
    ),
    (v_order_id, v_product_2, 1, (SELECT price FROM products WHERE "productID" = v_product_2),
      '[{"id": "addon-sauce", "name": "Extra Sauce", "price": 15}]'::jsonb
    );

  RAISE NOTICE 'Created test order #% with session % and queue number assigned by trigger', v_order_id, v_session;
END;
$$;

-- Verify: see the order with addons
SELECT o."orderID", o."queueNumber", o."sessionID", o."discountType", o.status,
       oi."orderItemID", oi.quantity, oi.price, oi."selectedAddons",
       p."productName"
  FROM orders o
  JOIN order_items oi ON oi."orderID" = o."orderID"
  JOIN products p ON p."productID" = oi."productID"
 WHERE o."sessionID" IS NOT NULL
 ORDER BY o."orderID" DESC
 LIMIT 10;
