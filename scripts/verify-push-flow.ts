
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPushFlow() {
    console.log('\n🔍 --- VERIFYING NOTIFICATION FLOW ---\n');

    // 1. Check for Push Tokens
    console.log('1. Checking for users with push tokens...');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, push_token')
        .not('push_token', 'is', null);

    if (error) {
        console.error('❌ Error querying profiles:', error.message);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('❌ No profiles found with a push_token.');
        console.log('   -> This means the mobile app has NOT successfully registered with the database.');
        console.log('   -> Check client-side logs in Android Studio / Xcode.');
        return;
    }

    console.log(`✅ Found ${profiles.length} user(s) with push tokens:`);
    profiles.forEach(p => console.log(`   - ${p.name} (ID: ${p.user_id}): ${p.push_token.substring(0, 10)}...`));

    // 2. Trigger Test Notification
    const targetUser = profiles[0];
    console.log(`\n2. Triggering test notification for: ${targetUser.name}...`);

    const { data: notif, error: notifError } = await supabase
        .from('notifications')
        .insert({
            user_id: targetUser.user_id,
            type: 'friend_request',
            title: 'Test Notification 🚀',
            message: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
            data: { sender_id: 'system_test' },
            read: false
        })
        .select()
        .single();

    if (notifError) {
        console.error('❌ Failed to insert notification:', notifError.message);
        // Special check for RLS
        if (notifError.code === '42501') {
             console.log('   -> Hint: This might be RLS (Row Level Security) blocking the insert. Try running with SERVICE_ROLE_KEY.');
        }
        return;
    }

    console.log('✅ Notification inserted into Database!');
    console.log('   ID:', notif.id);
    console.log('\n⏳ Now check your phone! (And check Supabase Edge Function logs if nothing arrives)');
}

verifyPushFlow();
