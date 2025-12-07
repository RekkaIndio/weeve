# Weeve Verification System Guide

## Overview

The Weeve verification system is a merit-based badge system that rewards genuine community contributors with verified status. Unlike traditional social platforms that charge for verification, Weeve's system is earned through authentic engagement, content creation, and community building.

## Philosophy

- **Earned, Not Bought**: Verification is achieved through platform engagement, not payment
- **Three-Tier System**: Bronze, Silver, and Gold tiers recognize different levels of contribution
- **Trust Building**: Verified users are proven community members who add value
- **Dynamic**: Verification can be gained, upgraded, downgraded, or revoked based on ongoing activity

## Verification Tiers

### Bronze Tier (Entry Level)
**Purpose**: Recognize active, engaged community members

**Default Requirements**:
- 3 stories created
- 5 contributions (weeves) made
- 50+ total views received
- 20+ engagement score (likes + comments)
- 14+ days active on platform
- 5+ followers
- 75%+ engagement ratio
- 14+ days account age
- Complete profile (name + avatar)
- 25+ tokens earned
- 10+ tokens spent
- Email verified
- No violations

### Silver Tier (Active Contributor)
**Purpose**: Highlight consistent content creators

**Default Requirements**:
- 10 stories created
- 20 contributions made
- 500+ total views
- 100+ engagement score
- 30+ days active
- 1+ group created or moderated
- 25+ followers
- 80%+ engagement ratio
- 30+ days account age
- Complete profile
- 100+ tokens earned
- 50+ tokens spent
- Email verified
- No violations

### Gold Tier (Community Leader)
**Purpose**: Showcase platform influencers and leaders

**Default Requirements**:
- 25 stories created
- 50 contributions made
- 2000+ total views
- 500+ engagement score
- 60+ days active
- 2+ groups created or moderated
- 100+ followers
- 85%+ engagement ratio
- 60+ days account age
- Complete profile
- 500+ tokens earned
- 200+ tokens spent
- Email AND phone verified
- No violations

## Database Schema

### Tables

#### `profiles` (Updated)
```sql
-- Added verification fields
is_verified BOOLEAN DEFAULT FALSE
verified_at TIMESTAMPTZ
verification_tier TEXT CHECK (verification_tier IN ('bronze', 'silver', 'gold'))
```

#### `verification_criteria`
Tracks user progress toward verification requirements:
- Content creation metrics (stories, contributions, views, engagement)
- Community building metrics (groups, followers, engagement ratio)
- Platform investment (account age, profile completeness, tokens)
- Trust signals (email/phone verification, violations)

#### `verification_requirements`
Configurable thresholds for each tier (see default values above)

#### `verification_audit_log`
Complete history of verification status changes:
- Granted
- Revoked
- Upgraded
- Downgraded

## API Endpoints

### GET `/api/verification/progress?userId={userId}`
Returns:
- User's current verification progress as percentages
- Requirements for all tiers
- Eligibility status for each tier
- Recent audit log entries

**Response**:
```json
{
  "progress": {
    "user_id": "string",
    "is_verified": boolean,
    "verification_tier": "bronze" | "silver" | "gold" | null,
    "bronze_stories_pct": 100,
    "bronze_contributions_pct": 80,
    // ... more progress metrics
    "eligible_bronze": true,
    "eligible_silver": false,
    "eligible_gold": false
  },
  "requirements": [...],
  "auditLog": [...]
}
```

### POST `/api/verification/check`
**Body**: `{ userId: string }`

Checks if user meets verification requirements and automatically grants/updates verification status.

**Response**:
```json
{
  "result": "granted_bronze" | "upgraded_silver" | "revoked" | "not_eligible" | "unchanged",
  "profile": {
    "is_verified": boolean,
    "verification_tier": string,
    "verified_at": string
  },
  "message": "User-friendly message"
}
```

### POST `/api/verification/update-criteria`
**Body**: `{ userId: string }`

