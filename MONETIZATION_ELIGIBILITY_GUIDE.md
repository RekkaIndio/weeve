# Monetization Eligibility System Guide

## Overview

The monetization eligibility system creates a low barrier to entry for creators to charge for their content while protecting users and the platform from abuse. It's separate from the verification system - **monetization is easier to unlock** than verification badges.

## Philosophy

**Separate from Verification**:
- Verification = Trust & Status (harder to earn)
- Monetization = Basic Trust (easier to unlock)
- You don't need verification to monetize

**Tiered Approach**:
- **Individual Stories**: Low barrier (3 days, 2 stories, 10 tokens)
- **Groups**: Immediate monetization (groups show commitment)
- **Events**: Higher barrier (future feature)

**Protection**:
- Prevents spam accounts from immediately charging
- Ensures creators understand the platform first
- Builds trust in paid content
- Can be restricted by admins for violations

## Monetization Requirements

### Individual Stories (Low Barrier)
**Requirements**:
- ✅ 3 days account age
- ✅ 2 public stories created
- ✅ 10 tokens earned
- ✅ Complete profile (name + avatar)
- ✅ Email verified
- ✅ No violations

**Why These Requirements?**
- **3 days**: Prevents instant spam accounts
- **2 stories**: Shows they understand how stories work
- **10 tokens**: Proves they've engaged with the economy
- **Profile/Email**: Basic identity verification
- **No violations**: Maintains quality standards

### Groups (Immediate)
**Requirements**:
- ✅ Email verified
- ✅ Complete profile
- ✅ No violations

**Why Groups Get Immediate Access?**
- Creating a group shows higher commitment
- Group monetization is for exclusive communities (less spam risk)
- Groups are self-policing (members report issues)
- Natural use case for paid access

### Events (Future - Higher Barrier)
**Requirements**:
- ✅ 7 days account age
- ✅ 5 public stories
- ✅ 5 contributions
- ✅ 50 tokens earned
- ✅ 5+ followers
- ✅ 10+ engagement score
- ✅ Email verified
- ✅ Complete profile
- ✅ No violations

## Database Schema

### Tables

#### `profiles` (Updated)
```sql
can_monetize_stories BOOLEAN DEFAULT FALSE
monetization_enabled_at TIMESTAMPTZ
monetization_restrictions TEXT -- Reason if restricted
```

#### `monetization_requirements`
Configurable thresholds for each content type:
- `requirement_type`: 'story', 'group', 'event'
- Basic requirements (account age, stories, tokens)
- Trust requirements (email, profile, violations)
- Optional community requirements (followers, engagement)

#### Reuses `verification_criteria`
The system leverages the existing verification criteria tracking:
- No duplicate data
- Single source of truth for user metrics
- Efficient queries

## Key Functions

### `check_monetization_eligibility(p_user_id, p_requirement_type)`
Returns `true` if user meets requirements for specified content type.

**Checks**:
1. No active restrictions
2. All requirement thresholds met
3. Trust signals verified

### `update_monetization_eligibility(p_user_id)`
Updates user's monetization status based on current criteria.

**Returns**: `BOOLEAN` (can monetize)

**Side effects**: Updates `can_monetize_stories` in profiles

### `restrict_monetization(p_user_id, p_reason)`
Admin/moderation function to disable monetization.

**Actions**:
- Sets `can_monetize_stories = FALSE`
- Adds restriction reason
- Removes pricing from all user's stories

### `lift_monetization_restriction(p_user_id)`
Removes restriction and re-checks eligibility.

### `get_monetization_status(p_user_id)`
Returns comprehensive JSON with:
- Current status
- Restriction info
- Detailed progress for each requirement
- Whether each requirement is met

## Trigger Protection

### `check_story_monetization()` Trigger
Runs **BEFORE INSERT OR UPDATE** on `stories.monetization_cost`.

**Logic**:
1. If no price set → Allow
2. If group story → Allow (groups can always monetize)
3. Otherwise → Check individual eligibility
4. If not eligible → RAISE EXCEPTION with helpful message

**This prevents**:
- Ineligible users from setting prices
- Bypassing checks through direct DB updates
- Confusion about why monetization isn't working

## API Endpoints

### GET `/api/monetization/status?userId={userId}`
Get current monetization status and progress.

