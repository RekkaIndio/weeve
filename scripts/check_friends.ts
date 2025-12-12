import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFriends() {
  const userId = '878e71bb-fc19-426d-b22f-538fad956bbb'; // jay's id from previous output
  console.log(`Checking friends for user: ${userId}`);
  
  // 1. Check friendships
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching friendships:', error);
    return;
  }

  console.log(`Friendships found: ${friendships?.length}`);
  console.table(friendships);

  if (!friendships?.length) {
      console.log('No friendships found for this user.');
      // Check if there are ANY friendships
      const { count } = await supabase.from('friendships').select('*', { count: 'exact', head: true });
      console.log(`Total friendships in DB: ${count}`);
      return;
  }

  // 2. Check profiles for these friends
  const friendIds = friendships.map(f => f.friend_id);
  console.log('Friend IDs:', friendIds);

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('user_id', friendIds);

  if (profileError) {
      console.error('Error fetching profiles:', profileError);
  }

  console.log(`Profiles found: ${profiles?.length}`);
  console.table(profiles);
}

checkFriends();