Manually updates verification criteria for a user (recalculates all metrics).

## Database Functions

### `update_verification_criteria(p_user_id TEXT)`
Recalculates all verification metrics for a user:
- Counts stories, contributions, views
- Calculates engagement score
- Checks profile completeness
- Updates account age
- Computes engagement ratio

### `check_verification_eligibility(p_user_id TEXT, p_tier TEXT)`
Returns `true` if user meets all requirements for specified tier.

### `auto_grant_verification(p_user_id TEXT)`
Automatically:
1. Updates verification criteria
2. Checks eligibility for all tiers (highest to lowest)
3. Grants, upgrades, downgrades, or revokes verification
4. Logs action to audit log
5. Returns result status

### `calculate_engagement_ratio(p_user_id TEXT)`
Calculates ratio of positive (likes + comments) to negative (reports) engagement.

## Components

### `<VerificationDashboard userId={string} />`
Full-featured dashboard showing:
- Current verification status
- Progress bars for each requirement
- Tier cards with requirements
- Eligibility checker button
- Recent activity log

**Usage**:
```tsx
import VerificationDashboard from '@/app/components/VerificationDashboard';

<VerificationDashboard userId={currentUser.id} />
```

### `<VerificationBadge />`
Displays verification badge icon next to user names.

**Props**:
```tsx
{
  isVerified: boolean;
  tier?: 'bronze' | 'silver' | 'gold' | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}
```

**Usage**:
```tsx
import VerificationBadge from '@/app/components/VerificationBadge';

<VerificationBadge 
  isVerified={user.isVerified}
  tier={user.verificationTier}
  size="md"
/>
```

## Implementation Steps

### 1. Run Migration
Execute the migration file in your Supabase SQL Editor:
```bash
# Migration file location:
supabase/migration_verification_system.sql
```

This creates:
- New columns in `profiles` table
- `verification_criteria` table
- `verification_requirements` table with default values
- `verification_audit_log` table
- All functions and triggers
- RLS policies
- Indexes for performance

### 2. Update Type Definitions
The `User` interface in `src/lib/store.ts` has been updated to include:
```typescript
isVerified?: boolean;
verificationTier?: 'bronze' | 'silver' | 'gold' | null;
verifiedAt?: string;
```

### 3. Fetch Verification Status
When loading user profiles, include verification fields:
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*, is_verified, verification_tier, verified_at')
  .eq('user_id', userId);
```

### 4. Add Verification Badges
Import and use `VerificationBadge` component wherever user names appear:
- Profile pages ✅
- Story feed items ✅
- Comment sections ✅
- User lists
- Search results
- Group members

### 5. Create Verification Page (Optional)
Add a dedicated verification page at `/verification` or include the dashboard in settings:
```tsx
// app/(app)/verification/page.tsx
import VerificationDashboard from '@/app/components/VerificationDashboard';

export default function VerificationPage() {
  const { currentUser } = useStore();
  return <VerificationDashboard userId={currentUser.id} />;
}
```

## Automatic Updates

### When to Update Criteria
Call `update_verification_criteria()` when:
- User creates a story
- User adds a contribution
- User receives likes/comments
- User gains followers
- User creates/joins groups
- User earns/spends tokens

**Example**:
```typescript
// After creating a story
await supabase.rpc('update_verification_criteria', {
  p_user_id: userId
});

