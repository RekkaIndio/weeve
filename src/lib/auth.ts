import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from "@capacitor/core";
import { addFriend } from "./friends";
import type { Database } from "./database.types";
import { buildPublicUrl } from "./url";

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const NATIVE_GOOGLE_REDIRECT_URI_ANDROID = 'com.weeve.app://auth/callback';
export const NATIVE_GOOGLE_REDIRECT_URI_IOS = 'com.weeve.app://auth/callback';
export function getNativeRedirectUri(platform?: string) {
    try {
        const p = platform ?? (typeof Capacitor !== 'undefined' ? Capacitor.getPlatform() : 'web');
        return p === 'ios' ? NATIVE_GOOGLE_REDIRECT_URI_IOS : NATIVE_GOOGLE_REDIRECT_URI_ANDROID;
    } catch (e) {
        return NATIVE_GOOGLE_REDIRECT_URI_ANDROID;
    }
}
export const NATIVE_GOOGLE_REDIRECT_URIS = [NATIVE_GOOGLE_REDIRECT_URI_ANDROID, NATIVE_GOOGLE_REDIRECT_URI_IOS];

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    avatar: string;
    tagline?: string;
    tokens: number;
    inviteCode?: string;
    isPrivate?: boolean;
    onboardingStep?: number | null;
    completedOnboarding?: boolean;
    lastNameChangeAt?: string;
    dateOfBirth?: string;
    isBrand?: boolean;
    brandWebsite?: string;
    brandSubscriptionStatus?: 'none' | 'active' | 'expired';
    isInfluencer?: boolean;
    interactionCost?: number | null;
    preferences?: {
        monetization_enabled?: boolean;
        [key: string]: any;
    };
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, name?: string, dateOfBirth?: string): Promise<{ user: User | null; error: Error | null }> {
    try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: name ? {
                data: {
                    name, // Store name in auth metadata if provided
                    date_of_birth: dateOfBirth,
                },
            } : undefined,
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
 * Initiate Google OAuth login
 */
/**
 * Initiate Google OAuth login
 */
export async function signInWithGoogle(redirectPath = '/auth/callback'): Promise<{ error: Error | null }> {
    try {
        // Robust platform check
        const isCapacitor = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform();



        // Determine redirect URL based on platform
        let redirectTo: string | undefined;

        if (isCapacitor) {

            redirectTo = getNativeRedirectUri(platform);
        } else {
            // Web Flow (including mobile browsers)
            const buildRedirect = () => {
                if (!redirectPath) return undefined;
                if (redirectPath.startsWith('http')) return redirectPath;
                return buildPublicUrl(redirectPath);
            };
            redirectTo = buildRedirect();

        }

        // ... inside function



        const options = isCapacitor ? { redirectTo, skipBrowserRedirect: true } : { redirectTo, skipBrowserRedirect: false };

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options,
        });

        if (error) throw error;

        // When skipBrowserRedirect is true, Supabase returns the OAuth URL but doesn't navigate to it.
        // We need to manually open it using Capacitor's Browser plugin for native platforms.
        if (isCapacitor && data?.url) {

            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: data.url });
        }

        return { error: null };
    } catch (error) {
        console.error('[Auth] Google signin error:', error);
        return { error: error as Error };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Aggressively clear any localStorage session data to prevent
        // corrupt sessions from causing hangs on next app launch
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                // Look for and remove any Supabase session keys
                const keysToRemove: string[] = [];
                for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    if (key && (key.includes('supabase') || key.includes('sb-'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => {
                    window.localStorage.removeItem(key);
                });
            } catch (e) {
                console.warn('[Auth] Failed to clear localStorage:', e);
            }
        }

        // Also clear Capacitor Preferences for native persistence
        const isCapacitor = Capacitor.isNativePlatform();
        if (isCapacitor) {
            try {
                const { keys } = await Preferences.keys();
                const keysToRemove = keys.filter((k: string) => k.includes('supabase') || k.includes('sb-'));
                for (const key of keysToRemove) {
                    await Preferences.remove({ key });
                }
            } catch (e) {
                console.warn('[Auth] Failed to clear Preferences:', e);
            }
        }

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
 * Optimized to select only needed columns for faster queries
 */
export async function getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('user_id, name, avatar, tagline, tokens, invite_code, is_private, onboarding_step, completed_onboarding, last_name_change_at, is_brand, brand_website, brand_subscription_status, is_influencer, interaction_cost, preferences')
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
            onboardingStep: data.onboarding_step ?? null,
            completedOnboarding: data.completed_onboarding ?? false,
            lastNameChangeAt: data.last_name_change_at || undefined,
            dateOfBirth: data.date_of_birth || undefined,
            isBrand: data.is_brand || false,
            brandWebsite: data.brand_website || undefined,
            brandSubscriptionStatus: data.brand_subscription_status || 'none',
            isInfluencer: data.is_influencer || false,
            interactionCost: data.interaction_cost || null,
            preferences: data.preferences as any || {},
        };
    } catch (error) {
        console.error('[Auth] Get profile error:', error);
        return null;
    }
}

