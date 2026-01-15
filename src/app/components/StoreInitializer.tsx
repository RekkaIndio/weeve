'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { fetchGroups } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export default function StoreInitializer() {
    const { currentUser, setStories, setGroups, fetchStories } = useStore();
    const initializedRef = useRef(false);

    useEffect(() => {
        async function loadData() {
            if (!currentUser) return;

            // Prevent double fetching in strict mode or rapid re-renders if needed, 
            // though currentUser check usually suffices. 
            // We'll keep it simple for now but could add a ref if we see double fetches.

            try {
                console.log('Fetching stories via store action...');
                await fetchStories();

                console.log('Fetching groups...');
                const groups = await fetchGroups(currentUser.id);
                console.log('Fetched groups:', groups.length);
                setGroups(groups);
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        }

        loadData();
    }, [currentUser, setStories, setGroups, fetchStories]);

    // Set up realtime subscriptions for story updates
    useEffect(() => {
        if (!currentUser) return;

        console.log('Setting up realtime subscriptions for stories...');

        // Subscribe to stories table changes
        const storiesChannel = supabase
            .channel('stories-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stories' },
                (payload: RealtimePostgresChangesPayload<any>) => {
                    console.log('Stories table changed:', payload);
                    // fetchStories(); // Disabled to prevent state overwrites
                }
            )
            .subscribe();

        // Subscribe to contributions table changes
        const contributionsChannel = supabase
            .channel('contributions-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'contributions' },
                (payload: RealtimePostgresChangesPayload<any>) => {
                    console.log('Contributions table changed:', payload);
                    // fetchStories(); // Disabled to prevent state overwrites
                }
            )
            .subscribe();

        // Subscribe to story_participants table changes
        const participantsChannel = supabase
            .channel('participants-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'story_participants' },
                (payload: RealtimePostgresChangesPayload<any>) => {
                    console.log('Story participants table changed:', payload);
                    // fetchStories(); // Disabled to prevent state overwrites
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            console.log('Cleaning up realtime subscriptions...');
            supabase.removeChannel(storiesChannel);
            supabase.removeChannel(contributionsChannel);
            supabase.removeChannel(participantsChannel);
        };
    }, [currentUser, fetchStories]);

    return null;
}
