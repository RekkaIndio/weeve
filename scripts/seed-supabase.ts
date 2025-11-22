import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/lib/database.types'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

async function seedDatabase() {
    console.log('🌱 Seeding Supabase database...')

    try {
        // Seed profiles
        console.log('Creating profiles...')
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .insert([
                {
                    user_id: 'me',
                    name: 'Jay',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay',
                    tokens: 100,
                    invite_code: 'JAY-VIP-2024',
                },
                {
                    user_id: '1',
                    name: 'Alice',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
                    tokens: 0,
                },
                {
                    user_id: '2',
                    name: 'Bob',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
                    tokens: 0,
                },
                {
                    user_id: '3',
                    name: 'Carol',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
                    tokens: 0,
                },
                {
                    user_id: 'influencer1',
                    name: 'Sarah Star',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahStar',
                    tokens: 1000,
                    is_influencer: true,
                    interaction_cost: 50,
                },
            ] as any)
            .select()

        if (profilesError) throw profilesError
        console.log(`✅ Created ${profiles?.length} profiles`)

        // Seed groups
        console.log('Creating groups...')
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .insert([
                {
                    name: 'Gamers Unite',
                    description: 'For all things gaming! 🎮',
                    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Gamers',
                    member_count: 1250,
                    is_private: false,
                },
                {
                    name: 'Life & Chill',
                    description: 'Just vibing and sharing life moments. 🌿',
                    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Life',
                    member_count: 840,
                    is_private: false,
                },
                {
                    name: 'Tech Talk',
                    description: 'Latest in tech and coding. 💻',
                    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Tech',
                    member_count: 560,
                    is_private: true,
                },
            ] as any)
            .select()

        if (groupsError) throw groupsError
        console.log(`✅ Created ${groups?.length} groups`)

        // Seed story: Morning Routine
        console.log('Creating story: Morning Routine...')
        const { data: story1, error: story1Error } = await supabase
            .from('stories')
            .insert({
                title: 'Morning Routine',
                description: 'Show us how you start your day! ☀️',
                creator_id: '1',
                mode: 'open' as const,
                status: 'active' as const,
                cover_image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1000&auto=format&fit=crop',
            } as any)
            .select()
            .single() as any

        if (story1Error) throw story1Error
        if (!story1) throw new Error('Failed to create story 1')

        await supabase.from('story_participants').insert([
            { story_id: story1.id, user_id: '1', position: 0 },
            { story_id: story1.id, user_id: 'me', position: 1 },
        ] as any)

        await supabase.from('contributions').insert([
            {
                story_id: story1.id,
                user_id: '1',
                user_name: 'Alice',
                content: 'Coffee first, always. ☕️',
                media_type: 'video' as const,
                media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                timestamp: 1700000000000,
            },
            {
                story_id: story1.id,
                user_id: 'me',
                user_name: 'Jay',
                content: 'Then a quick run! 🏃‍♂️',
                media_type: 'video' as const,
                media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                timestamp: 1700000100000,
            },
        ] as any)

        await supabase.from('story_likes').insert([
            { story_id: story1.id, user_id: '1' },
            { story_id: story1.id, user_id: 'me' },
        ] as any)

        await supabase.from('story_comments').insert([
            {
                story_id: story1.id,
                user_id: '1',
                user_name: 'Alice',
                content: 'This routine is goals! 💪',
                timestamp: 1700000120000,
            },
        ] as any)
        console.log('✅ Created story: Morning Routine')

        // Seed story: Travel Diaries
        console.log('Creating story: Travel Diaries...')
        const { data: story2, error: story2Error } = await supabase
            .from('stories')
            .insert({
                title: 'Travel Diaries',
                description: 'Where is the most beautiful place you have been?',
                creator_id: '2',
                mode: 'invite' as const,
                status: 'active' as const,
                current_turn_user_id: 'me',
                cover_image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
            } as any)
            .select()
            .single() as any

        if (story2Error) throw story2Error
        if (!story2) throw new Error('Failed to create story 2')

        await supabase.from('story_participants').insert([
            { story_id: story2.id, user_id: '2', position: 0 },
            { story_id: story2.id, user_id: 'me', position: 1 },
            { story_id: story2.id, user_id: '3', position: 2 },
        ] as any)

        await supabase.from('contributions').insert([
            {
                story_id: story2.id,
                user_id: '2',
                user_name: 'Bob',
                content: 'Kyoto in autumn is magic. 🍁',
                media_type: 'image' as const,
                media_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700000200000,
            },
        ] as any)

        await supabase.from('story_likes').insert([
            { story_id: story2.id, user_id: '2' },
            { story_id: story2.id, user_id: 'me' },
        ] as any)

        await supabase.from('story_comments').insert([
            {
                story_id: story2.id,
                user_id: '3',
                user_name: 'Carol',
                content: 'Kyoto is on my list! 🍂',
                timestamp: 1700000250000,
            },
        ] as any)
        console.log('✅ Created story: Travel Diaries')

        // Seed story: Urban Jungle Adventure
        console.log('Creating story: Urban Jungle Adventure...')
        const { data: story3, error: story3Error } = await supabase
            .from('stories')
            .insert({
                title: 'Urban Jungle Adventure',
                description: 'Exploring the hidden gems of the city 🏙️',
                creator_id: 'me',
                mode: 'open',
                status: 'active',
                cover_image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1000&auto=format&fit=crop',
            } as any)
            .select()
            .single() as any

        if (story3Error) throw story3Error
        if (!story3) throw new Error('Failed to create story 3')

        await supabase.from('story_participants').insert([
            { story_id: story3.id, user_id: 'me', position: 0 },
            { story_id: story3.id, user_id: '1', position: 1 },
            { story_id: story3.id, user_id: '2', position: 2 },
            { story_id: story3.id, user_id: '3', position: 3 },
        ] as any)

        await supabase.from('contributions').insert([
            {
                story_id: story3.id,
                user_id: 'me',
                user_name: 'Jay',
                content: 'Starting at the old train station 🚂',
                media_type: 'video' as const,
                media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                timestamp: 1700000300000,
            },
            {
                story_id: story3.id,
                user_id: '1',
                user_name: 'Alice',
                content: 'Look at this graffiti art! 🎨',
                media_type: 'image' as const,
                media_url: 'https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700000400000,
            },
            {
                story_id: story3.id,
                user_id: '2',
                user_name: 'Bob',
                content: 'Found a secret rooftop cafe ☕',
                media_type: 'text' as const,
                timestamp: 1700000500000,
            },
            {
                story_id: story3.id,
                user_id: '3',
                user_name: 'Carol',
                content: 'The view from up here is insane!',
                media_type: 'video' as const,
                media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                timestamp: 1700000600000,
            },
            {
                story_id: story3.id,
                user_id: 'me',
                user_name: 'Jay',
                content: 'Sunset vibes 🌅',
                media_type: 'image' as const,
                media_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700000700000,
            },
            {
                story_id: story3.id,
                user_id: '1',
                user_name: 'Alice',
                content: 'Heading to the night market now 🍜',
                media_type: 'text' as const,
                timestamp: 1700000800000,
            },
            {
                story_id: story3.id,
                user_id: '2',
                user_name: 'Bob',
                content: 'Live music on the street! 🎸',
                media_type: 'video' as const,
                media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
                timestamp: 1700000900000,
            },
        ] as any)

        await supabase.from('story_likes').insert([
            { story_id: story3.id, user_id: 'me' },
            { story_id: story3.id, user_id: '1' },
            { story_id: story3.id, user_id: '2' },
            { story_id: story3.id, user_id: '3' },
        ] as any)

        await supabase.from('story_comments').insert([
            {
                story_id: story3.id,
                user_id: '2',
                user_name: 'Bob',
                content: 'Need to visit this rooftop spot! ☕',
                timestamp: 1700000650000,
            },
            {
                story_id: story3.id,
                user_id: '1',
                user_name: 'Alice',
                content: 'Night market time! 🍜',
                timestamp: 1700000850000,
            },
        ] as any)
        console.log('✅ Created story: Urban Jungle Adventure')

        console.log('🎉 Database seeded successfully!')
    } catch (error) {
        console.error('❌ Error seeding database:', error)
        throw error
    }
}

// Run the seed function
seedDatabase()
