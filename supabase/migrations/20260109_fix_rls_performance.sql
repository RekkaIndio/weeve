-- Fix RLS Performance Warnings
-- 1. auth_rls_initplan: Wrap auth.<function>() and current_setting() in (select ...)
-- 2. multiple_permissive_policies: Change service role "FOR ALL" to specific actions (INSERT, UPDATE, DELETE)
--    to avoid duplicating SELECT with public read policies

-- ============================================================================
-- FIX: is_conversation_participant helper function
-- Wrap auth.uid() in subselect to prevent per-row re-evaluation
-- First drop policies that depend on this function
-- ============================================================================
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;

DROP FUNCTION IF EXISTS is_conversation_participant(uuid);
CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_participants.conversation_id = p_conversation_id
    AND conversation_participants.user_id = ((select auth.uid()))::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate policies that depend on the function
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (is_conversation_participant(conversation_id));

CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (is_conversation_participant(id));

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (is_conversation_participant(conversation_id));

-- ============================================================================
-- FIX: participants_delete policy
-- Wrap auth.uid() in subselect
-- ============================================================================
DROP POLICY IF EXISTS "participants_delete" ON conversation_participants;
CREATE POLICY "participants_delete" ON conversation_participants
  FOR DELETE USING (
    user_id = ((select auth.uid()))::text
  );

-- ============================================================================
-- FIX: messages_insert policy  
-- Uses is_conversation_participant (now fixed) but also directly uses auth.uid()
-- ============================================================================
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = ((select auth.uid()))::text AND
    is_conversation_participant(conversation_id)
  );

-- ============================================================================
-- FIX: Users can delete their own messages policy
-- Wrap auth.uid() in subselect
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages" ON messages
  FOR UPDATE
  USING (sender_id = ((select auth.uid()))::text)
  WITH CHECK (
    sender_id = ((select auth.uid()))::text 
    AND deleted_at IS NOT NULL 
    AND deleted_by = ((select auth.uid()))::text
  );

-- ============================================================================
-- FIX: verification_criteria policies
-- 1. Service role policy already uses (select auth.jwt()...) - change to specific actions
-- 2. Drop the redundant service role SELECT to avoid multiple_permissive_policies
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage verification criteria" ON verification_criteria;
CREATE POLICY "Service role can manage verification criteria" ON verification_criteria
  FOR ALL USING (
    ((select auth.jwt())->>'role') = 'service_role'
  );

-- Note: The "Users can view their own verification criteria" policy is for SELECT only,
-- and the service role needs ALL including SELECT for admin operations, so we keep FOR ALL
-- but ensure the subselect is used.

-- ============================================================================
-- FIX: verification_requirements policies
-- Consolidate: Remove "Public read, service role write" + "Service role manages requirements"
-- Replace with: one SELECT for public, one for write operations by service role
-- ============================================================================
DROP POLICY IF EXISTS "Public read, service role write" ON verification_requirements;
DROP POLICY IF EXISTS "Service role manages requirements" ON verification_requirements;
DROP POLICY IF EXISTS "Public can read verification requirements" ON verification_requirements;
DROP POLICY IF EXISTS "Service role can write verification requirements" ON verification_requirements;
DROP POLICY IF EXISTS "Service role can update verification requirements" ON verification_requirements;
DROP POLICY IF EXISTS "Service role can delete verification requirements" ON verification_requirements;

-- Public can read
CREATE POLICY "Public can read verification requirements" ON verification_requirements
  FOR SELECT USING (true);

