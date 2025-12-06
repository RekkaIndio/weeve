# Story Turn Timer System

## Overview
The turn timer system allows story creators to set a time limit for each participant's turn. When a timer expires, the system automatically passes the turn to the next participant, ensuring smooth story flow without interruption.

## Features

### 1. **Timer Options**
Available timer durations when creating a story:
- No limit (default)
- 6 hours
- 12 hours
- 24 hours
- 48 hours (2 days)
- 72 hours (3 days)
- 168 hours (1 week)

### 2. **Automatic Turn Skipping**
When a timer expires, the system automatically:
- Moves the turn to the next participant (circular rotation)
- Sends a notification to the user whose turn expired
- Sends a notification to the next user that it's now their turn
- Maintains story continuity without manual intervention

### 3. **Multi-Layer Timer Checking**

#### Client-Side Check (Immediate)
- Runs when a user views a story page
- Checks every 30 seconds while the page is open
- Provides instant feedback if user's turn has expired
- Located in: `src/lib/useTimerCheck.ts`

#### Server-Side Check (Scheduled)
- Supabase Edge Function that runs on a schedule (recommended: every 15 minutes)
- Handles timer expiration even when users are not active
- Ensures no story gets "stuck" waiting for an inactive user
- Located in: `supabase/functions/check-timer-expiration/index.ts`

### 4. **Manual Skip Option**
Story creators can manually skip a participant's turn:
- Open the story's edit menu (three dots icon)
- Click "Edit Story"
- Find the participant with the current turn (marked with "• Current Turn")
- Click the skip button (⏭️ icon) next to their name
- Turn immediately moves to the next participant

## Implementation Details

### Database Schema
```sql
-- stories table
turn_timer_hours integer DEFAULT NULL  -- Timer duration in hours
current_turn_user_id uuid              -- User whose turn it is
updated_at timestamp                   -- Last update time (used for timer calc)
```

### Timer Calculation
```typescript
const turnStartTime = lastContributionTimestamp || storyUpdatedAt
const timerDurationMs = turnTimerHours * 60 * 60 * 1000
const expiryTime = turnStartTime + timerDurationMs
const isExpired = Date.now() >= expiryTime
```

The timer starts from:
1. The timestamp of the last contribution, OR
2. If no contributions yet, the story's `updated_at` timestamp

### Key Files

#### Core Functions
- `src/lib/stories.ts` - Contains `skipTurn()` function
- `src/lib/useTimerCheck.ts` - Client-side timer checking hook
- `src/app/(app)/story/[id]/page.tsx` - Integrates timer checking on story page
- `src/app/components/CreateStory.tsx` - Timer selection UI
- `src/app/components/EditStoryModal.tsx` - Manual skip UI

#### Backend
- `supabase/functions/check-timer-expiration/index.ts` - Edge function for scheduled checks
- `supabase/migration_timer_expiration.sql` - Database optimizations

## Setup Instructions

### 1. Apply Database Migration
```bash
# From supabase directory
psql -U postgres -d your_database -f supabase/migration_timer_expiration.sql
```

### 2. Deploy Edge Function
```bash
# Deploy the timer check function
supabase functions deploy check-timer-expiration
```

### 3. Set Up Cron Job (Recommended)
In your Supabase dashboard:
1. Go to Edge Functions → Cron Jobs
2. Create a new cron job:
   - Name: `check-timer-expiration`
   - Schedule: `*/15 * * * *` (every 15 minutes)
   - Function: `check-timer-expiration`

Or manually trigger via HTTP:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/check-timer-expiration \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 4. Monitor and Test
- Check edge function logs in Supabase dashboard
- Test with short timer durations (6 hours) for quick validation
- Verify notifications are being sent correctly

## User Experience

### For Story Creator
1. When creating a story, expand "Advanced Options"
2. Select a timer duration from the dropdown
3. Story participants will see countdown timers
4. Can manually skip anyone's turn via Edit Story menu

### For Story Participants
1. See countdown timer on their profile page under "Your Turn" tab
2. Receive notification when it's their turn
3. Receive notification if their turn expires
4. Story continues seamlessly even if they miss their turn

### Displayed Timer Info
On profile page, stories with timers show:
- "Added [time ago]" - When the turn started
- "[X]h [Y]m left" - Time remaining
- "Expired" - If the timer has run out

## Notifications

### Timer Expired Notification
- **Type**: `timer_expired`
- **Title**: "Your turn expired"
- **Message**: "Your turn in '[Story Title]' expired and has been passed to the next person."

### Turn Skipped Notification (Manual)
- **Type**: `turn_skipped`
- **Title**: "Turn skipped"
- **Message**: "Your turn in '[Story Title]' was skipped by the creator."

### Next Turn Notification
- **Type**: `your_turn`
- **Title**: "It's your turn!"
- **Message**: "It's now your turn in '[Story Title]'"

## Edge Cases Handled

1. **User leaves story while having the turn**: Turn automatically passes to next participant
2. **Last participant in rotation**: Circles back to the first participant
3. **Multiple expired timers**: Edge function processes all expired stories in batch
4. **Client vs Server race condition**: Both systems are idempotent and safe to run concurrently
5. **Story reaches capacity**: Timer checking stops when story is completed
6. **No participants left**: Sets `current_turn_user_id` to null

## Performance Considerations

- Database index on `(status, turn_timer_hours, current_turn_user_id)` for efficient queries
- Client-side check only runs when user is viewing a story
- Server-side check processes all expired timers in a single batch
- Notifications are sent asynchronously to avoid blocking

## Future Enhancements

Potential improvements to consider:
- Warning notifications (e.g., "1 hour left on your turn")
- Configurable auto-skip behavior (some stories might want to wait)
- Timer pause option for story creators
- Analytics on turn completion times
- Adjustable timer per-participant (VIP users get more time)

## Troubleshooting

### Timer not expiring automatically
1. Check if edge function is deployed: `supabase functions list`
2. Verify cron job is set up and running
3. Check edge function logs for errors
4. Ensure database index exists

### Manual skip not working
1. Verify user is the story creator
2. Check that the story status is 'active'
3. Ensure the participant has the current turn
4. Check browser console for errors

### Client-side check not triggering
1. Verify `useTimerCheck` hook is imported and called
2. Check that story has a timer set (`turnTimerHours` is not null)
3. Ensure user has an active turn
4. Look for JavaScript console errors
