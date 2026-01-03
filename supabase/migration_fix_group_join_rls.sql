-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can join open groups" ON group_members;

-- Create comprehensive join policy
CREATE POLICY "Users can join groups" ON group_members
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  user_id = auth.uid()::text AND
  (
     -- Allow requesting to join any group (pending status)
     (status = 'pending') 
     OR
     -- Allow joining public groups directly (active status)
     (status = 'active' AND EXISTS ( 
        SELECT 1 FROM groups WHERE id = group_id AND is_private = false 
     ))
     OR
     -- Allow owner to add members (or themselves) directly
     EXISTS ( 
        SELECT 1 FROM groups WHERE id = group_id AND owner_id = auth.uid()::text 
     )
  )
);
