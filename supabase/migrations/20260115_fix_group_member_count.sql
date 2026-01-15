-- Fix group member count discrepancy

-- Function to calculate and update member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  -- For Insert/Update: Update the group referenced by NEW
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE groups
    SET member_count = (
      SELECT count(*)
      FROM group_members
      WHERE group_id = NEW.group_id
      AND status = 'active'
    )
    WHERE id = NEW.group_id;
  END IF;

  -- For Delete: Update the group referenced by OLD
  -- For Update: also update OLD if group_id changed (unlikely but safe)
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.group_id IS DISTINCT FROM NEW.group_id) THEN
    UPDATE groups
    SET member_count = (
      SELECT count(*)
      FROM group_members
      WHERE group_id = OLD.group_id
      AND status = 'active'
    )
    WHERE id = OLD.group_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_group_member_change ON group_members;
CREATE TRIGGER on_group_member_change
AFTER INSERT OR UPDATE OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Recalculate counts for all groups to fix existing data
UPDATE groups g
SET member_count = (
  SELECT count(*)
  FROM group_members gm
  WHERE gm.group_id = g.id
  AND gm.status = 'active'
);