/**
 * Attempt to fetch profile using REST endpoint with an access token.
 * This is a fast fallback to get profile data immediately after OAuth flows.
 */
export async function fetchProfileWithAccessToken(accessToken: string, userId: string, timeoutMs = 400): Promise<AuthUser | null> {
    try {
        if (!accessToken) return null;
        const restUrl = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
        restUrl.searchParams.set('user_id', `eq.${encodeURIComponent(userId)}`);
        restUrl.searchParams.set('select', 'user_id,name,avatar,tagline,tokens,invite_code,is_private,onboarding_step,completed_onboarding,last_name_change_at,is_brand,brand_website,brand_subscription_status,is_influencer,interaction_cost,preferences');


        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(restUrl.toString(), {
            method: 'GET',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            signal: controller.signal,
        });
        clearTimeout(id);

        if (!response.ok) {
            console.warn('[Auth] fetchProfileWithAccessToken: REST request returned', response.status);
            return null;
        }

        const payload = await response.json();
        const row = Array.isArray(payload) ? payload[0] : payload;
        if (!row) return null;

        return {
            id: row.user_id,
            email: '',
            name: row.name,
            avatar: row.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            tagline: row.tagline || undefined,
            tokens: row.tokens || 100,
            inviteCode: row.invite_code ?? undefined,
            isPrivate: row.is_private || false,
            onboardingStep: row.onboarding_step ?? null,
            completedOnboarding: row.completed_onboarding ?? false,
            lastNameChangeAt: row.last_name_change_at || undefined,
            dateOfBirth: row.date_of_birth || undefined,
            isBrand: row.is_brand || false,
            brandWebsite: row.brand_website || undefined,
            brandSubscriptionStatus: row.brand_subscription_status || 'none',
            isInfluencer: row.is_influencer || false,
            interactionCost: row.interaction_cost || null,
            preferences: row.preferences || {},
        };
    } catch (err) {
        console.warn('[Auth] fetchProfileWithAccessToken error:', err);
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
    referrerCode?: string,
    dateOfBirth?: string
): Promise<{ data: ProfileRow | null; error: Error | null }> {
    const attemptCreate = async (candidateName: string, isRetry = false): Promise<{ data: ProfileRow | null; error: any }> => {
        try {
            const profileData: ProfileInsert = {
                user_id: userId,
                name: candidateName,
                avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
                tokens: 100,
                // Regenerate invite code if name changed or if it's a retry, to ensure uniqueness there too
                invite_code: inviteCode && !isRetry ? inviteCode : `${candidateName.toUpperCase().slice(0, 3).replace(/[^A-Z]/g, 'U')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                onboarding_step: 0, // Start at 0 to send user to /setup for username/avatar
                completed_onboarding: false,
                date_of_birth: dateOfBirth,
                // Set to null so the 14-day restriction doesn't apply to the first name set on /setup
                last_name_change_at: null,
            };

            // Split upsert and select to debug 406 error
            // We use upsert, but if the conflict is on 'user_id', it updates. 
            // If the conflict is on 'name' (unique_display_name), it throws 23505.
            const { error: insertError } = await supabase
                .from('profiles')
                .upsert(profileData, { onConflict: 'user_id' });

            if (insertError) throw insertError;

            return { data: null, error: null }; // Success (data fetched separately)
        } catch (err) {
            return { data: null, error: err };
        }
    };

    try {
        // Retry loop for unique name constraint
        let currentName = name;
        let success = false;
        let lastError = null;

        for (let i = 0; i < 3; i++) {
            const result = await attemptCreate(currentName, i > 0);
            if (!result.error) {
                success = true;
                break;
            }

            // Check if it's a unique constraint violation on the name
            // Postgres error code 23505 = unique_violation
            if (result.error?.code === '23505' && (result.error?.message?.includes('unique_display_name') || result.error?.message?.includes('name'))) {
                // Append random 4 characters
                currentName = `${name.slice(0, 20)}_${Math.random().toString(36).substr(2, 4)}`;
                lastError = result.error;
            } else {
                // Some other error, rethrow immediately
                console.error('[Auth] Create profile INSERT error:', JSON.stringify(result.error, null, 2));
                throw result.error;
            }
        }

        if (!success) {
            console.error('[Auth] Failed to generate unique name after retries.');
            throw lastError || new Error('Failed to generate unique name');
        }

        // Fetch the profile we just created/updated
         const { data: insertedProfile, error: selectError } = await supabase
            .from('profiles')
            .select()
            .eq('user_id', userId)
            .maybeSingle();

        if (selectError) {
             console.error('[Auth] Create profile SELECT error:', JSON.stringify(selectError, null, 2));
             throw selectError;
        }

        // Handle referrer
        if (referrerCode) {
            const { data: referrer } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('invite_code', referrerCode)
                .single();

            if (referrer) {
                await addFriend(userId, referrer.user_id);
            }
        }

        return { data: insertedProfile ?? null, error: null };
    } catch (error) {
        console.error('[Auth] Create profile error (full):', JSON.stringify(error, null, 2));
        return { data: null, error: error as Error };
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
 * Check if a display name is available (not already taken)
 */
export async function checkDisplayNameAvailability(name: string, excludeUserId?: string): Promise<{ available: boolean; error: Error | null }> {
    try {
        if (!name.trim()) {
            return { available: false, error: null };
        }

        let query = supabase
            .from('profiles')
            .select('user_id')
            .eq('name', name.trim());

        // If we're checking for a specific user (e.g., when editing their own profile),
        // exclude their current name from the check
        if (excludeUserId) {
            query = query.neq('user_id', excludeUserId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        return { available: !data, error: null };
    } catch (error) {
        console.error('[Auth] Check display name availability error:', error);
        return { available: false, error: error as Error };
    }
}

/**
 * Check if a brand website is available (not already registered)
 */
export async function checkBrandWebsiteAvailability(websiteUrl: string, excludeUserId?: string): Promise<{ available: boolean; error: Error | null }> {
    try {
        if (!websiteUrl.trim()) {
            return { available: false, error: null };
        }

        // Normalize URL for consistent checking (remove protocol, www, trailing slash)
        // This should match the normalization used during signup
        let normalized = websiteUrl.trim();
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = 'https://' + normalized;
        }

        let query = supabase
            .from('profiles')
            .select('user_id')
            .eq('brand_website', normalized)
            .eq('is_brand', true);

        if (excludeUserId) {
            query = query.neq('user_id', excludeUserId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        return { available: !data, error: null };
    } catch (error) {
        console.error('[Auth] Check brand website availability error:', error);
        return { available: false, error: error as Error };
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userId: string,
    updates: Partial<{ name: string; avatar: string | null; tagline: string | null; tokens: number; isPrivate: boolean; isInfluencer: boolean; interactionCost: number | null; preferences: Record<string, any> }>
): Promise<{ data: ProfileRow | null; error: Error | null }> {
    try {
        // Convert camelCase to snake_case for database
        const dbUpdates: ProfileUpdate = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar ?? null;
        if (updates.tagline !== undefined) dbUpdates.tagline = updates.tagline ?? null;
        if (updates.tokens !== undefined) dbUpdates.tokens = updates.tokens;
        if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate;
        if (updates.isInfluencer !== undefined) dbUpdates.is_influencer = updates.isInfluencer;
        if (updates.interactionCost !== undefined) dbUpdates.interaction_cost = updates.interactionCost;
        if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;

        if (Object.keys(dbUpdates).length === 0) {
            return { data: null, error: null };
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('user_id', userId);

        if (updateError) {
            console.error('[Auth] Update error details:', updateError);
            throw updateError;
        }

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

/**
 * Delete user account permanently
 * This calls the server-side API which uses the service role key to delete the user
 */
export async function deleteUserAccount(reason: string, feedback?: string): Promise<{ success: boolean; error: Error | null }> {
    try {
        // Get the current session to get the access token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/delete-account', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason, feedback }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete account');
        }

        // Sign out locally after successful deletion
        await supabase.auth.signOut();

        return { success: true, error: null };
    } catch (error) {
        console.error('[Auth] Delete account error:', error);
        return { success: false, error: error as Error };
    }
}
