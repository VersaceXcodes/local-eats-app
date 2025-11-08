#!/bin/bash

echo "========================================="
echo "SIGNUP FORM FIX - FINAL VERIFICATION"
echo "========================================="
echo ""

PASSED=0
FAILED=0

# Test 1: Signup without phone_number (omitted entirely)
echo "Test 1: Signup without phone_number (field omitted)"
echo "---------------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-omitted-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User Omitted"
  }')

if echo "$RESPONSE" | grep -q '"auth_token"'; then
  echo "✅ PASSED - User created successfully"
  echo "   Phone number in response: $(echo $RESPONSE | grep -o '"phone_number":[^,]*' | cut -d: -f2)"
  PASSED=$((PASSED + 1))
else
  echo "❌ FAILED"
  echo "   Response: $RESPONSE"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Signup with phone_number: null
echo "Test 2: Signup with phone_number set to null"
echo "---------------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-null-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User Null",
    "phone_number": null
  }')

if echo "$RESPONSE" | grep -q '"auth_token"'; then
  echo "✅ PASSED - User created successfully"
  echo "   Phone number in response: $(echo $RESPONSE | grep -o '"phone_number":[^,]*' | cut -d: -f2)"
  PASSED=$((PASSED + 1))
else
  echo "❌ FAILED"
  echo "   Response: $RESPONSE"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Signup with empty string phone_number
echo "Test 3: Signup with phone_number as empty string"
echo "---------------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-empty-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User Empty",
    "phone_number": ""
  }')

if echo "$RESPONSE" | grep -q '"auth_token"'; then
  echo "✅ PASSED - User created successfully"
  echo "   Phone number in response: $(echo $RESPONSE | grep -o '"phone_number":[^,]*' | cut -d: -f2)"
  PASSED=$((PASSED + 1))
else
  echo "❌ FAILED"
  echo "   Response: $RESPONSE"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Signup with valid phone number
echo "Test 4: Signup with valid phone number"
echo "---------------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-valid-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User Valid",
    "phone_number": "+12345678901"
  }')

if echo "$RESPONSE" | grep -q '"auth_token"' && echo "$RESPONSE" | grep -q '"+12345678901"'; then
  echo "✅ PASSED - User created with phone number"
  echo "   Phone number in response: $(echo $RESPONSE | grep -o '"phone_number":"[^"]*"' | cut -d: -f2)"
  PASSED=$((PASSED + 1))
else
  echo "❌ FAILED"
  echo "   Response: $RESPONSE"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: Signup with phone number containing spaces (should be cleaned)
echo "Test 5: Signup with phone number containing spaces"
echo "---------------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-spaces-'$(date +%s%N | cut -b1-13)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User Spaces",
    "phone_number": "+1 234 567 8902"
  }')

if echo "$RESPONSE" | grep -q '"auth_token"' && echo "$RESPONSE" | grep -q '"+12345678902"'; then
  echo "✅ PASSED - User created with cleaned phone number"
  echo "   Phone number in response: $(echo $RESPONSE | grep -o '"phone_number":"[^"]*"' | cut -d: -f2)"
  PASSED=$((PASSED + 1))
else
  echo "❌ FAILED"
  echo "   Response: $RESPONSE"
  FAILED=$((FAILED + 1))
fi
echo ""

echo "========================================="
echo "FINAL RESULTS"
echo "========================================="
echo "Tests Passed: $PASSED"
echo "Tests Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED! The signup form is working correctly."
  exit 0
else
  echo "⚠️  Some tests failed. Please review the output above."
  exit 1
fi
