#!/bin/bash
API_URL="http://localhost:3000"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@test.com","password":"testpass123"}')
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"auth_token":"[^"]*' | cut -d'"' -f4)
curl -s -X DELETE "$API_URL/api/cart" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X POST "$API_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menu_item_id":"item_057","quantity":1}' | python3 -m json.tool 2>/dev/null | grep -A 15 '"items"'
