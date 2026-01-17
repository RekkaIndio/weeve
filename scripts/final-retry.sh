#!/bin/bash

# Final retry - last 18 emails that hit Forbidden error
# Waiting between batches

emails=(
  "tezalee73@hotmail.com"
  "lfrichards91@gmail.com"
  "dawn.thompson3@gmail.com"
  "antony@avwright.uk"
  "emma32eve@msn.com"
  "simone.f.murphy45@gmail.com"
  "amyperryd1@gmail.com"
  "twmgorman@hotmail.com"
  "sierra30@protonmail.com"
  "penny.johnston@icloud.com"
  "kdaigle81@gmail.com"
  "connorrouse1996@gmail.com"
  "aimeebozward98@hotmail.com"
  "james-anna@sky.com"
  "chant5403@icloud.com"
  "annajames2111@yahoo.co.uk"
  "alfiewhiten@icloud.com"
  "leighliz1990@gmail.com"
)

count=0
success=0
failed=0

echo "🔄 Final retry for ${#emails[@]} remaining emails..."
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
  
  # 3 second delay between each
  sleep 3
done

echo ""
echo "========================================="
echo "📊 FINAL RETRY SUMMARY"
echo "========================================="
echo "Total: ${#emails[@]}"
echo "✅ Sent: $success"
echo "❌ Failed: $failed"
echo "========================================="
