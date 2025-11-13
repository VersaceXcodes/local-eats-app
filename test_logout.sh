#!/bin/bash
API_URL="http://localhost:3000"

echo "Testing Logout Flow..."
echo "====================="

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"logout_test_$(date +%s)@example.com\",
    \"password\": \"TestPassword123\",
    \"full_name\": \"Logout Test User\"
  }")

echo "Registration response:" 
echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('auth_token', ''))" 2>/dev/null)
echo "Auth Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "Failed to get auth token"
  exit 1
fi

echo ""
echo "Testing logout endpoint..."
LOGOUT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$LOGOUT_RESPONSE" | grep -v "HTTP_CODE:")

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Logout successful"
else
  echo "❌ Logout failed with status $HTTP_CODE"
fi
