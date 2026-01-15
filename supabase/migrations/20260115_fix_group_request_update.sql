-- Patch handle_group_request_update to avoid double counting with the new trigger

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
      -- REMOVED manual update of member_count, handled by trigger on group_members
      -- UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
      
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
