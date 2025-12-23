CREATE OR REPLACE FUNCTION handle_group_join_request()
RETURNS TRIGGER AS $$
DECLARE
    group_name TEXT;
    group_owner_id TEXT;
    admin_record RECORD;
    sender_name TEXT;
BEGIN
    -- Only proceed if status is 'pending' (new request)
    IF NEW.status = 'pending' THEN
        -- Get Group Name and Owner
        SELECT name, owner_id INTO group_name, group_owner_id FROM groups WHERE id = NEW.group_id;
        
        -- Get Sender Name
        SELECT name INTO sender_name FROM profiles WHERE user_id = NEW.user_id;

        -- Notify Owner
        IF group_owner_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, data, action_url)
            VALUES (
                group_owner_id,
                'group_join_request',
                'New Join Request',
                sender_name || ' requested to join ' || group_name,
                jsonb_build_object('group_id', NEW.group_id, 'requester_id', NEW.user_id),
                '/groups/' || NEW.group_id || '/settings'
            );
        END IF;

        -- Notify Admins
        FOR admin_record IN 
            SELECT user_id FROM group_members 
            WHERE group_id = NEW.group_id AND role = 'admin' AND status = 'active'
        LOOP
            -- Avoid double notifying if owner is also admin (though typically owner isn't listed as admin role explicitly in some systems, but here let's be safe)
            IF admin_record.user_id != group_owner_id THEN
                INSERT INTO notifications (user_id, type, title, message, data, action_url)
                VALUES (
                    admin_record.user_id,
                    'group_join_request',
                    'New Join Request',
                    sender_name || ' requested to join ' || group_name,
                    jsonb_build_object('group_id', NEW.group_id, 'requester_id', NEW.user_id),
                    '/groups/' || NEW.group_id || '/settings'
                );
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;