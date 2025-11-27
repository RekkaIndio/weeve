import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";
import { addFriend } from "./friends";
import type { Database } from "./database.types";

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    avatar: string;
    tagline?: string;
    tokens: number;
    inviteCode?: string;
    isPrivate?: boolean;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, name: string): Promise<{ user: User | null; error: Error | null }> {
    try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name, // Store name in auth metadata
                },
            },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No user returned from signup');

        return { user: authData.user, error: null };
    } catch (error) {
        console.error('[Auth] Signup error:', error);
        return { user: null, error: error as Error };
    }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('No user returned from signin');

        return { user: data.user, session: data.session, error: null };
    } catch (error) {
        console.error('[Auth] Signin error:', error);
        return { user: null, session: null, error: error as Error };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('[Auth] Signout error:', error);
        return { error: error as Error };
    }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('[Auth] Get user error:', error);
        return null;
    }
}

/**
 * Get user profile from profiles table
 */
export async function getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.user_id,
            email: '', // Email comes from auth, not profile
            name: data.name,
            avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            tagline: data.tagline || undefined,
            tokens: data.tokens || 100,
            inviteCode: data.invite_code ?? undefined,
            isPrivate: data.is_private || false,
        };
    } catch (error) {
        console.error('[Auth] Get profile error:', error);
        return null;
    }
}

/**
 * Create a user profile in the profiles table
 */
export async function createUserProfile(
    userId: string,
    name: string,
    avatar?: string,
    inviteCode?: string,
    referrerCode?: string
): Promise<{ error: Error | null }> {
    try {
        const profileData: ProfileInsert = {
            user_id: userId,
            name,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            tokens: 100,
            invite_code: inviteCode || `${name.toUpperCase().slice(0, 3)}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        };

        const { error } = await supabase.from('profiles').insert(profileData);

        if (error) throw error;

        // Handle referrer
        if (referrerCode) {
            const { data: referrer } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('invite_code', referrerCode)
                .single();

            if (referrer) {
                await addFriend(userId, referrer.user_id);
                console.log(`[Auth] Added friend connection with referrer ${referrer.user_id}`);
            }
        }

        return { error: null };
    } catch (error) {
        console.error('[Auth] Create profile error:', error);
        return { error: error as Error };
    }
}

/**
 * Check if a user profile exists
 */
export async function profileExists(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        return !!data;
    } catch (error) {
        console.error('[Auth] Profile exists check error:', error);
        return false;
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userId: string,
    updates: Partial<{ name: string; avatar: string | null; tagline: string | null; tokens: number; isPrivate: boolean }>
): Promise<{ data: ProfileRow | null; error: Error | null }> {
    try {
        // Convert camelCase to snake_case for database
        const dbUpdates: ProfileUpdate = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar ?? null;
        if (updates.tagline !== undefined) dbUpdates.tagline = updates.tagline ?? null;
        if (updates.tokens !== undefined) dbUpdates.tokens = updates.tokens;
        if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate;

        if (Object.keys(dbUpdates).length === 0) {
            return { data: null, error: null };
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('user_id', userId);

        if (updateError) throw updateError;

        const { data: refreshedProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!refreshedProfile) {
            return { data: null, error: new Error('Profile not found after update') };
        }

        return { data: refreshedProfile, error: null };
    } catch (error) {
        console.error('[Auth] Update profile error:', error);
        return { data: null, error: error as Error };
    }
}
