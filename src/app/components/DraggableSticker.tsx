"use client";

import React, { useRef, useState, useEffect } from "react";

interface DraggableStickerProps {
    id: string;
    emoji: string;
    initialX: number; // percentage 0-100
    initialY: number; // percentage 0-100
    initialScale: number;
    onUpdate: (id: string, updates: { x: number; y: number; scale: number }) => void;
    onDelete: (id: string) => void;
    isDragging: boolean;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
}

const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

export const DraggableSticker = ({
    id,
    emoji,
    initialX,
    initialY,
    initialScale,
    onUpdate,
    onDelete,
    isDragging,
    onDragStart,
    onDragEnd,
}: DraggableStickerProps) => {
    const elementRef = useRef<HTMLDivElement>(null);

    // Local state for smooth interactions
    const [localX, setLocalX] = useState(initialX);
    const [localY, setLocalY] = useState(initialY);
    const [localScale, setLocalScale] = useState(initialScale);

    // Sync local state when props change externally (and not currently interacting)
    useEffect(() => {
        if (!isDragging) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (localX !== initialX) setLocalX(initialX);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (localY !== initialY) setLocalY(initialY);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (localScale !== initialScale) setLocalScale(initialScale);
        }
    }, [initialX, initialY, initialScale, isDragging, localX, localY, localScale]);

    // Gesture state
    const gestureRef = useRef<{
        startX: number;
        startY: number;
        startScale: number;
        startDist: number;
        initialElementX: number; // percentage
        initialElementY: number; // percentage
        pointerMap: Map<number, { x: number; y: number }>;
        hasMoved: boolean;
    }>({
        startX: 0,
        startY: 0,
        startScale: 1,
        startDist: 0,
        initialElementX: 0,
        initialElementY: 0,
        pointerMap: new Map(),
        hasMoved: false,
    });

    const lastTapRef = useRef<number>(0);

    // Global listener for secondary pointers (Pinch)
    useEffect(() => {
        const handleGlobalPtrDown = (e: PointerEvent) => {
            const map = gestureRef.current.pointerMap;
            // Only care if we already have 1 finger (the sticker)
            if (map.size === 1 && !map.has(e.pointerId)) {
                // Secondary finger touched somewhere else
                e.preventDefault();
                e.stopPropagation();

                // Capture this new pointer to the sticker element
                if (elementRef.current) {
                    elementRef.current.setPointerCapture(e.pointerId);

                    // Add to map immediately for pinch init
                    map.set(e.pointerId, { x: e.clientX, y: e.clientY });

                    // Init pinch
                    if ((map.size as number) === 2) {
                        const points = Array.from(map.values());
                        gestureRef.current.startDist = getDistance(points[0], points[1]);
                        gestureRef.current.startScale = localScale;
                    }
                }
            }
        };

        if (isDragging) {
            // Capture phase essential to catch touches on other elements before they react
            window.addEventListener('pointerdown', handleGlobalPtrDown, { capture: true });
        }

        return () => {
            window.removeEventListener('pointerdown', handleGlobalPtrDown, { capture: true });
        };
    }, [isDragging, localScale]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const map = gestureRef.current.pointerMap;
        map.set(e.pointerId, { x: e.clientX, y: e.clientY });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // If first pointer, start drag
        if (map.size === 1) {
            onDragStart(id);
            gestureRef.current.initialElementX = localX;
            gestureRef.current.initialElementY = localY;
            gestureRef.current.startX = e.clientX;
            gestureRef.current.startY = e.clientY;
            gestureRef.current.hasMoved = false;
        }
        // If second pointer, transition to pinch
        else if (map.size === 2) {
            const points = Array.from(map.values());
            gestureRef.current.startDist = getDistance(points[0], points[1]);
            gestureRef.current.startScale = localScale;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const map = gestureRef.current.pointerMap;
        if (!map.has(e.pointerId)) return;

        map.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const parent = elementRef.current?.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();

        if (map.size === 1) {
            // 1 Finger: Drag
            const dx = e.clientX - gestureRef.current.startX;
            const dy = e.clientY - gestureRef.current.startY;

            const dxPercent = (dx / rect.width) * 100;
            const dyPercent = (dy / rect.height) * 100;

            let newX = gestureRef.current.initialElementX + dxPercent;
            let newY = gestureRef.current.initialElementY + dyPercent;

            newX = Math.max(0, Math.min(100, newX));
            newY = Math.max(0, Math.min(100, newY));

            setLocalX(newX);
            setLocalY(newY);

            if (!gestureRef.current.hasMoved) {
                const dist = Math.hypot(e.clientX - gestureRef.current.startX, e.clientY - gestureRef.current.startY);
                if (dist > 5) {
                    gestureRef.current.hasMoved = true;
                }
            }
        }
        else if (map.size === 2) {
            // 2 Fingers: Pinch
            const points = Array.from(map.values());
            const currentDist = getDistance(points[0], points[1]);

            if (gestureRef.current.startDist > 0) {
                const scaleFactor = currentDist / gestureRef.current.startDist;
                const newScale = gestureRef.current.startScale * scaleFactor;

                const clampedScale = Math.max(0.2, Math.min(5, newScale));
                setLocalScale(clampedScale);
                gestureRef.current.hasMoved = true;
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const map = gestureRef.current.pointerMap;
        map.delete(e.pointerId);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        if (map.size === 0) {
            onDragEnd();

            onUpdate(id, {
                x: localX,
                y: localY,
                scale: localScale
            });

            if (!gestureRef.current.hasMoved) {
                const now = Date.now();
                if (now - lastTapRef.current < 300) {
                    onDelete(id);
                }
                lastTapRef.current = now;
            }

            map.clear();
        }
        else if (map.size === 1) {
            // Reset drag anchor to remaining finger to prevent jump
            const point = Array.from(map.values())[0];
            gestureRef.current.startX = point.x;
            gestureRef.current.startY = point.y;
            gestureRef.current.initialElementX = localX;
            gestureRef.current.initialElementY = localY;
        }
    };

    return (
        <div
            ref={elementRef}
            className={`absolute cursor-move select-none pointer-events-auto touch-none ${isDragging ? "z-[100]" : "z-10"}`}
            style={{
                left: `${localX}%`,
                top: `${localY}%`,
                transform: `translate(-50%, -50%) scale(${localScale})`,
                fontSize: "3rem",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {emoji}
        </div>
    );
};
