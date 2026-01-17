#!/bin/bash

# Retry failed emails with longer delay
# These failed due to Mailgun rate limiting (error 420)

emails=(
  "wcampbell@outlook.com"
  "avery.adams@gmail.com"
  "carter.baker.build@hotmail.com"
  "scarlett.gonzalez@yahoo.com"
  "sebastian.nelson@gmail.com"
  "jack.mitchell.auto@gmail.com"
  "chloe.roberts@hotmail.com"
  "owen.turner@yahoo.com"
  "lily.phillips.law@gmail.com"
  "wyatt.campbell@outlook.com"
  "gabriel.evans@hotmail.com"
  "riley.parker.music@gmail.com"
  "anthonykettle@hotmail.com"
  "heva00@hotmail.co.uk"
  "jimkettleadi@icooud.com"
  "kettle_yasmine@icloud.com"
  "kettlejack99@gmail.com"
  "lisethorne@gmail.com"
  "keziacalvertwriter@gmail.com"
  "jessicarice3010@hotmail.com"
  "jaimiehartshorne@outlook.com"
  "darceyreastubbs@icloud.com"
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

echo "🔄 Retrying ${#emails[@]} failed emails with longer delay..."
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
  
  # Longer delay to avoid rate limiting
  sleep 2
done

echo ""
echo "========================================="
echo "📊 RETRY SUMMARY"
echo "========================================="
echo "Total: ${#emails[@]}"
echo "✅ Sent: $success"
echo "❌ Failed: $failed"
echo "========================================="
