-- Migration: Add UPDATE policy for group_members table
-- This allows group owners and admins to approve join requests (update status from 'pending' to 'active')

-- Drop existing update policy if present
DROP POLICY IF EXISTS "Owners and admins can update members" ON group_members;

-- Create UPDATE policy for group owners and admins
CREATE POLICY "Owners and admins can update members" ON group_members
FOR UPDATE USING (
  -- Allow if user is the group owner
  EXISTS (
    SELECT 1 FROM groups 
    WHERE id = group_members.group_id 
    AND owner_id = auth.uid()::text
  )
  OR
  -- Allow if user is an admin of the group
  EXISTS (
    SELECT 1 FROM group_members AS gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()::text
    AND gm.role = 'admin'
    AND gm.status = 'active'
  )
);
