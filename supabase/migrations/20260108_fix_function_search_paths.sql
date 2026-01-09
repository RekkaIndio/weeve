-- Fix Security Warnings: Immutable Search Paths
-- Explicitly set search_path to 'public' to prevent search_path hijacking
-- as recommended by Supabase Security Advisor.

-- 1. Fix is_conversation_participant
ALTER FUNCTION is_conversation_participant(uuid) SET search_path = public;

-- 2. Fix set_conversation_creator
ALTER FUNCTION set_conversation_creator() SET search_path = public;
