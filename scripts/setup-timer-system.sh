#!/bin/bash

# Timer System Setup Script
# This script helps set up the story turn timer expiration system

echo "🕐 Setting up Story Turn Timer System..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Step 1: Apply database migration
echo "📊 Step 1: Applying database migration..."
echo "Run this command to apply the migration:"
echo ""
echo "  supabase db push"
echo ""
read -p "Have you applied the migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Please apply the migration first."
    exit 1
fi

# Step 2: Deploy edge function
echo ""
echo "🚀 Step 2: Deploying Edge Function..."
echo "Run this command to deploy the timer check function:"
echo ""
echo "  supabase functions deploy check-timer-expiration"
echo ""
read -p "Have you deployed the edge function? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Please deploy the edge function."
    exit 1
fi

# Step 3: Set up cron job
echo ""
echo "⏰ Step 3: Setting up Cron Job..."
echo ""
echo "To complete the setup, configure a cron job in your Supabase dashboard:"
echo ""
echo "1. Go to: https://app.supabase.com/project/YOUR_PROJECT/functions"
echo "2. Click on 'Cron Jobs' tab"
echo "3. Create a new cron job:"
echo "   - Name: check-timer-expiration"
echo "   - Schedule: */15 * * * * (every 15 minutes)"
echo "   - Function: check-timer-expiration"
echo ""
echo "Or use the Supabase CLI:"
echo ""
echo "  supabase functions schedule check-timer-expiration '*/15 * * * *'"
echo ""
read -p "Have you set up the cron job? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Please set up the cron job to complete the setup."
    exit 1
fi

# Step 4: Test the system
echo ""
echo "🧪 Step 4: Testing the system..."
echo ""
echo "Test the edge function manually:"
echo ""
echo "  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-timer-expiration \\"
echo "    -H \"Authorization: Bearer YOUR_ANON_KEY\""
echo ""
read -p "Press any key to continue..." -n 1 -r
echo

# Success
echo ""
echo "✨ Setup Complete!"
echo ""
echo "The timer system is now active. Here's what happens:"
echo ""
echo "✅ Client-side: Timers are checked when users view stories"
echo "✅ Server-side: Timers are checked every 15 minutes via cron"
echo "✅ Manual skip: Story creators can manually skip turns in Edit Story"
echo ""
echo "📖 For more details, see: TIMER_SYSTEM_GUIDE.md"
echo ""
echo "Happy storytelling! 🎬"
