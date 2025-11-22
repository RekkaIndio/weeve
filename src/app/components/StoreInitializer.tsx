'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { fetchUserStories, fetchGroups } from '@/lib/data';

export default function StoreInitializer() {
    const { currentUser, setStories, setGroups } = useStore();
    const initializedRef = useRef(false);

    useEffect(() => {
        async function loadData() {
            if (!currentUser) return;

            // Prevent double fetching in strict mode or rapid re-renders if needed, 
            // though currentUser check usually suffices. 
            // We'll keep it simple for now but could add a ref if we see double fetches.

            try {
                console.log('Fetching stories for user:', currentUser.id);
                const stories = await fetchUserStories(currentUser.id);
                console.log('Fetched stories:', stories.length);
                setStories(stories);

                console.log('Fetching groups...');
                const groups = await fetchGroups();
                console.log('Fetched groups:', groups.length);
                setGroups(groups);
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        }

        loadData();
    }, [currentUser, setStories, setGroups]);

    return null;
}
