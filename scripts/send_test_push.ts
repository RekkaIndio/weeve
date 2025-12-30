
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fvyhyexdndynoonkzwbd.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eWh5ZXhkbmR5bm9vbmt6d2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzczNDQ0NywiZXhwIjoyMDc5MzEwNDQ3fQ.CNOaNLB9BfTXNUME9AxXiNmZN9z0VVgCCfYTz0F2jbE';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendTestPush() {
    console.log('Finding user with push token...');
    
    // Find a user with a push token
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, push_token')
        .not('push_token', 'is', null)
        .limit(1);

    if (error || !profiles || profiles.length === 0) {
        console.error('No users found with push tokens!', error);
        return;
    }

    const user = profiles[0];
    console.log(`Found user: ${user.name} (${user.user_id})`);
    console.log('Sending notification...');

    const { error: insertError } = await supabase
        .from('notifications')
        .insert({
            user_id: user.user_id,
            type: 'new_message',
            title: 'Remote Test Notification',
            message: 'This notification was triggered remotely while you were away! 🚀',
            data: { test: 'true' }, // String value!
            read: false,
        });

    if (insertError) {
        console.error('Failed to insert notification:', insertError);
    } else {
        console.log('Notification inserted successfully! Check your phone.');
    }
}

sendTestPush();
