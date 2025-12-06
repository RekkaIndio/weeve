// Supabase Edge Function to check and handle expired story turn timers
// This can be triggered via cron job (every 15 minutes recommended)
//
// NOTE: TypeScript errors in this file are normal - this runs in Deno, not Node.js
// The code will work correctly when deployed to Supabase Edge Functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Story {
  id: string
  title: string
  current_turn_user_id: string
  turn_timer_hours: number
  updated_at: string
  contributions: Array<{ timestamp: number }>
  story_participants: Array<{ user_id: string; position: number }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('[Timer Check] Starting timer expiration check...')

    // 1. Find all active stories with timers
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select(`
        id,
        title,
        current_turn_user_id,
        turn_timer_hours,
        updated_at,
        contributions(timestamp),
        story_participants(user_id, position)
      `)
      .eq('status', 'active')
      .not('turn_timer_hours', 'is', null)
      .not('current_turn_user_id', 'is', null) as { data: Story[] | null; error: any }

    if (storiesError) {
      console.error('[Timer Check] Error fetching stories:', storiesError)
      throw storiesError
    }

    if (!stories || stories.length === 0) {
      console.log('[Timer Check] No active stories with timers found')
      return new Response(
        JSON.stringify({ success: true, message: 'No stories to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Timer Check] Found ${stories.length} stories with timers`)

    const now = Date.now()
    const expiredStories: Array<{ storyId: string; title: string; userId: string }> = []

    // 2. Check each story for expiration
    for (const story of stories) {
      // Get the last contribution timestamp or use story updated_at
      const contributions = story.contributions || []
      const lastContribution = contributions.sort((a, b) => b.timestamp - a.timestamp)[0]
      const turnStartTime = lastContribution
        ? lastContribution.timestamp
        : new Date(story.updated_at).getTime()

      const timerDurationMs = story.turn_timer_hours * 60 * 60 * 1000
      const expiryTime = turnStartTime + timerDurationMs

      if (now >= expiryTime) {
        console.log(`[Timer Check] Story "${story.title}" (${story.id}) has expired`)
        expiredStories.push({
          storyId: story.id,
          title: story.title,
          userId: story.current_turn_user_id,
        })
      }
    }

    console.log(`[Timer Check] Found ${expiredStories.length} expired stories`)

    // 3. Handle each expired story
    const results = []
    for (const expired of expiredStories) {
      try {
        // Get all participants ordered by position
        const { data: participants } = await supabase
          .from('story_participants')
          .select('user_id, position')
          .eq('story_id', expired.storyId)
          .order('position', { ascending: true })

        if (!participants || participants.length === 0) {
          console.log(`[Timer Check] No participants for story ${expired.storyId}, skipping`)
          continue
        }

        // Find current user's position
        const currentUserIndex = participants.findIndex(p => p.user_id === expired.userId)
        if (currentUserIndex === -1) {
          console.log(`[Timer Check] Current turn user not found in participants for story ${expired.storyId}`)
          continue
        }

        // Get next user (circular)
        const nextUserIndex = (currentUserIndex + 1) % participants.length
        const nextUserId = participants[nextUserIndex].user_id

        // Update story to next user's turn
        const { error: updateError } = await supabase
          .from('stories')
          .update({ current_turn_user_id: nextUserId })
          .eq('id', expired.storyId)

        if (updateError) {
          console.error(`[Timer Check] Error updating story ${expired.storyId}:`, updateError)
          results.push({ storyId: expired.storyId, success: false, error: updateError.message })
          continue
        }

        // Send notification to the skipped user
        await supabase
          .from('notifications')
          .insert({
            user_id: expired.userId,
            type: 'timer_expired',
            title: 'Your turn expired',
            message: `Your turn in "${expired.title}" expired and has been passed to the next person.`,
            story_id: expired.storyId,
            created_at: new Date().toISOString(),
          })

        // Send notification to the next user
        await supabase
          .from('notifications')
          .insert({
            user_id: nextUserId,
            type: 'your_turn',
            title: "It's your turn!",
            message: `It's now your turn in "${expired.title}"`,
            story_id: expired.storyId,
            created_at: new Date().toISOString(),
          })

        console.log(`[Timer Check] Successfully skipped turn for story ${expired.storyId}`)
        results.push({ storyId: expired.storyId, success: true })
      } catch (error) {
        console.error(`[Timer Check] Error processing expired story ${expired.storyId}:`, error)
        results.push({ storyId: expired.storyId, success: false, error: String(error) })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${stories.length} stories, processed ${expiredStories.length} expirations`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Timer Check] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
