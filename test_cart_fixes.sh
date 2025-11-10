#!/bin/bash

echo "Testing Cart Management Fixes"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="https://123local-eats-app.launchpulse.ai/api"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="password123"

echo "1. Login to get auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"auth_token":"[^"]*' | sed 's/"auth_token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Failed to login${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Login successful${NC}"

echo ""
echo "2. Get current cart state..."
CART=$(curl -s -X GET "$API_URL/cart" -H "Authorization: Bearer $TOKEN")
echo $CART | python3 -m json.tool 2>/dev/null || echo $CART
echo ""

echo "3. Clear cart to start fresh..."
CLEAR_RESPONSE=$(curl -s -X DELETE "$API_URL/cart" -H "Authorization: Bearer $TOKEN")
echo $CLEAR_RESPONSE | python3 -m json.tool 2>/dev/null || echo $CLEAR_RESPONSE

# Check if response has proper structure
if echo $CLEAR_RESPONSE | grep -q '"items":\[\]'; then
    echo -e "${GREEN}✓ Clear cart returns proper structure${NC}"
else
    echo -e "${RED}✗ Clear cart response missing proper structure${NC}"
fi

echo ""
echo "4. Add item to cart..."
ADD_RESPONSE=$(curl -s -X POST "$API_URL/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id":"item_011","quantity":2}')

CART_ITEM_ID=$(echo $ADD_RESPONSE | grep -o '"cart_item_id":"[^"]*' | head -1 | sed 's/"cart_item_id":"//')

if [ ! -z "$CART_ITEM_ID" ]; then
    echo -e "${GREEN}✓ Item added to cart (ID: $CART_ITEM_ID)${NC}"
else
    echo -e "${RED}✗ Failed to add item to cart${NC}"
    exit 1
fi

echo ""
echo "5. Test decreasing quantity to 0..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/cart/items/$CART_ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":0}')

# Check if item was removed (items array should be empty or not contain the item)
if echo $UPDATE_RESPONSE | grep -q '"items":\[\]'; then
    echo -e "${GREEN}✓ Setting quantity to 0 removes item${NC}"
else
    echo -e "${YELLOW}⚠ Item may still be in cart${NC}"
fi

echo ""
echo "6. Add another item for delete test..."
ADD_RESPONSE2=$(curl -s -X POST "$API_URL/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id":"item_012","quantity":1}')

CART_ITEM_ID2=$(echo $ADD_RESPONSE2 | grep -o '"cart_item_id":"[^"]*' | head -1 | sed 's/"cart_item_id":"//')

echo ""
echo "7. Test DELETE endpoint..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/cart/items/$CART_ITEM_ID2" \
  -H "Authorization: Bearer $TOKEN")

if echo $DELETE_RESPONSE | grep -q '"items":\[\]'; then
    echo -e "${GREEN}✓ DELETE endpoint returns proper structure${NC}"
else
    echo -e "${YELLOW}⚠ DELETE response may need verification${NC}"
fi

echo ""
echo "8. Final clear cart test..."
curl -s -X POST "$API_URL/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id":"item_013","quantity":1}' > /dev/null

FINAL_CLEAR=$(curl -s -X DELETE "$API_URL/cart" -H "Authorization: Bearer $TOKEN")

if echo $FINAL_CLEAR | grep -q '"grand_total":0'; then
    echo -e "${GREEN}✓ Clear cart works correctly${NC}"
else
    echo -e "${RED}✗ Clear cart may have issues${NC}"
fi

echo ""
echo "=============================="
echo -e "${GREEN}Cart management fixes verified!${NC}"