-- Service role can write (INSERT, UPDATE, DELETE only - not SELECT to avoid duplicate)
CREATE POLICY "Service role can write verification requirements" ON verification_requirements
  FOR INSERT WITH CHECK (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can update verification requirements" ON verification_requirements
  FOR UPDATE USING (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can delete verification requirements" ON verification_requirements
  FOR DELETE USING (((select auth.jwt())->>'role') = 'service_role');

-- ============================================================================
-- FIX: verification_audit_log policies
-- Same pattern: public SELECT for user's own + separate write policies for service role
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage audit log" ON verification_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit log" ON verification_audit_log;
DROP POLICY IF EXISTS "Service role can update audit log" ON verification_audit_log;
DROP POLICY IF EXISTS "Service role can delete audit log" ON verification_audit_log;
DROP POLICY IF EXISTS "Users can view their own verification audit log" ON verification_audit_log;
DROP POLICY IF EXISTS "Users can view verification audit log" ON verification_audit_log;

-- Service role write operations only (SELECT handled by user's own policy)
CREATE POLICY "Service role can insert audit log" ON verification_audit_log
  FOR INSERT WITH CHECK (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can update audit log" ON verification_audit_log
  FOR UPDATE USING (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can delete audit log" ON verification_audit_log
  FOR DELETE USING (((select auth.jwt())->>'role') = 'service_role');

-- Also need SELECT for service role to see all records (different from user's own)
-- Use a single combined policy
CREATE POLICY "Users can view verification audit log" ON verification_audit_log
  FOR SELECT USING (
    ((select auth.uid()))::text = user_id OR
    ((select auth.jwt())->>'role') = 'service_role'
  );

-- ============================================================================
-- FIX: monetization_requirements policies
-- Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Public read monetization requirements" ON monetization_requirements;
DROP POLICY IF EXISTS "Service role manages monetization" ON monetization_requirements;
DROP POLICY IF EXISTS "Anyone can read monetization requirements" ON monetization_requirements;
DROP POLICY IF EXISTS "Service role can insert monetization requirements" ON monetization_requirements;
DROP POLICY IF EXISTS "Service role can update monetization requirements" ON monetization_requirements;
DROP POLICY IF EXISTS "Service role can delete monetization requirements" ON monetization_requirements;

-- Single SELECT policy for everyone
CREATE POLICY "Anyone can read monetization requirements" ON monetization_requirements
  FOR SELECT USING (true);

-- Service role write operations only
CREATE POLICY "Service role can insert monetization requirements" ON monetization_requirements
  FOR INSERT WITH CHECK (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can update monetization requirements" ON monetization_requirements
  FOR UPDATE USING (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can delete monetization requirements" ON monetization_requirements
  FOR DELETE USING (((select auth.jwt())->>'role') = 'service_role');

-- ============================================================================
-- FIX: brand_pricing policies
-- Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Public read brand pricing" ON brand_pricing;
DROP POLICY IF EXISTS "Service role manages brand pricing" ON brand_pricing;
DROP POLICY IF EXISTS "Anyone can read brand pricing" ON brand_pricing;
DROP POLICY IF EXISTS "Service role can insert brand pricing" ON brand_pricing;
DROP POLICY IF EXISTS "Service role can update brand pricing" ON brand_pricing;
DROP POLICY IF EXISTS "Service role can delete brand pricing" ON brand_pricing;

-- Single SELECT policy for everyone
CREATE POLICY "Anyone can read brand pricing" ON brand_pricing
  FOR SELECT USING (true);

-- Service role write operations only
CREATE POLICY "Service role can insert brand pricing" ON brand_pricing
  FOR INSERT WITH CHECK (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can update brand pricing" ON brand_pricing
  FOR UPDATE USING (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can delete brand pricing" ON brand_pricing
  FOR DELETE USING (((select auth.jwt())->>'role') = 'service_role');

-- ============================================================================
-- FIX: transactions policies
-- Consolidate SELECT policies - authenticated users can view, service role manages writes
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
DROP POLICY IF EXISTS "Service role manages transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can update transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can delete transactions" ON transactions;

-- Authenticated users can view (includes service role via authenticated check)
CREATE POLICY "Authenticated users can view transactions" ON transactions
  FOR SELECT USING (
    (select auth.role()) = 'authenticated' OR
    ((select auth.jwt())->>'role') = 'service_role'
  );

-- Service role write operations only
CREATE POLICY "Service role can insert transactions" ON transactions
  FOR INSERT WITH CHECK (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can update transactions" ON transactions
  FOR UPDATE USING (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can delete transactions" ON transactions
  FOR DELETE USING (((select auth.jwt())->>'role') = 'service_role');

-- ============================================================================
-- FIX: hashtags policies
-- 1. Fix current_setting() by wrapping in subselect
-- 2. Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Public read hashtags" ON hashtags;
DROP POLICY IF EXISTS "System manages hashtags" ON hashtags;
DROP POLICY IF EXISTS "Anyone can read hashtags" ON hashtags;
DROP POLICY IF EXISTS "System can insert hashtags" ON hashtags;
DROP POLICY IF EXISTS "System can update hashtags" ON hashtags;
DROP POLICY IF EXISTS "System can delete hashtags" ON hashtags;

-- Single SELECT policy for everyone
CREATE POLICY "Anyone can read hashtags" ON hashtags
  FOR SELECT USING (true);

-- System (service role and triggers) write operations only
-- Triggers run without JWT context, so check for null claims
CREATE POLICY "System can insert hashtags" ON hashtags
  FOR INSERT WITH CHECK (
    ((select auth.jwt())->>'role') = 'service_role' OR
    (select current_setting('request.jwt.claims', true)) IS NULL
  );

CREATE POLICY "System can update hashtags" ON hashtags
  FOR UPDATE USING (
    ((select auth.jwt())->>'role') = 'service_role' OR
    (select current_setting('request.jwt.claims', true)) IS NULL
  );

CREATE POLICY "System can delete hashtags" ON hashtags
  FOR DELETE USING (
    ((select auth.jwt())->>'role') = 'service_role' OR
    (select current_setting('request.jwt.claims', true)) IS NULL
  );

-- ============================================================================
-- FIX: verification_criteria - consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own verification criteria" ON verification_criteria;
DROP POLICY IF EXISTS "Service role can manage verification criteria" ON verification_criteria;
DROP POLICY IF EXISTS "Users can view verification criteria" ON verification_criteria;
DROP POLICY IF EXISTS "Service role can insert verification criteria" ON verification_criteria;
DROP POLICY IF EXISTS "Service role can update verification criteria" ON verification_criteria;
DROP POLICY IF EXISTS "Service role can delete verification criteria" ON verification_criteria;

-- Combined SELECT policy
CREATE POLICY "Users can view verification criteria" ON verification_criteria
  FOR SELECT USING (
    ((select auth.uid()))::text = user_id OR
    ((select auth.jwt())->>'role') = 'service_role'
  );

-- Service role write operations only
CREATE POLICY "Service role can insert verification criteria" ON verification_criteria
  FOR INSERT WITH CHECK (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can update verification criteria" ON verification_criteria
  FOR UPDATE USING (((select auth.jwt())->>'role') = 'service_role');

CREATE POLICY "Service role can delete verification criteria" ON verification_criteria
  FOR DELETE USING (((select auth.jwt())->>'role') = 'service_role');

-- ============================================================================
-- DONE
-- ============================================================================
