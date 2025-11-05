#!/bin/bash

BASE_URL="http://localhost:3000"
echo "======================================="
echo "Local Eats API Test Suite"
echo "======================================="
echo ""

echo "1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"sarah.johnson@email.com","password":"password123"}' \
  $BASE_URL/api/auth/login)
echo "$LOGIN_RESPONSE" | head -c 200
echo "..."
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
else
  echo "✅ Login successful"
fi
echo ""

echo "2. Testing Restaurants List..."
RESTAURANTS_RESPONSE=$(curl -s "$BASE_URL/api/restaurants?limit=3")
echo "$RESTAURANTS_RESPONSE" | head -c 200
echo "..."
if echo "$RESTAURANTS_RESPONSE" | grep -q "restaurants"; then
  echo "✅ Restaurants endpoint working"
else
  echo "❌ Restaurants endpoint failed"
fi
echo ""

echo "3. Testing Restaurant Detail..."
RESTAURANT_DETAIL=$(curl -s "$BASE_URL/api/restaurants/rest_001")
echo "$RESTAURANT_DETAIL" | head -c 200
echo "..."
if echo "$RESTAURANT_DETAIL" | grep -q "restaurant_name"; then
  echo "✅ Restaurant detail endpoint working"
else
  echo "❌ Restaurant detail endpoint failed"
fi
echo ""

echo "4. Testing Menu Items..."
MENU_ITEMS=$(curl -s "$BASE_URL/api/restaurants/rest_001/menu")
echo "$MENU_ITEMS" | head -c 200
echo "..."
if echo "$MENU_ITEMS" | grep -q "menu_item_id"; then
  echo "✅ Menu items endpoint working"
else
  echo "❌ Menu items endpoint failed"
fi
echo ""

echo "5. Testing User Profile (authenticated)..."
USER_PROFILE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/users/user_001")
echo "$USER_PROFILE" | head -c 200
echo "..."
if echo "$USER_PROFILE" | grep -q "user_id"; then
  echo "✅ User profile endpoint working"
else
  echo "❌ User profile endpoint failed"
fi
echo ""

echo "6. Testing Reviews..."
REVIEWS=$(curl -s "$BASE_URL/api/restaurants/rest_001/reviews?limit=3")
echo "$REVIEWS" | head -c 200
echo "..."
if echo "$REVIEWS" | grep -q "review_id"; then
  echo "✅ Reviews endpoint working"
else
  echo "❌ Reviews endpoint failed"
fi
echo ""

echo "======================================="
echo "API Test Suite Complete"
echo "======================================="
