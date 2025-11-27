// TypeScript types for Supabase database
// Auto-generated types can be created via: npx supabase gen types typescript --project-id <project-id>

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    avatar: string | null
                    tagline: string | null
                    tokens: number
                    is_private: boolean
                    is_influencer: boolean
                    interaction_cost: number | null
                    invite_code: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    avatar?: string | null
                    tagline?: string | null
                    tokens?: number
                    is_private?: boolean
                    is_influencer?: boolean
                    interaction_cost?: number | null
                    invite_code?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    avatar?: string | null
                    tagline?: string | null
                    tokens?: number
                    is_private?: boolean
                    is_influencer?: boolean
                    interaction_cost?: number | null
                    invite_code?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            stories: {
                Row: {
                    id: string
                    title: string
                    description: string
                    creator_id: string
                    mode: 'invite' | 'open'
                    visibility: 'public' | 'private'
                    status: 'active' | 'completed'
                    current_turn_user_id: string | null
                    max_weeves: number | null
                    cover_image: string | null
                    theme: string | null
                    group_id: string | null
                    hashtags: string[] | null
                    turn_timer_hours: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    description: string
                    creator_id: string
                    mode: 'invite' | 'open'
                    visibility?: 'public' | 'private'
                    status?: 'active' | 'completed'
                    current_turn_user_id?: string | null
                    max_weeves?: number | null
                    cover_image?: string | null
                    theme?: string | null
                    group_id?: string | null
                    turn_timer_hours?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string
                    creator_id?: string
                    mode?: 'invite' | 'open'
                    visibility?: 'public' | 'private'
                    status?: 'active' | 'completed'
                    current_turn_user_id?: string | null
                    max_weeves?: number | null
                    cover_image?: string | null
                    theme?: string | null
                    group_id?: string | null
                    turn_timer_hours?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "stories_creator_id_fkey"
                        columns: ["creator_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            contributions: {
                Row: {
                    id: string
                    story_id: string
                    user_id: string
                    user_name: string
                    content: string
                    media_type: 'video' | 'image' | 'text'
                    media_url: string | null
                    timestamp: number
                    text_style: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    story_id: string
                    user_id: string
                    user_name: string
                    content: string
                    media_type: 'video' | 'image' | 'text'
                    media_url?: string | null
                    timestamp: number
                    text_style?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    story_id?: string
                    user_id?: string
                    user_name?: string
                    content?: string
                    media_type?: 'video' | 'image' | 'text'
                    media_url?: string | null
                    timestamp?: number
                    text_style?: Json | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "contributions_story_id_fkey"
                        columns: ["story_id"]
                        referencedRelation: "stories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "contributions_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            story_likes: {
                Row: {
                    id: string
                    story_id: string
                    user_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    story_id: string
                    user_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    story_id?: string
                    user_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "story_likes_story_id_fkey"
                        columns: ["story_id"]
                        referencedRelation: "stories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "story_likes_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            story_comments: {
                Row: {
                    id: string
                    story_id: string
                    user_id: string
                    user_name: string
                    content: string
                    timestamp: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    story_id: string
                    user_id: string
                    user_name: string
                    content: string
                    timestamp?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    story_id?: string
                    user_id?: string
                    user_name?: string
                    content?: string
                    timestamp?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "story_comments_story_id_fkey"
                        columns: ["story_id"]
                        referencedRelation: "stories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "story_comments_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            story_participants: {
                Row: {
                    id: string
                    story_id: string
                    user_id: string
                    position: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    story_id: string
                    user_id: string
                    position?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    story_id?: string
                    user_id?: string
                    position?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "story_participants_story_id_fkey"
                        columns: ["story_id"]
                        referencedRelation: "stories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "story_participants_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            groups: {
                Row: {
                    id: string
                    name: string
                    description: string
                    avatar: string
                    member_count: number
                    is_private: boolean
                    owner_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description: string
                    avatar: string
                    member_count?: number
                    is_private?: boolean
                    owner_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string
                    avatar?: string
                    member_count?: number
                    is_private?: boolean
                    owner_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "groups_owner_id_fkey"
                        columns: ["owner_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            group_members: {
                Row: {
                    id: string
                    group_id: string
                    user_id: string
                    role: 'admin' | 'member'
                    joined_at: string
                }
                Insert: {
                    id?: string
                    group_id: string
                    user_id: string
                    role?: 'admin' | 'member'
                    joined_at?: string
                }
                Update: {
                    id?: string
                    group_id?: string
                    user_id?: string
                    role?: 'admin' | 'member'
                    joined_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "group_members_group_id_fkey"
                        columns: ["group_id"]
                        referencedRelation: "groups"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "group_members_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            friendships: {
                Row: {
                    id: string
                    user_id: string
                    friend_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    friend_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    friend_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "friendships_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    },
                    {
                        foreignKeyName: "friendships_friend_id_fkey"
                        columns: ["friend_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            friend_requests: {
                Row: {
                    id: string
                    sender_id: string
                    receiver_id: string
                    status: 'pending' | 'accepted' | 'declined'
                    created_at: string
                }
                Insert: {
                    id?: string
                    sender_id: string
                    receiver_id: string
                    status?: 'pending' | 'accepted' | 'declined'
                    created_at?: string
                }
                Update: {
                    id?: string
                    sender_id?: string
                    receiver_id?: string
                    status?: 'pending' | 'accepted' | 'declined'
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "friend_requests_sender_id_fkey"
                        columns: ["sender_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    },
                    {
                        foreignKeyName: "friend_requests_receiver_id_fkey"
                        columns: ["receiver_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    type: string
                    title: string
                    message: string
                    data: Json | null
                    action_url: string | null
                    read: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    type: string
                    title: string
                    message: string
                    data?: Json | null
                    action_url?: string | null
                    read?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    type?: string
                    title?: string
                    message?: string
                    data?: Json | null
                    action_url?: string | null
                    read?: boolean
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["user_id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
