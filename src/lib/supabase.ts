import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_ANON_KEY = supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your env.local file.')
}

// Some test environments (Happy DOM / Vitest) provide a `Headers` global
// that is not constructible in the same way the browser's native Headers is.
// This can cause `createClient` to throw during module initialization. To
// make client creation resilient, attempt to construct a Headers instance and
// if it fails, replace it with a minimal, compatible polyfill.
function ensureHeadersConstructible() {
    try {
        // Some environments may have no Headers at all
        if (typeof (globalThis as any).Headers === 'undefined') return;
        // Try constructing it — if it throws, we'll replace it
        // eslint-disable-next-line no-new
        new (globalThis as any).Headers();
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[supabase] Replacing non-constructible Headers with polyfill:', (err as any)?.message || err);
        // Minimal polyfill to satisfy Supabase client's internal usage
        (globalThis as any).Headers = class Headers {
            private map: Map<string, string> = new Map();
            constructor(init?: Record<string, string>) {
                if (init) {
                    for (const [k, v] of Object.entries(init)) {
                        this.map.set(k.toLowerCase(), String(v));
                    }
                }
            }
            append(key: string, value: string) { this.map.set(key.toLowerCase(), (this.map.get(key.toLowerCase()) || '') + value); }
            set(key: string, value: string) { this.map.set(key.toLowerCase(), value); }
            get(key: string) { return this.map.get(key.toLowerCase()) ?? null; }
            has(key: string) { return this.map.has(key.toLowerCase()); }
            forEach(cb: (value: string, key: string) => void) { this.map.forEach((v, k) => cb(v, k)); }
        } as any;
    }
}

ensureHeadersConstructible();

let _supabase: any;

try {
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: !Capacitor.isNativePlatform(),
            storage: {
                getItem: async (key: string) => {
                    // Try localStorage first (more reliable on iOS WebView)
                    if (typeof window !== 'undefined' && window.localStorage) {
                        try {
                            const lsValue = window.localStorage.getItem(key);
                            if (lsValue) return lsValue;
                        } catch (e) { /* ignore */ }
                    }
                    
                    // Fallback to Capacitor Preferences
                    try {
                        const { value } = await Preferences.get({ key });
                        // If found in Preferences but not localStorage, sync it
                        if (value && typeof window !== 'undefined' && window.localStorage) {
                            try {
                                window.localStorage.setItem(key, value);
                            } catch (e) { /* ignore */ }
                        }
                        return value;
                    } catch (error) {
                        return null;
                    }
                },
                setItem: async (key: string, value: string) => {
                    // Always save to localStorage first (synchronous, reliable)
                    if (typeof window !== 'undefined' && window.localStorage) {
                        try {
                            window.localStorage.setItem(key, value);
                        } catch (e) { /* ignore */ }
                    }
                    
                    // Also save to Capacitor Preferences (async backup)
                    try {
                        await Preferences.set({ key, value });
                    } catch (error) { /* ignore */ }
                },
                removeItem: async (key: string) => {
                    // Remove from localStorage
                    if (typeof window !== 'undefined' && window.localStorage) {
                        try {
                            window.localStorage.removeItem(key);
                        } catch (e) { /* ignore */ }
                    }
                    
                    // Remove from Capacitor Preferences
                    try {
                        await Preferences.remove({ key });
                    } catch (error) { /* ignore */ }
                },
            },
        },
    });
} catch (err) {
    // In some test environments the Supabase client creation can still fail.
    // Fall back to a minimal mock so tests can spy on the specific methods
    // they need without crashing the test runner.
    // eslint-disable-next-line no-console
    console.warn('[supabase] createClient failed, using test mock:', (err as any)?.message || err);

    _supabase = {
        auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            onAuthStateChange: () => ({ data: null, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            refreshSession: async () => ({ data: { session: null }, error: null }),
        },
        from: () => ({ select: async () => ({ data: null, error: null }) }),
        storage: { from: () => ({ getPublicUrl: () => ({ publicURL: '' }) }) },
        // Allow tests to spyOn arbitrary methods without throwing
        rpc: async () => ({ data: null, error: null }),
        // Basic insert/update/delete helpers
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
    } as any;
}

export const supabase = _supabase;

/**
 * Session sync helper for iOS - ensures Preferences are fully loaded before session check.
 * On iOS with Capacitor, the Preferences storage is asynchronous and may not be
 * immediately available after app launch or OAuth return.
 * 
 * @returns Promise<boolean> - true if session is valid, false otherwise
 */
export async function ensureSessionSync(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        // On web, session is stored in localStorage which is synchronous
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    }
    
    try {
        // Give Preferences time to fully initialize on app launch
        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) return true;
            
            // Try refresh on subsequent attempts
            if (attempt > 0) {
                try {
                    const { data: refreshData } = await supabase.auth.refreshSession();
                    if (refreshData?.session) return true;
                } catch (refreshErr) {
                    console.warn('[Supabase] Session refresh attempt failed:', refreshErr);
                }
            }
            
            // Wait before retry
            if (attempt < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        return false;
    } catch (e) {
        console.warn('[Supabase] Session sync check failed:', e);
        return false;
    }
}
