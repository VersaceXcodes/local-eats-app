#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing Cart Fix ==="
echo ""

# 1. Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@example.com","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.auth_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Login successful"
echo ""

# 2. Add item to cart
echo "2. Adding item to cart..."
ADD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "menu_item_id": "item_057",
    "quantity": 1,
    "selected_size": null,
    "selected_addons": [],
    "selected_modifications": [],
    "special_instructions": null
  }')

CART_ITEMS=$(echo "$ADD_RESPONSE" | jq '.items | length')

if [ "$CART_ITEMS" -ge 1 ]; then
  echo "✅ Item added to cart successfully"
  echo "   Cart now has $CART_ITEMS item(s)"
else
  echo "❌ Failed to add item to cart"
  echo "$ADD_RESPONSE" | jq '.'
  exit 1
fi
echo ""

# 3. Get cart
echo "3. Retrieving cart..."
CART_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN")

RETRIEVED_ITEMS=$(echo "$CART_RESPONSE" | jq '.items | length')

if [ "$RETRIEVED_ITEMS" -ge 1 ]; then
  echo "✅ Cart retrieved successfully"
  echo "   Cart contains $RETRIEVED_ITEMS item(s)"
  ITEM_NAME=$(echo "$CART_RESPONSE" | jq -r '.items[0].item_name')
  echo "   Item: $ITEM_NAME"
else
  echo "❌ Cart is empty after adding item"
  echo "$CART_RESPONSE" | jq '.'
  exit 1
fi
echo ""

# 4. Clear cart
echo "4. Clearing cart..."
curl -s -X DELETE "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

CLEARED_CART=$(curl -s -X GET "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN")

CLEARED_ITEMS=$(echo "$CLEARED_CART" | jq '.items | length')

if [ "$CLEARED_ITEMS" -eq 0 ]; then
  echo "✅ Cart cleared successfully"
else
  echo "❌ Failed to clear cart"
  exit 1
fi
echo ""

echo "=== All cart tests passed! ==="
