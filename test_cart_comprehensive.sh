#!/bin/bash

API_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================"
echo "    CART MANAGEMENT TEST SUITE"
echo "======================================"
echo ""

# Login
echo "1. Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.johnson@email.com","password":"password123"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"auth_token":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Logged in successfully${NC}"
echo ""

# Clear cart
echo "2. Clearing cart..."
curl -s -X DELETE "$API_URL/api/cart" -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}✓ Cart cleared${NC}"
echo ""

# Add first item
echo "3. Adding Filet Mignon (quantity: 1)..."
ADD1=$(curl -s -X POST "$API_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id":"item_057","quantity":1}')
ITEM1_ID=$(echo "$ADD1" | sed -n 's/.*"cart_item_id":"\([^"]*\)".*/\1/p' | head -1)
if [ -z "$ITEM1_ID" ]; then
  echo -e "${RED}✗ Failed to add item (no cart_item_id)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Added item with ID: $ITEM1_ID${NC}"
echo ""

# Add second item
echo "4. Adding Lobster Tail (quantity: 2)..."
ADD2=$(curl -s -X POST "$API_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id":"item_058","quantity":2}')
ITEM2_ID=$(echo "$ADD2" | grep -o '"cart_item_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Added item with ID: $ITEM2_ID${NC}"
echo ""

# Increase quantity of first item
echo "5. Increasing Filet Mignon quantity to 5..."
UPDATE=$(curl -s -X PATCH "$API_URL/api/cart/items/$ITEM1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":5}')
NEW_QTY=$(echo "$UPDATE" | grep -o '"quantity":[0-9]*' | head -1 | cut -d':' -f2)
if [ "$NEW_QTY" = "5" ]; then
  echo -e "${GREEN}✓ Quantity updated to 5${NC}"
else
  echo -e "${RED}✗ Quantity update failed (got $NEW_QTY)${NC}"
  exit 1
fi
echo ""

# Decrease quantity
echo "6. Decreasing Filet Mignon quantity to 3..."
UPDATE2=$(curl -s -X PATCH "$API_URL/api/cart/items/$ITEM1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":3}')
NEW_QTY2=$(echo "$UPDATE2" | grep -o '"quantity":[0-9]*' | head -1 | cut -d':' -f2)
if [ "$NEW_QTY2" = "3" ]; then
  echo -e "${GREEN}✓ Quantity decreased to 3${NC}"
else
  echo -e "${RED}✗ Quantity decrease failed (got $NEW_QTY2)${NC}"
  exit 1
fi
echo ""

# Remove one item
echo "7. Removing Lobster Tail..."
REMOVE=$(curl -s -X DELETE "$API_URL/api/cart/items/$ITEM2_ID" \
  -H "Authorization: Bearer $TOKEN")
ITEM_COUNT=$(echo "$REMOVE" | grep -o '"cart_item_id"' | wc -l)
if [ "$ITEM_COUNT" = "1" ]; then
  echo -e "${GREEN}✓ Item removed (1 item remaining)${NC}"
else
  echo -e "${RED}✗ Item removal failed (got $ITEM_COUNT items)${NC}"
  exit 1
fi
echo ""

# Verify cart state
echo "8. Verifying cart state..."
CART=$(curl -s -X GET "$API_URL/api/cart" -H "Authorization: Bearer $TOKEN")
FINAL_QTY=$(echo "$CART" | grep -o '"quantity":[0-9]*' | cut -d':' -f2)
FINAL_ITEMS=$(echo "$CART" | grep -o '"cart_item_id"' | wc -l)
echo "   - Items in cart: $FINAL_ITEMS"
echo "   - Filet Mignon quantity: $FINAL_QTY"
if [ "$FINAL_ITEMS" = "1" ] && [ "$FINAL_QTY" = "3" ]; then
  echo -e "${GREEN}✓ Cart state correct${NC}"
else
  echo -e "${RED}✗ Cart state incorrect${NC}"
  exit 1
fi
echo ""

# Test clear cart
echo "9. Testing Clear Cart..."
CLEAR=$(curl -s -X DELETE "$API_URL/api/cart" -H "Authorization: Bearer $TOKEN")
if echo "$CLEAR" | grep -q "Cart cleared successfully"; then
  VERIFY=$(curl -s -X GET "$API_URL/api/cart" -H "Authorization: Bearer $TOKEN")
  EMPTY_COUNT=$(echo "$VERIFY" | grep -o '"cart_item_id"' | wc -l)
  if [ "$EMPTY_COUNT" = "0" ]; then
    echo -e "${GREEN}✓ Cart cleared successfully${NC}"
  else
    echo -e "${RED}✗ Cart not empty after clear${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ Clear cart failed${NC}"
  exit 1
fi
echo ""

echo "======================================"
echo -e "${GREEN}   ALL TESTS PASSED! ✓${NC}"
echo "======================================"
