#!/bin/bash

# Utility script to send emails to a list of users
# Add emails to the array below

emails=(
  # "user1@example.com"
  # "user2@example.com"
)

if [ ${#emails[@]} -eq 0 ]; then
  echo "⚠️  No emails defined in the script. Please add emails to the 'emails' array."
  exit 1
fi

count=0
success=0
failed=0

echo "🚀 Starting to send beta invites to ${#emails[@]} users..."
echo ""

for email in "${emails[@]}"; do
  count=$((count + 1))
  echo "[$count/${#emails[@]}] Sending to: $email"
  
  response=$(curl -s "http://localhost:3000/api/send-beta-invite?to=$email")
  
  if echo "$response" | grep -q '"success":true'; then
    success=$((success + 1))
    echo "  ✅ Sent successfully"
  else
    failed=$((failed + 1))
    echo "  ❌ Failed: $response"
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "========================================="
echo "📊 SUMMARY"
echo "========================================="
echo "Total: ${#emails[@]}"
echo "✅ Sent: $success"
echo "❌ Failed: $failed"
echo "========================================="
