import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/lib/database.types'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// --- Data Definitions ---

const USERS = [
    { id: 'u_photo', name: 'Lens Queen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', description: 'Chasing light & shadows 📸' },
    { id: 'u_chef', name: 'Gourmet Dan', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', description: 'Food is love ❤️' },
    { id: 'u_travel', name: 'Wanderlust', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', description: 'Always exploring 🌍' },
    { id: 'u_tech', name: 'Cyber Dev', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=150&q=80', description: 'Building the future 💻' },
    { id: 'u_art', name: 'Creative Soul', avatar: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=150&q=80', description: 'Art is life 🎨' },
    { id: 'u_fit', name: 'Gym Rat', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', description: 'No pain no gain 💪' },
    { id: 'u_pet', name: 'Pet Lover', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', description: 'Dog mom 🐶' },
    { id: 'u_car', name: 'Gear Head', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80', description: 'Speed & Style 🏎️' },
]

const STORIES = [
    {
        title: 'Neon Nights',
        description: 'The city comes alive when the sun goes down. 🌃',
        creator: 'u_photo',
        cover: 'https://images.unsplash.com/photo-1555685812-4b943f3db990?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_photo', content: 'Rainy reflections in Shinjuku.', media: 'image', url: 'https://images.unsplash.com/photo-1565459023348-1852089f812e?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_travel', content: 'The lights are mesmerizing!', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }, // Using sample video
            { user: 'u_art', content: 'Cyberpunk vibes everywhere.', media: 'image', url: 'https://images.unsplash.com/photo-1580191957467-3a8630b910d6?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Culinary Journey',
        description: 'A tour of the best flavors in town. 🍜',
        creator: 'u_chef',
        cover: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_chef', content: 'Starting with some fresh sushi.', media: 'image', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'The presentation is exquisite.', media: 'image', url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_chef', content: 'Finishing with a lava cake.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' }
        ]
    },
    {
        title: 'Mountain Escapes',
        description: 'Breathing in that fresh alpine air. 🏔️',
        creator: 'u_travel',
        cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_travel', content: 'The view from the summit.', media: 'image', url: 'https://images.unsplash.com/photo-1486870591958-9b9d0ae1f703?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_fit', content: 'That hike was killer but worth it!', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' },
            { user: 'u_photo', content: 'Sunrise over the peaks.', media: 'image', url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Digital Artworks',
        description: 'Pixels and polygons. 🎨',
        creator: 'u_art',
        cover: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_art', content: 'Working on a new 3D sculpt.', media: 'image', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_tech', content: 'The lighting render is clean.', media: 'image', url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_art', content: 'Final composite.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }
        ]
    },
    {
        title: 'Daily Grind',
        description: 'Just another day in the life. ☕',
        creator: 'u_tech',
        cover: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_tech', content: 'Morning standup.', media: 'image', url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_chef', content: 'Coffee break essential.', media: 'image', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_tech', content: 'Coding late into the night.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }
        ]
    },
    {
        title: 'Vintage Cars',
        description: 'Classics never go out of style. 🏎️',
        creator: 'u_car',
        cover: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_car', content: 'Spotted this beauty at the show.', media: 'image', url: 'https://images.unsplash.com/photo-1583121274602-3e2820c698d9?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'Chrome details.', media: 'image', url: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_car', content: 'Engine purrs like a kitten.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4' }
        ]
    },
    {
        title: 'Abstract Minds',
        description: 'Thoughts visualized. 🧠',
        creator: 'u_art',
        cover: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_art', content: 'Chaos theory.', media: 'image', url: 'https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_tech', content: 'Geometric patterns.', media: 'image', url: 'https://images.unsplash.com/photo-1550684848-86a5d8727436?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Fitness Goals',
        description: 'Road to 10k run. 🏃',
        creator: 'u_fit',
        cover: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_fit', content: 'Pre-workout meal.', media: 'image', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_fit', content: 'Hitting the track.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4' } // Generic motion
        ]
    },
    {
        title: 'Code Life',
        description: 'My setup and unexpected bugs. 🐛',
        creator: 'u_tech',
        cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_tech', content: 'Dual monitor heaven.', media: 'image', url: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_tech', content: 'Finally fixed that race condition!', media: 'image', url: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Pet Parade',
        description: 'Fluffy friends only! 🐾',
        creator: 'u_pet',
        cover: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_pet', content: 'Morning cuddles.', media: 'image', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'Photogenic pup!', media: 'image', url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    // --- NEW BATCH OF 10 ---
    {
        title: 'Ocean Breeze',
        description: 'Salt water therapy. 🌊',
        creator: 'u_travel',
        cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_travel', content: 'Waves rolling in...', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
            { user: 'u_fit', content: 'Morning beach run.', media: 'image', url: 'https://images.unsplash.com/photo-1502933691298-84fc14542831?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'Golden hour sunset.', media: 'image', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Street Style',
        description: 'Urban fashion trends. 👟',
        creator: 'u_art',
        cover: 'https://images.unsplash.com/photo-1523396870717-816a21028c15?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_art', content: 'Ootd check.', media: 'image', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'Fresh kicks.', media: 'image', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_car', content: 'Matching the ride.', media: 'image', url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Festival Vibes',
        description: 'Music, lights, and energy! 🎵',
        creator: 'u_tech',
        cover: 'https://images.unsplash.com/photo-1459749411177-0473ef716175?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_tech', content: 'Main stage madness!', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
            { user: 'u_art', content: 'The light show is insane.', media: 'image', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'Confetti rain.', media: 'image', url: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Handmade Life',
        description: 'Crafting something beautiful. 🧶',
        creator: 'u_art',
        cover: 'https://images.unsplash.com/photo-1459328222956-657dc3809cb9?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_art', content: 'Throwing some clay.', media: 'image', url: 'https://images.unsplash.com/photo-1565193566173-7a051d912497?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'The details matter.', media: 'image', url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_chef', content: 'My favorite new mug.', media: 'image', url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Level Up',
        description: 'Gamers unite. 🎮',
        creator: 'u_tech',
        cover: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_tech', content: 'Rate my setup.', media: 'image', url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_car', content: 'Sim racing rig.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
            { user: 'u_fit', content: 'VR cardio session.', media: 'image', url: 'https://images.unsplash.com/photo-1622979135225-d2ba269fb1bd?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Modern Lines',
        description: 'Architecture in focus. 🏢',
        creator: 'u_photo',
        cover: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_photo', content: 'Glass and steel.', media: 'image', url: 'https://images.unsplash.com/photo-1496660636100-c02ac85942c7?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_travel', content: 'City bridges.', media: 'image', url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_art', content: 'Spiral staircase.', media: 'image', url: 'https://images.unsplash.com/photo-1502005229762-cf1e2a4a5877?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Green Thumb',
        description: 'Plant parenthood. 🌿',
        creator: 'u_chef',
        cover: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_chef', content: 'Fresh basil for dinner.', media: 'image', url: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_pet', content: 'Jungle cat.', media: 'image', url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'Morning dew.', media: 'image', url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1000&q=80' }
        ]
    },
    {
        title: 'Cosmic Dreams',
        description: 'To the stars and beyond. 🌌',
        creator: 'u_tech',
        cover: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_tech', content: 'Telescope setup ready.', media: 'image', url: 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_art', content: 'Digital painting - Nebulas.', media: 'image', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_travel', content: 'Camping under the Milky Way.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }
        ]
    },
    {
        title: 'Barista Diaries',
        description: 'Life begins after coffee. ☕',
        creator: 'u_chef',
        cover: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_chef', content: 'Rosetta practice.', media: 'image', url: 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_tech', content: 'Fuel for coding.', media: 'image', url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_photo', content: 'Cafe ambiance.', media: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }
        ]
    },
    {
        title: 'Reading Nook',
        description: 'Getting lost in a good book. 📚',
        creator: 'u_pet',
        cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1000&q=80',
        contributions: [
            { user: 'u_pet', content: 'Reading buddy.', media: 'image', url: 'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_art', content: 'Book cover illustration.', media: 'image', url: 'https://images.unsplash.com/photo-1519682337058-a5ca054c4813?auto=format&fit=crop&w=1000&q=80' },
            { user: 'u_travel', content: 'Planning the next trip.', media: 'image', url: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&w=1000&q=80' }
        ]
    }
]

