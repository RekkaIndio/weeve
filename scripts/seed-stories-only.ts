import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/lib/database.types'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

async function seedStoriesOnly() {
    console.log('🌱 Seeding a single story...')

    try {
        // 1. Get a user ID to assign the story to
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .limit(1)

        if (profileError) {
            console.error('Error fetching profiles:', profileError)
            // Fallback to 'me' if we can't read profiles (though that would likely mean auth/RLS issues)
        }

        const userId = profiles && profiles.length > 0 ? profiles[0].user_id : 'me'
        console.log(`Using creator_id: ${userId}`)

        // 2. Insert the story
        const { data: story, error: storyError } = await supabase
            .from('stories')
            .insert({
                title: 'Welcome to Weeve',
                description: 'This is your first story to get things started! 🚀',
                creator_id: userId,
                mode: 'open' as const,
                status: 'active' as const,
                cover_image: 'https://images.unsplash.com/photo-1519681393798-3828d503d975?q=80&w=1000&auto=format&fit=crop',
            } as any)
            .select()
            .single()

        if (storyError) throw storyError
        console.log(`✅ Created story: "${story.title}" (ID: ${story.id})`)

        // 3. Add a participant (the creator)
        await supabase.from('story_participants').insert([
            { story_id: story.id, user_id: userId, position: 0 }
        ] as any)
        
         console.log('✅ Added creator as participant')

        console.log('🎉 Story seeded successfully! The app loop should be fixed.')
        
    } catch (error) {
        console.error('❌ Error seeding story:', error)
        process.exit(1)
    }
}

seedStoriesOnly()
