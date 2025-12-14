import { useEffect, useRef, useState, MutableRefObject } from 'react';

export default function useOnScreen<T extends Element>(options?: IntersectionObserverInit) {
    const ref = useRef<T | null>(null);
    const [isIntersecting, setIntersecting] = useState(false);
    const optsKey = JSON.stringify(options || {});

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver((entries) => {
            setIntersecting(entries[0]?.isIntersecting ?? false);
        }, options || { threshold: 0.25, rootMargin: '150px' });

        observer.observe(el);
        return () => {
            try { observer.disconnect(); } catch (e) {}
        };
        // Depend on optsKey so we will recreate observer when options change
    }, [optsKey]);

    return [ref as MutableRefObject<T | null>, isIntersecting] as const;
}
