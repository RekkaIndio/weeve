import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedFriends() {
  const userId = '878e71bb-fc19-426d-b22f-538fad956bbb'; // jay
  console.log(`Seeding friends for user: ${userId}`);

  // 1. Get other users (limit 5)
  const { data: randomUsers, error } = await supabase
    .from('profiles')
    .select('user_id, name')
    .neq('user_id', userId)
    .limit(5);

  if (error || !randomUsers) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Found ${randomUsers.length} potential friends.`);

  // 2. Add friendships
  const friendships = randomUsers.flatMap(friend => [
      { user_id: userId, friend_id: friend.user_id },
      { user_id: friend.user_id, friend_id: userId } // Bidirectional
  ]);

  const { error: insertError } = await supabase
    .from('friendships')
    .insert(friendships);

  if (insertError) {
      // Ignore duplicates error
      if (insertError.code === '23505') {
          console.log('Some friendships already exist.');
      } else {
        console.error('Error inserting friendships:', insertError);
        return;
      }
  }

  console.log(`Successfully added ${randomUsers.length} friends!`);
  
  // Verify
   const { count } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
    
   console.log(`User now has ${count} friends.`);
}

seedFriends();
