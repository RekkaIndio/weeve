-- Security Advisor Fixes Part 3
-- Fixes remaining 21 function search path warnings and 7 RLS policy warnings

-- ============================================================================
-- 1. BRAND ACCOUNTS FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_slot_immutable(p_story_id UUID, p_slot_index INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_post_type TEXT;
  v_canon_slots INTEGER[];
BEGIN
  SELECT post_type, canon_slots INTO v_post_type, v_canon_slots
  FROM stories WHERE id = p_story_id;
  
  IF v_post_type = 'seed' AND p_slot_index = 0 THEN
    RETURN TRUE;
  END IF;
  
  IF v_post_type = 'canon' AND p_slot_index = ANY(v_canon_slots) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_immutable_slot_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  contribution_position INTEGER;
  is_immutable BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO contribution_position
    FROM contributions WHERE story_id = OLD.story_id AND timestamp < OLD.timestamp;
    
    is_immutable := is_slot_immutable(OLD.story_id, contribution_position);
    
    IF is_immutable THEN
      RAISE EXCEPTION 'Cannot delete contribution in an immutable slot';
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO contribution_position
    FROM contributions WHERE story_id = OLD.story_id AND timestamp < OLD.timestamp;
    
    is_immutable := is_slot_immutable(OLD.story_id, contribution_position);
    
    IF is_immutable AND (
      OLD.content IS DISTINCT FROM NEW.content OR
      OLD.media_url IS DISTINCT FROM NEW.media_url OR
      OLD.media_type IS DISTINCT FROM NEW.media_type
    ) THEN
      RAISE EXCEPTION 'Cannot modify contribution in an immutable slot';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 2. FRIEND REQUEST FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  receiver_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO friendships (user_id, friend_id)
    VALUES (NEW.sender_id, NEW.receiver_id), (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT DO NOTHING;
    
    SELECT name INTO receiver_name FROM profiles WHERE user_id = NEW.receiver_id;
    
    INSERT INTO notifications (user_id, type, title, message, data, action_url)
    VALUES (
      NEW.sender_id,
      'friend_accepted',
      'Friend Request Accepted',
      receiver_name || ' accepted your friend request',
      jsonb_build_object('friend_id', NEW.receiver_id),
      '/profile/' || NEW.receiver_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. VERIFICATION SYSTEM FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_verification_criteria(p_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_stories_created INTEGER;
  v_contributions INTEGER;
  v_views_received INTEGER;
  v_engagement_score INTEGER;
  v_groups_created INTEGER;
  v_followers INTEGER;
  v_following INTEGER;
  v_engagement_ratio DECIMAL(5,2);
  v_account_age_days INTEGER;
  v_profile_complete BOOLEAN;
  v_tokens INTEGER;
  v_days_active INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_stories_created FROM stories WHERE creator_id = p_user_id;
  SELECT COUNT(*) INTO v_contributions FROM contributions WHERE user_id = p_user_id;
  SELECT COALESCE(SUM(view_count), 0) INTO v_views_received FROM stories WHERE creator_id = p_user_id;
  
  SELECT COALESCE(
    (SELECT COUNT(*) FROM story_likes sl JOIN stories s ON sl.story_id = s.id WHERE s.creator_id = p_user_id)
    + (SELECT COUNT(*) FROM story_comments sc JOIN stories s ON sc.story_id = s.id WHERE s.creator_id = p_user_id),
    0
  ) INTO v_engagement_score;
  
  SELECT COUNT(*) INTO v_groups_created FROM groups WHERE creator_id = p_user_id;
  SELECT COUNT(*) INTO v_followers FROM followers WHERE following_id = p_user_id;
  SELECT COUNT(*) INTO v_following FROM followers WHERE follower_id = p_user_id;
  
  v_engagement_ratio := calculate_engagement_ratio(p_user_id);
  
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_account_age_days FROM profiles WHERE user_id = p_user_id;
  SELECT (name IS NOT NULL AND name != '' AND avatar IS NOT NULL) INTO v_profile_complete FROM profiles WHERE user_id = p_user_id;
  SELECT tokens INTO v_tokens FROM profiles WHERE user_id = p_user_id;
  
  SELECT COUNT(DISTINCT DATE(created_at)) INTO v_days_active
  FROM (
    SELECT created_at FROM contributions WHERE user_id = p_user_id
    UNION ALL
    SELECT created_at FROM stories WHERE creator_id = p_user_id
  ) AS activity;
  
  INSERT INTO verification_criteria (
    user_id, total_stories_created, total_contributions, total_views_received,
    total_engagement_score, days_active, groups_created, total_followers,
    total_following, engagement_ratio, account_age_days, profile_complete, tokens_earned, updated_at
  ) VALUES (
    p_user_id, v_stories_created, v_contributions, v_views_received,
    v_engagement_score, v_days_active, v_groups_created, v_followers,
    v_following, v_engagement_ratio, v_account_age_days, v_profile_complete, v_tokens, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_stories_created = EXCLUDED.total_stories_created,
    total_contributions = EXCLUDED.total_contributions,
    total_views_received = EXCLUDED.total_views_received,
    total_engagement_score = EXCLUDED.total_engagement_score,
    days_active = EXCLUDED.days_active,
    groups_created = EXCLUDED.groups_created,
    total_followers = EXCLUDED.total_followers,
    total_following = EXCLUDED.total_following,
    engagement_ratio = EXCLUDED.engagement_ratio,
    account_age_days = EXCLUDED.account_age_days,
    profile_complete = EXCLUDED.profile_complete,
    tokens_earned = EXCLUDED.tokens_earned,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION check_verification_eligibility(p_user_id TEXT, p_tier TEXT DEFAULT 'bronze')
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_criteria verification_criteria%ROWTYPE;
  v_requirements verification_requirements%ROWTYPE;
BEGIN
  SELECT * INTO v_criteria FROM verification_criteria WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  
  SELECT * INTO v_requirements FROM verification_requirements WHERE tier = p_tier;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  
  RETURN (
    v_criteria.total_stories_created >= v_requirements.min_stories_created AND
    v_criteria.total_contributions >= v_requirements.min_contributions AND
    v_criteria.total_views_received >= v_requirements.min_views_received AND
    v_criteria.total_engagement_score >= v_requirements.min_engagement_score AND
    v_criteria.days_active >= v_requirements.min_days_active AND
    v_criteria.groups_created >= v_requirements.min_groups_created AND
    v_criteria.total_followers >= v_requirements.min_followers AND
    v_criteria.engagement_ratio >= v_requirements.min_engagement_ratio AND
    v_criteria.account_age_days >= v_requirements.min_account_age_days AND
    (NOT v_requirements.require_profile_complete OR v_criteria.profile_complete) AND
    v_criteria.tokens_earned >= v_requirements.min_tokens_earned AND
    v_criteria.tokens_spent >= v_requirements.min_tokens_spent AND
    (NOT v_requirements.require_email_verified OR v_criteria.email_verified) AND
    (NOT v_requirements.require_phone_verified OR v_criteria.phone_verified) AND
    v_criteria.violations_count <= v_requirements.max_violations
  );
END;
$$;

CREATE OR REPLACE FUNCTION auto_grant_verification(p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_tier TEXT;
  v_new_tier TEXT;
  v_is_verified BOOLEAN;
BEGIN
  SELECT is_verified, verification_tier INTO v_is_verified, v_current_tier
  FROM profiles WHERE user_id = p_user_id;
  
  PERFORM update_verification_criteria(p_user_id);
  
  IF check_verification_eligibility(p_user_id, 'gold') THEN v_new_tier := 'gold';
  ELSIF check_verification_eligibility(p_user_id, 'silver') THEN v_new_tier := 'silver';
  ELSIF check_verification_eligibility(p_user_id, 'bronze') THEN v_new_tier := 'bronze';
  ELSE
    IF v_is_verified THEN
      UPDATE profiles SET is_verified = FALSE, verification_tier = NULL, verified_at = NULL
      WHERE user_id = p_user_id;
      INSERT INTO verification_audit_log (user_id, action, previous_tier, reason)
      VALUES (p_user_id, 'revoked', v_current_tier, 'No longer meets minimum criteria');
      RETURN 'revoked';
    END IF;
    RETURN 'not_eligible';
  END IF;
  
  IF NOT v_is_verified THEN
    UPDATE profiles SET is_verified = TRUE, verification_tier = v_new_tier, verified_at = NOW()
    WHERE user_id = p_user_id;
    INSERT INTO verification_audit_log (user_id, action, new_tier, reason)
    VALUES (p_user_id, 'granted', v_new_tier, 'Met all criteria for ' || v_new_tier || ' tier');
    RETURN 'granted_' || v_new_tier;
  ELSIF v_current_tier != v_new_tier THEN
    UPDATE profiles SET verification_tier = v_new_tier, verified_at = NOW()
    WHERE user_id = p_user_id;
    INSERT INTO verification_audit_log (user_id, action, previous_tier, new_tier, reason)
    VALUES (p_user_id, CASE WHEN v_new_tier > v_current_tier THEN 'upgraded' ELSE 'downgraded' END, v_current_tier, v_new_tier, 'Criteria updated');
    RETURN CASE WHEN v_new_tier > v_current_tier THEN 'upgraded_' ELSE 'downgraded_' END || v_new_tier;
  END IF;
  
  RETURN 'unchanged';
END;
$$;

-- ============================================================================
-- 4. MONETIZATION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_monetization_eligibility(p_user_id TEXT, p_requirement_type TEXT DEFAULT 'story')
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_criteria verification_criteria%ROWTYPE;
  v_requirements monetization_requirements%ROWTYPE;
  v_has_restrictions BOOLEAN;
BEGIN
  SELECT (monetization_restrictions IS NOT NULL) INTO v_has_restrictions FROM profiles WHERE user_id = p_user_id;
  IF v_has_restrictions THEN RETURN FALSE; END IF;
  
  SELECT * INTO v_criteria FROM verification_criteria WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    PERFORM update_verification_criteria(p_user_id);
    SELECT * INTO v_criteria FROM verification_criteria WHERE user_id = p_user_id;
  END IF;
  
  SELECT * INTO v_requirements FROM monetization_requirements WHERE requirement_type = p_requirement_type;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  
  RETURN (
    v_criteria.account_age_days >= v_requirements.min_account_age_days AND
    v_criteria.total_stories_created >= v_requirements.min_stories_created AND
    v_criteria.total_contributions >= v_requirements.min_contributions AND
    v_criteria.tokens_earned >= v_requirements.min_tokens_earned AND
    (NOT v_requirements.require_email_verified OR v_criteria.email_verified) AND
    (NOT v_requirements.require_profile_complete OR v_criteria.profile_complete) AND
    v_criteria.violations_count <= v_requirements.max_violations AND
    v_criteria.total_followers >= v_requirements.min_followers AND
    v_criteria.total_engagement_score >= v_requirements.min_engagement_score
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_monetization_eligibility(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_can_monetize BOOLEAN;
  v_current_status BOOLEAN;
BEGIN
  SELECT can_monetize_stories INTO v_current_status FROM profiles WHERE user_id = p_user_id;
  v_can_monetize := check_monetization_eligibility(p_user_id, 'story');
  
  IF v_can_monetize != COALESCE(v_current_status, FALSE) THEN
    UPDATE profiles SET 
      can_monetize_stories = v_can_monetize,
      monetization_enabled_at = CASE WHEN v_can_monetize AND NOT COALESCE(v_current_status, FALSE) THEN NOW() ELSE monetization_enabled_at END
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_can_monetize;
END;
$$;

CREATE OR REPLACE FUNCTION restrict_monetization(p_user_id TEXT, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET can_monetize_stories = FALSE, monetization_restrictions = p_reason WHERE user_id = p_user_id;
  UPDATE stories SET monetization_cost = NULL WHERE creator_id = p_user_id AND monetization_cost > 0;
END;
$$;

CREATE OR REPLACE FUNCTION lift_monetization_restriction(p_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET monetization_restrictions = NULL WHERE user_id = p_user_id;
  PERFORM update_monetization_eligibility(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION check_story_monetization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_can_monetize BOOLEAN;
  v_is_group_story BOOLEAN;
BEGIN
  IF NEW.monetization_cost IS NULL OR NEW.monetization_cost = 0 THEN
    RETURN NEW;
  END IF;
  
  v_is_group_story := (NEW.group_id IS NOT NULL);
  IF v_is_group_story THEN RETURN NEW; END IF;
  
  SELECT check_monetization_eligibility(NEW.creator_id, 'story') INTO v_can_monetize;
  IF NOT v_can_monetize THEN
    RAISE EXCEPTION 'User not eligible to monetize stories yet.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_monetization_status(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'can_monetize', can_monetize_stories,
    'is_restricted', (monetization_restrictions IS NOT NULL),
    'restriction_reason', monetization_restrictions,
    'enabled_at', monetization_enabled_at,
    'progress', (
      SELECT json_build_object(
        'account_age_days', account_age_days,
        'account_age_required', min_account_age_days,
        'account_age_met', account_age_days >= min_account_age_days,
        'stories_created', total_stories_created,
        'stories_required', min_stories_created,
        'stories_met', total_stories_created >= min_stories_created,
        'tokens_earned', tokens_earned,
        'tokens_required', min_tokens_earned,
        'tokens_met', tokens_earned >= min_tokens_earned,
        'profile_complete', profile_complete,
        'email_verified', email_verified,
        'no_violations', violations_count = 0
      )
      FROM monetization_eligibility_progress
      WHERE user_id = p_user_id
    )
  ) INTO v_result FROM profiles WHERE user_id = p_user_id;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 5. BRAND CONTENT APPROVAL FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_brand_of_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_story stories%ROWTYPE;
  v_contributor_name TEXT;
BEGIN
  SELECT * INTO v_story FROM stories WHERE id = NEW.story_id;
  
  IF v_story.brand_id IS NOT NULL AND v_story.post_type IN ('canon', 'seed') THEN
    SELECT name INTO v_contributor_name FROM profiles WHERE user_id = NEW.user_id;
    
    INSERT INTO notifications (user_id, type, title, message, data, action_url)
    VALUES (
      v_story.brand_id,
      'story_turn',
      'New Content for Review',
      v_contributor_name || ' submitted content for your story "' || v_story.title || '"',
      jsonb_build_object('story_id', v_story.id, 'contribution_id', NEW.id, 'contributor_id', NEW.user_id),
      '/story/' || v_story.id || '/review'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION contribution_needs_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_story stories%ROWTYPE;
BEGIN
  SELECT * INTO v_story FROM stories WHERE id = NEW.story_id;
  
  IF v_story.brand_id IS NOT NULL AND v_story.post_type IN ('canon', 'seed') THEN
    NEW.approval_status := 'pending';
  ELSE
    NEW.approval_status := 'approved';
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. BRAND PAYMENT STATUS FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS update_story_payment_status(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_story_payment_status(
  p_story_id UUID,
  p_payment_status TEXT,
  p_payment_metadata TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE stories
  SET payment_status = p_payment_status,
      payment_metadata = p_payment_metadata,
      updated_at = NOW()
  WHERE id = p_story_id;
END;
$$;

-- ============================================================================
-- 7. GROUP JOIN REQUEST FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_group_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_group groups%ROWTYPE;
  v_requester_name TEXT;
BEGIN
  SELECT * INTO v_group FROM groups WHERE id = NEW.group_id;
  SELECT name INTO v_requester_name FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, title, message, data, action_url)
  VALUES (
    v_group.owner_id,
    'group_update',
    'New Join Request',
    v_requester_name || ' wants to join "' || v_group.name || '"',
    jsonb_build_object('group_id', v_group.id, 'user_id', NEW.user_id, 'request_id', NEW.id),
    '/groups/' || v_group.id || '/settings'
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_group_request_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_group groups%ROWTYPE;
BEGIN
  IF NEW.status != OLD.status THEN
    SELECT * INTO v_group FROM groups WHERE id = NEW.group_id;
    
    IF NEW.status = 'approved' THEN
      INSERT INTO group_members (group_id, user_id, role) VALUES (NEW.group_id, NEW.user_id, 'member');
      UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
      
      INSERT INTO notifications (user_id, type, title, message, data, action_url)
      VALUES (
        NEW.user_id, 'group_joined', 'Request Approved',
        'You have been accepted into "' || v_group.name || '"',
        jsonb_build_object('group_id', v_group.id),
        '/groups/' || v_group.id
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO notifications (user_id, type, title, message, data, action_url)
      VALUES (
        NEW.user_id, 'group_update', 'Request Declined',
        'Your request to join "' || v_group.name || '" was declined',
        jsonb_build_object('group_id', v_group.id),
        '/groups/' || v_group.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 8. DISPLAY NAME RESTRICTIONS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_last_change TIMESTAMPTZ;
  v_days_since_change INTEGER;
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    SELECT last_name_change INTO v_last_change FROM profiles WHERE user_id = NEW.user_id;
    
    IF v_last_change IS NOT NULL THEN
      v_days_since_change := EXTRACT(DAY FROM NOW() - v_last_change);
      IF v_days_since_change < 30 THEN
        RAISE EXCEPTION 'You can only change your name once every 30 days. Please wait % more days.', 30 - v_days_since_change;
      END IF;
    END IF;
    
    NEW.last_name_change := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 9. REMAINING RLS POLICY FIXES
-- ============================================================================

-- Contributions: Require authenticated user
DROP POLICY IF EXISTS "Users can add contributions" ON contributions;
CREATE POLICY "Users can add contributions" ON contributions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Profiles: Users can only insert/update their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Note: We keep "Users can update their own profile" as is since it already has proper USING clause

-- Stories: Require creator_id to match for insert
DROP POLICY IF EXISTS "Users can create stories" ON stories;
CREATE POLICY "Users can create stories" ON stories
  FOR INSERT
  WITH CHECK (creator_id = auth.uid()::text);

-- Story participants: Tighten policies
DROP POLICY IF EXISTS "Story participants can be added" ON story_participants;
CREATE POLICY "Story participants can be added" ON story_participants
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND creator_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Story participants can be removed" ON story_participants;
CREATE POLICY "Story participants can be removed" ON story_participants
  FOR DELETE
  USING (
    user_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND creator_id = auth.uid()::text)
  );

-- ============================================================================
-- DONE
-- ============================================================================
