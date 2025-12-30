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
                    try {
                        console.log('[Supabase] GetItem:', key);
                        const { value } = await Preferences.get({ key });
                        console.log('[Supabase] GetItem result:', key, !!value);
                        return value;
                    } catch (error) {
                        console.error('[Supabase] GetItem error:', error);
                        return null;
                    }
                },
                setItem: async (key: string, value: string) => {
                    try {
                        console.log('[Supabase] SetItem:', key);
                        await Preferences.set({ key, value });
                    } catch (error) {
                        console.error('[Supabase] SetItem error:', error);
                    }
                },
                removeItem: async (key: string) => {
                    try {
                        console.log('[Supabase] RemoveItem:', key);
                        await Preferences.remove({ key });
                    } catch (error) {
                        console.error('[Supabase] RemoveItem error:', error);
                    }
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
