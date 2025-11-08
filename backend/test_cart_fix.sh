#!/bin/bash

API_URL="http://localhost:3000"

echo "=== Testing Cart Fix ==="
echo ""

# Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@test.com","password":"testpass123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"auth_token":"[^"]*' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."
echo ""

# Clear cart first
echo "2. Clearing existing cart..."
curl -s -X DELETE "$API_URL/api/cart" -H "Authorization: Bearer $TOKEN" > /dev/null
echo "Cart cleared"
echo ""

# Add item to cart
echo "3. Adding item to cart..."
ADD_RESPONSE=$(curl -s -X POST "$API_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id":"item_057","quantity":1}')
echo "$ADD_RESPONSE" | grep -o '"cart_item_id":"[^"]*' | head -1
echo ""

# Get cart
echo "4. Getting cart..."
CART_RESPONSE=$(curl -s -X GET "$API_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN")
echo "$CART_RESPONSE" | grep -o '"cart_item_id":"[^"]*' | head -1
echo ""

# Extract cart_item_id
CART_ITEM_ID=$(echo "$CART_RESPONSE" | grep -o '"cart_item_id":"[^"]*' | cut -d'"' -f4 | head -1)
echo "Cart Item ID: $CART_ITEM_ID"
echo ""

if [ -z "$CART_ITEM_ID" ]; then
  echo "❌ FAILED: cart_item_id is missing!"
  exit 1
fi

# Update quantity
echo "5. Updating quantity to 5..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/cart/items/$CART_ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":5}')
echo "$UPDATE_RESPONSE" | grep -o '"quantity":[0-9]*' | head -1
echo ""

# Verify update
echo "6. Verifying update..."
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN")
QUANTITY=$(echo "$VERIFY_RESPONSE" | grep -o '"quantity":[0-9]*' | cut -d':' -f2 | head -1)
echo "New quantity: $QUANTITY"
echo ""

if [ "$QUANTITY" == "5" ]; then
  echo "✅ SUCCESS: Quantity update works!"
else
  echo "❌ FAILED: Quantity is $QUANTITY, expected 5"
  exit 1
fi

# Test remove item
echo "7. Removing item..."
REMOVE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/cart/items/$CART_ITEM_ID" \
  -H "Authorization: Bearer $TOKEN")
ITEM_COUNT=$(echo "$REMOVE_RESPONSE" | grep -o '"items":\[[^]]*\]' | grep -o 'cart_item_id' | wc -l)
echo "Items remaining: $ITEM_COUNT"

if [ "$ITEM_COUNT" == "0" ]; then
  echo "✅ SUCCESS: Item removal works!"
else
  echo "❌ FAILED: Items still in cart"
  exit 1
fi

echo ""
echo "=== All Tests Passed! ==="