**Response**:
```json
{
  "status": {
    "can_monetize": boolean,
    "is_restricted": boolean,
    "restriction_reason": string | null,
    "enabled_at": string | null,
    "progress": {
      "account_age_days": number,
      "account_age_required": number,
      "account_age_met": boolean,
      "stories_created": number,
      "stories_required": number,
      "stories_met": boolean,
      "tokens_earned": number,
      "tokens_required": number,
      "tokens_met": boolean,
      "profile_complete": boolean,
      "email_verified": boolean,
      "no_violations": boolean
    }
  },
  "requirements": [...]
}
```

### POST `/api/monetization/check`
Check and update monetization eligibility.

**Body**: `{ userId: string }`

**Response**:
```json
{
  "eligible": boolean,
  "status": {...},
  "message": "User-friendly message"
}
```

## Components

### `<MonetizationEligibility userId={string} compact={boolean} />`

Two display modes:

**Compact Mode** (for settings/profile):
- Small card showing status
- Quick requirements list
- Minimal visual footprint

**Full Mode** (dedicated page):
- Large header with status
- Detailed progress cards
- Requirement checklist
- Call-to-action button
- Tips and info

**Usage**:
```tsx
// Compact in settings
<MonetizationEligibility userId={currentUser.id} compact />

// Full page
<MonetizationEligibility userId={currentUser.id} />
```

## Implementation Steps

### 1. Run Migration
Execute after the verification migration:
```bash
# File location:
supabase/migration_monetization_eligibility.sql
```

Creates:
- New columns in profiles
- monetization_requirements table
- All functions and triggers
- RLS policies
- Views for progress tracking

### 2. UI Integration

**Add to Settings Page**:
```tsx
import MonetizationEligibility from '@/app/components/MonetizationEligibility';

// In settings
<MonetizationEligibility userId={currentUser.id} compact />
```

**Add to Story Creation**:
```tsx
const [canMonetize, setCanMonetize] = useState(false);

useEffect(() => {
  checkMonetizationStatus();
}, []);

const checkMonetizationStatus = async () => {
  const res = await fetch(`/api/monetization/status?userId=${userId}`);
  const data = await res.json();
  setCanMonetize(data.status.can_monetize);
};

// In UI
{!canMonetize && (
  <div className="bg-amber-50 p-3 rounded-lg text-sm">
    <p>💡 Complete 2 stories and earn 10 tokens to enable pricing</p>
    <Link href="/settings/monetization">
      View Progress →
    </Link>
  </div>
)}
```

**Add to Group Creation**:
```tsx
// Groups can always monetize - show this prominently
<div className="bg-green-50 p-3 rounded-lg">
  <p className="text-sm text-green-800">
    ✅ Groups can charge for membership immediately!
  </p>
</div>
```

### 3. Update Story Creation Logic

**Check Before Saving**:
```typescript
// Before allowing user to set monetization_cost
if (monetization_cost > 0) {
  const eligible = await checkMonetizationEligibility(userId, 'story');
  if (!eligible && !groupId) {
    toast.error('Complete requirements to monetize stories');
    return;
  }
}
```

**The database trigger will also enforce this**, but checking in the UI provides better UX.

### 4. Update After Key Actions

**After Creating Story**:
```typescript
await fetch('/api/monetization/check', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
```

**After Earning Tokens**:
```typescript
// Check if they just became eligible
await fetch('/api/monetization/check', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
```

## User Flow Examples

### New User Journey
1. **Day 1**: Creates account → Can't monetize yet
2. **Day 2**: Creates first story → Progress: 50% stories
3. **Day 3**: Creates second story → Progress: 100% stories
4. **Day 3**: Earns 10 tokens → All requirements met!
5. **Day 4**: Account age met → Monetization unlocked! 🎉

### Group Creator Journey
1. Creates account
2. Verifies email
3. Completes profile
4. Creates group → **Can immediately charge for membership**

### Violation Journey
1. User eligible and monetizing
2. Receives community violation
3. Admin restricts monetization
4. All story prices removed
5. User appeals → Admin lifts restriction
6. Automatically re-checked → Re-enabled if still eligible

## Admin/Moderation

### Restrict Monetization
```sql
SELECT restrict_monetization(
  'user_id_here',
  'Spam content / Scam attempt / Guideline violations'
);
```

**Effect**:
- Immediately disables monetization
- Removes all pricing from their stories
- Shows restriction reason to user

### Lift Restriction
```sql
SELECT lift_monetization_restriction('user_id_here');
```

**Effect**:
- Removes restriction flag
- Re-checks eligibility
- Re-enables if still meets requirements

### Check User Status
```sql
SELECT * FROM monetization_eligibility_progress 
WHERE user_id = 'user_id_here';
```

## Monitoring Queries

