'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function InviteHandler() {
    const searchParams = useSearchParams();
    const ref = searchParams?.get('ref');

    useEffect(() => {
        if (ref) {
            localStorage.setItem('weeve_invite_code', ref);
        }
    }, [ref]);

    return null;
}