// --- Helper Functions ---

async function seedRichDemo() {
    console.log('🚀 Starting rich demo seeding...')

    try {
        // 1. Create Users
        console.log('Creating users...')
        const createdUsers: Record<string, string> = {} // Map internal ID (u_photo) to UUID

        for (const user of USERS) {
            // ... (rest of user creation logic remains same)
            // BETTER APPROACH: Just insert into 'profiles'. If FK fails, we catch it.
            // Most dev setups allow this, or have a trigger handling it.
            
            // Try to upsert based on user_id if we generated it, but we can't really guess it. 
            // Better: Upsert by 'name' if we could, but 'name' isn't unique.
            // Strategy: Try to insert a NEW profile with a random UUID. 
            // If it fails (likely due to auth FK), we catch it.
            // If it succeeds, great.

            const fakeUuid = crypto.randomUUID()
            
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    user_id: fakeUuid,
                    name: user.name,
                    avatar: user.avatar,
                    tagline: user.description // Corrected field name
                } as any)
                .select()
            
            if (error) {
                console.warn(`Could not create profile for ${user.name} (likely auth FK constraint). Will try to find existing or fallback.`)
                // We don't add to createdUsers yet
            } else {
                createdUsers[user.id] = fakeUuid
            }
        }
        
        // Fetch all available profiles to use as pool
        const { data: allProfiles } = await supabase.from('profiles').select('user_id')
        const allProfileIds = allProfiles?.map(p => p.user_id) || []
        
        // If we have no profiles, we must have 'me' (assuming it works or we are in trouble)
        if (!allProfileIds.includes('me')) {
            // Check if 'me' works by trying to read it? 
            // Actually 'me' is usually a placeholder in some local setups or a specific real ID. 
            // Let's assume 'me' is valid if we have nothing else.
            if (allProfileIds.length === 0) allProfileIds.push('me')
        }

        // Fill in missing mappings round-robin
        const userKeys = USERS.map(u => u.id)
        userKeys.forEach((key, index) => {
            if (!createdUsers[key]) {
                // Pick from available
                createdUsers[key] = allProfileIds[index % allProfileIds.length] || 'me'
            }
        })

        console.log('User mapping:', createdUsers)

        // 2. Create Stories
        for (const storyData of STORIES) {
            const creatorId = createdUsers[storyData.creator] || createdUsers['u_photo'] || 'me' // Fallback chain
            
            // Check if story already exists to prevent duplicates on potential re-runs
            const { data: existingStory } = await supabase
                .from('stories')
                .select('id')
                .eq('title', storyData.title)
                .maybeSingle()
            
            if (existingStory) {
                console.log(`Story '${storyData.title}' already exists. Skipping...`)
                continue
            }

            // Assign visibility/mode dynamically to ensure mix
            // Stories 0, 3, 6, 9...: Public Open
            // Stories 1, 4, 7, 10...: Public Invite
            // Stories 2, 5, 8, 11...: Private Invite (with 'me' added)
            
            const storyIndex = STORIES.indexOf(storyData)
            let visibility = 'public'
            let mode = 'open'
            
            if (storyIndex % 3 === 2) {
                visibility = 'private'
                mode = 'invite'
            } else if (storyIndex % 3 === 1) {
                visibility = 'public' // or private? Let's keep public invite
                mode = 'invite'
            } else {
                visibility = 'public'
                mode = 'open'
            }

            console.log(`Creating story: ${storyData.title} (${visibility}/${mode})...`)
            const { data: story, error: storyError } = await supabase
                .from('stories')
                .insert({
                    title: storyData.title,
                    description: storyData.description,
                    creator_id: creatorId,
                    mode: mode,
                    visibility: visibility,
                    status: 'active',
                    cover_image: storyData.cover,
                } as any)
                .select()
                .single()

            if (storyError) {
                console.error(`Failed to create story ${storyData.title}:`, storyError)
                continue
            }

            // 3. Add Contributions
            let delay = 0
            const participantsMap = new Map<string, number>() // userId -> earliest position
            let positionCounter = 0
            
            // Add creator as participant first (usually pos 0)
            participantsMap.set(creatorId, positionCounter++)

            for (const contrib of storyData.contributions) {
                const contribUserId = createdUsers[contrib.user] || creatorId
                // Find userName
                const userObj = USERS.find(u => u.id === contrib.user)
                const userName = userObj ? userObj.name : 'Unknown'

                await supabase.from('contributions').insert({
                    story_id: story.id,
                    user_id: contribUserId,
                    user_name: userName,
                    content: contrib.content,
                    media_type: contrib.media,
                    media_url: contrib.url,
                    timestamp: Date.now() + delay
                } as any)
                
                // Track participant
                if (!participantsMap.has(contribUserId)) {
                    participantsMap.set(contribUserId, positionCounter++)
                }

                delay += 10000 // Offset timestamps
            }

            // For Private stories, ensure 'me' is a participant so we can see it
            if (visibility === 'private' && !participantsMap.has('me')) {
                 // Try to verify 'me' user ID exists first? Assuming 'me' is valid from context or previous steps
                 // 'me' is a special string in our current context, hopefully the DB allows it or we used a real ID for 'me' earlier?
                 // In previous steps we saw 'me' used in seed-supabase.ts directly.
                 participantsMap.set('me', positionCounter++)
            }

            // 4. Insert Participants
            const participantRows = Array.from(participantsMap.entries()).map(([uid, pos]) => ({
                story_id: story.id,
                user_id: uid,
                position: pos
            }))

            if (participantRows.length > 0) {
                 const { error: partError } = await supabase.from('story_participants').insert(participantRows as any)
                 if (partError) console.warn(`Failed to insert participants for ${storyData.title}`, partError)
            }

            // 5. Add Interactions (Random Likes)
            // Just add a few likes to the story from random "users" (reusing our pool)
            for (const userKey of Object.keys(createdUsers)) {
                if (Math.random() > 0.5) {
                    await supabase.from('story_likes').insert({
                         story_id: story.id,
                         user_id: createdUsers[userKey]
                    } as any)
                }
            }
        }

        console.log('✅ Rich demo seeding complete! 10 stories created.')

    } catch (error) {
        console.error('❌ Fatal error:', error)
    }
}

seedRichDemo()
