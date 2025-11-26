import type { Session } from '@supabase/supabase-js';

let latestSession: Session | null = null;

export function setLatestSession(session: Session | null) {
    latestSession = session;
}

export function getLatestSession(): Session | null {
    return latestSession;
}
