#!/bin/bash
echo "Testing Signup Endpoint..."
echo "=========================="
echo ""

# Test 1: Without phone number
echo "Test 1: Signup without phone number"
RESPONSE1=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User One"
  }')

if echo "$RESPONSE1" | grep -q '"auth_token"'; then
  echo "✅ PASSED"
else
  echo "❌ FAILED: $RESPONSE1"
fi
echo ""

# Test 2: With null
echo "Test 2: Signup with null phone"
RESPONSE2=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User Two",
    "phone_number": null
  }')

if echo "$RESPONSE2" | grep -q '"auth_token"'; then
  echo "✅ PASSED"
else
  echo "❌ FAILED: $RESPONSE2"
fi
echo ""

# Test 3: With phone
echo "Test 3: Signup with valid phone"
RESPONSE3=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test3-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User Three",
    "phone_number": "+12345678901"
  }')

if echo "$RESPONSE3" | grep -q '"auth_token"'; then
  echo "✅ PASSED"
else
  echo "❌ FAILED: $RESPONSE3"
fi
echo ""

echo "=========================="