// Optionally check for verification
await fetch('/api/verification/check', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
```

### Scheduled Checks
Consider running automated verification checks:
- Daily cron job for all active users
- Weekly verification review
- After milestone achievements

## Customization

### Adjusting Requirements
Update the `verification_requirements` table:
```sql
UPDATE verification_requirements
SET 
  min_stories_created = 5,
  min_followers = 20
WHERE tier = 'bronze';
```

### Adding New Criteria
1. Add column to `verification_criteria` table
2. Update `update_verification_criteria()` function to calculate it
3. Add to `verification_requirements` table
4. Update `check_verification_eligibility()` function to check it

### Custom Tier Names
While the system uses bronze/silver/gold, you can display different names in the UI:
```tsx
const tierNames = {
  bronze: 'Rising Star',
  silver: 'Storyteller',
  gold: 'Master Weaver'
};
```

## Benefits for Verified Users

Consider offering verified users:
- **Visibility**: Higher placement in feeds and search
- **Features**: Access to advanced creator tools
- **Earnings**: Higher token earnings rate (e.g., 1.2x multiplier)
- **Privileges**: Create larger groups, host paid events
- **Analytics**: Access to detailed engagement metrics
- **Badge**: Visual indicator on profile and content
- **Trust**: Stand out as authentic, valuable community member

## Monitoring

### Important Queries

**Verification Distribution**:
```sql
SELECT 
  verification_tier,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM profiles
WHERE is_verified = true
GROUP BY verification_tier;
```

**Recent Verifications**:
```sql
SELECT 
  p.name,
  p.verification_tier,
  p.verified_at
FROM profiles p
WHERE p.is_verified = true
ORDER BY p.verified_at DESC
LIMIT 20;
```

**Users Close to Verification**:
```sql
SELECT 
  vp.name,
  vp.bronze_stories_pct,
  vp.bronze_contributions_pct,
  vp.eligible_bronze
FROM verification_progress vp
WHERE NOT vp.is_verified
  AND (
    vp.bronze_stories_pct >= 80 OR
    vp.bronze_contributions_pct >= 80
  )
ORDER BY (vp.bronze_stories_pct + vp.bronze_contributions_pct) DESC
LIMIT 50;
```

## Best Practices

1. **Be Transparent**: Show users exactly what they need to do
2. **Provide Feedback**: Update progress in real-time
3. **Celebrate Achievements**: Send notifications when users get verified
4. **Maintain Standards**: Don't make verification too easy or too hard
5. **Be Fair**: Apply rules consistently to all users
6. **Monitor Abuse**: Watch for gaming the system
7. **Regular Reviews**: Periodically check if requirements make sense
8. **Clear Communication**: Explain what verification means to users

## Troubleshooting

### User Not Getting Verified
1. Check verification criteria: `SELECT * FROM verification_criteria WHERE user_id = ?`
2. Check requirements: `SELECT * FROM verification_requirements WHERE tier = 'bronze'`
3. Run eligibility check: `SELECT check_verification_eligibility(?, 'bronze')`
4. Manually update criteria: `SELECT update_verification_criteria(?)`
5. Check audit log: `SELECT * FROM verification_audit_log WHERE user_id = ? ORDER BY created_at DESC`

### Verification Revoked
Check audit log for reason:
```sql
SELECT * FROM verification_audit_log 
WHERE user_id = ? AND action = 'revoked' 
ORDER BY created_at DESC LIMIT 1;
```

### Performance Issues
Ensure indexes are in place:
```sql
CREATE INDEX IF NOT EXISTS idx_verification_criteria_user_id ON verification_criteria(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_tier ON profiles(verification_tier);
```

## Future Enhancements

Potential improvements:
- **Verification Quests**: Guided tasks to earn verification
- **Seasonal Tiers**: Limited-time special badges
- **Category Verification**: Domain-specific badges (Artist, Writer, etc.)
- **Team Verification**: Badges for collaborative groups
- **Legacy Tier**: Reward long-time users
- **Achievements**: Micro-badges for specific accomplishments
- **Verification Score**: Numerical reputation system
- **Appeal Process**: Allow users to contest decisions

## Security Considerations

- All verification functions run server-side
- RLS policies prevent unauthorized updates
- Audit log tracks all changes
- Service role required for admin operations
- Rate limit verification checks to prevent abuse
- Monitor for attempts to game the system

## Support

For issues or questions about the verification system:
1. Check this guide
2. Review the audit log
3. Inspect database functions
4. Test API endpoints with sample data
5. Check RLS policies for permission issues

---

**Last Updated**: December 7, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