### Users Ready to Monetize
```sql
SELECT 
  p.name,
  mep.account_age_days,
  mep.stories_created,
  mep.tokens_earned,
  mep.eligible_to_monetize
FROM monetization_eligibility_progress mep
JOIN profiles p ON p.user_id = mep.user_id
WHERE mep.eligible_to_monetize = true
  AND p.can_monetize_stories = false;
```

### Users Close to Eligibility
```sql
SELECT 
  p.name,
  mep.account_age_pct,
  mep.stories_pct,
  mep.tokens_pct,
  mep.status_message
FROM monetization_eligibility_progress mep
JOIN profiles p ON p.user_id = mep.user_id
WHERE NOT mep.eligible_to_monetize
  AND (mep.account_age_pct >= 80 
    OR mep.stories_pct >= 80 
    OR mep.tokens_pct >= 80)
ORDER BY (mep.account_age_pct + mep.stories_pct + mep.tokens_pct) DESC;
```

### Restricted Users
```sql
SELECT 
  p.name,
  p.monetization_restrictions,
  COUNT(s.id) as story_count
FROM profiles p
LEFT JOIN stories s ON s.creator_id = p.user_id
WHERE p.monetization_restrictions IS NOT NULL
GROUP BY p.user_id, p.name, p.monetization_restrictions;
```

## Adjusting Requirements

### Make It Easier
```sql
UPDATE monetization_requirements
SET 
  min_account_age_days = 1,
  min_stories_created = 1,
  min_tokens_earned = 5
WHERE requirement_type = 'story';
```

### Make It Harder
```sql
UPDATE monetization_requirements
SET 
  min_account_age_days = 7,
  min_stories_created = 5,
  min_tokens_earned = 25,
  min_followers = 3
WHERE requirement_type = 'story';
```

### Add New Requirement Type
```sql
INSERT INTO monetization_requirements (
  requirement_type,
  min_account_age_days,
  min_stories_created,
  require_email_verified,
  require_profile_complete
) VALUES (
  'premium_story',
  30,
  10,
  true,
  true
);
```

## Best Practices

### UI/UX
1. **Show Progress Clearly**: Users should see exactly what they need to do
2. **Celebrate Unlocks**: Send notification when they become eligible
3. **Explain Benefits**: Show what they can do once eligible
4. **Provide Path**: Link to monetization requirements from create story

### Communication
1. **Be Transparent**: Show all requirements upfront
2. **Give Feedback**: Update progress in real-time
3. **Explain Restrictions**: If monetization is removed, explain why
4. **Offer Help**: Link to support if they have questions

### Platform Health
1. **Monitor Abuse**: Watch for users trying to game the system
2. **Adjust Requirements**: Based on platform growth and spam levels
3. **Review Restrictions**: Ensure restricted users are actually problematic
4. **Track Metrics**: How many users monetize? How quickly?

## Troubleshooting

### User Can't Set Price on Story
1. Check status: `SELECT * FROM monetization_eligibility_progress WHERE user_id = ?`
2. Verify no restrictions: `SELECT monetization_restrictions FROM profiles WHERE user_id = ?`
3. Check if group story: Group stories bypass individual requirements
4. Review database trigger logs for errors

### Trigger Blocking Story Creation
The trigger only blocks when **setting a price**, not creating free stories.

If blocked:
1. Verify user actually meets requirements
2. Check `verification_criteria` is up to date
3. Run `update_verification_criteria(user_id)` manually
4. Re-check eligibility

### Progress Not Updating
1. Ensure actions (story creation, token earning) call update functions
2. Run manual update: `SELECT update_verification_criteria(user_id)`
3. Check `verification_criteria` table for correct values
4. Verify database functions are deployed

## Integration with Verification

**Two Separate Systems**:
- **Verification**: Social proof, status symbol (harder)
- **Monetization**: Basic trust, earning capability (easier)

**Relationship**:
- Monetization uses same criteria tracking (efficient)
- Verification doesn't grant monetization automatically
- But verified users likely already meet monetization requirements

**UI Consideration**:
Show both systems separately:
- Settings → Monetization (practical, money-focused)
- Profile → Verification (social, status-focused)

## Future Enhancements

**Dynamic Requirements**:
- Adjust based on platform maturity
- Stricter during growth spurts
- Looser when building creator base

**Reputation Score**:
- Faster unlock for users with good behavior
- Slower for users with warnings

**Creator Tiers**:
- Basic monetization (current system)
- Premium features (higher requirements)
- Partnership program (invite-only)

**Analytics**:
- Show creators earnings potential
- Estimate based on similar content
- Suggest optimal pricing

---

**Last Updated**: December 7, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
