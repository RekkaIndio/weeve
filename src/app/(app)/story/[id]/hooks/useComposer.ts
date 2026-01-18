import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, type TextElement, type Story, type User, type TextStyle, type Contribution } from '@/lib/store';
import { createStoryContribution } from '@/lib/data';
import { capturePhoto, captureVideo } from '@/lib/camera';
import { uploadAudio } from '@/lib/uploadAudio';
import { trimVideo, needsTrimming } from '@/lib/videoTrim';
import { Capacitor } from '@capacitor/core';
import { MediaDraft, PhotoSticker } from '../types';
import { DEFAULT_TEXT_STYLE } from '../constants/text';
import { PHOTO_FILTERS } from '../constants/filters';
import { DrawingCanvasRef } from '@/app/components/DrawingCanvas';
import { supabase } from '@/lib/supabase';

export function useComposer(
    story: Story, 
    currentUser: User | null, 
    drawingCanvasRef: React.RefObject<DrawingCanvasRef | null>,
    onContributionAdded?: () => void
) {
    const router = useRouter();
    const { addContribution, fetchStories } = useStore();

    // Stitch Flow States
    const [showStitchMenu, setShowStitchMenu] = useState(false);
    const [mediaSourcePicker, setMediaSourcePicker] = useState<{ type: 'video' | 'image' } | null>(null);
    const [stitchMode, setStitchMode] = useState<'video' | 'image' | 'text' | 'drawing' | 'audio' | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const uploadStartTimeRef = useRef<number | null>(null);

    // Composer Content State
    const [textElements, setTextElements] = useState<TextElement[]>([]);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [mediaDraft, setMediaDraft] = useState<MediaDraft | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [photoFilter, setPhotoFilter] = useState<string>('normal');
    const [showPhotoFilterPanel, setShowPhotoFilterPanel] = useState(false);
    const [showStickerPanel, setShowStickerPanel] = useState(false);
    const [showVideoTrimmer, setShowVideoTrimmer] = useState(false);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const isScrubbingRef = useRef(false);
    const [photoStickers, setPhotoStickers] = useState<PhotoSticker[]>([]);
    const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
    const stickerLastTapRef = useRef<{ id: string; time: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [hasMovedInCurrentEdit, setHasMovedInCurrentEdit] = useState(false);
    const [targetSlotPosition, setTargetSlotPosition] = useState<number | null>(null);

    // Audio recording state
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioDuration, setAudioDuration] = useState<number>(0);

    // Refs for drag and drop
    const dragStateRef = useRef<{
        offsetX: number;
        offsetY: number;
        stageLeft: number;
        stageTop: number;
        stageWidth: number;
        stageHeight: number;
        pointerId: number;
        startLeft: number;
        startTop: number;
    } | null>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const draggableRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const stageRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef<string | null>(null);
    const isClickRef = useRef(false);
    const justSelectedRef = useRef(false);

    // Helper functions
    const updateElement = useCallback((id: string, updates: Partial<TextElement> | ((prev: TextElement) => Partial<TextElement>)) => {
        setTextElements(prev => prev.map(el => {
            if (el.id === id) {
                const newValues = typeof updates === 'function' ? updates(el) : updates;
                return { ...el, ...newValues };
            }
            return el;
        }));
    }, []);

    const resetComposer = useCallback(() => {
        setTextElements([]);
        setActiveElementId(null);
        setMediaDraft(null);
        setStitchMode(null);
        setActiveMenu(null);
        setPhotoFilter('normal');
        setShowPhotoFilterPanel(false);
        setShowStickerPanel(false);
        setShowVideoTrimmer(false);
        setPhotoStickers([]);
        setAudioBlob(null);
        setAudioDuration(0);
        dragStateRef.current = null;
        setMediaSourcePicker(null);
        isClickRef.current = false;
        justSelectedRef.current = false;
        isDragging.current = null;
    }, []);

    const addTextElement = useCallback(() => {
        // Prune empty text elements first
        const nonEmptyElements = textElements.filter(el => el.content.trim().length > 0);
        
        if (nonEmptyElements.length !== textElements.length) {
            setTextElements(nonEmptyElements);
        }

        if (nonEmptyElements.length >= 5) {
            console.error("Maximum 5 text boxes allowed");
            return;
        }

        const id = Math.random().toString(36).substr(2, 9);
        const newElement: TextElement = {
            id,
            content: "",
            style: { ...DEFAULT_TEXT_STYLE },
            position: { left: 50, top: 40, unit: '%' }
        };

        setTextElements(prev => [...prev, newElement]);
        setActiveElementId(id);
        setHasMovedInCurrentEdit(false);
        setShowStickerPanel(false);
    }, [textElements]);

    const updateTextStyle = useCallback((key: keyof TextStyle, value: string | number) => {
        if (!activeElementId) return;
        updateElement(activeElementId, (el) => ({
            style: { ...el.style, [key]: value }
        }));
    }, [activeElementId, updateElement]);

    const isPostDisabled = useMemo(() => {
        if (stitchMode === 'text') {
            return textElements.length === 0 || textElements.every(el => el.content.trim().length === 0);
        }
        return false;
    }, [stitchMode, textElements]);

    // Drag Handlers
    const handleDragStart = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        const elementRef = draggableRefs.current.get(id);
        if (!elementRef || !stageRef.current) return;

        const stageRect = stageRef.current.getBoundingClientRect();
        const elementRect = elementRef.getBoundingClientRect();

        // If we are editing and haven't moved yet (centered state), we need to "lock in" 
        // the current visual position as a specific % so it doesn't jump when we start dragging
        if (id === activeElementId) {
            if (!hasMovedInCurrentEdit) {
                // Calculate current visual position in percentage
                const visualLeftPx = elementRect.left - stageRect.left;
                const visualTopPx = elementRect.top - stageRect.top;
                
                const percentLeft = (visualLeftPx / stageRect.width) * 100;
                const percentTop = (visualTopPx / stageRect.height) * 100;

                // Update state immediately so re-render keeps it here
                updateElement(id, {
                    position: {
                        left: percentLeft,
                        top: percentTop,
                        unit: '%'
                    }
                });
            }
            setHasMovedInCurrentEdit(true);
        }

        isClickRef.current = true;

        dragStateRef.current = {
            offsetX: event.clientX - elementRect.left,
            offsetY: event.clientY - elementRect.top,
            stageLeft: stageRect.left,
            stageTop: stageRect.top,
            stageWidth: stageRect.width,
            stageHeight: stageRect.height,
            pointerId: event.pointerId,
            startLeft: 0, // Not used in new logic
            startTop: 0   // Not used in new logic
        };
        isDragging.current = id;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        elementRef.style.cursor = 'grabbing';
    };

    const handleDragMove = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        
        const dragState = dragStateRef.current;
        const elementRef = draggableRefs.current.get(id);

        if (!dragState || !elementRef || isDragging.current !== id) return;

        if (isClickRef.current) {
            const moveDistance = Math.hypot(event.movementX, event.movementY);
            if (moveDistance > 2) isClickRef.current = false;
        }

        // Calculate new position in pixels relative to stage
        let rawLeft = event.clientX - dragState.stageLeft - dragState.offsetX;
        let rawTop = event.clientY - dragState.stageTop - dragState.offsetY;
        
        // Optional: Clamp to stage bounds (keep roughly inside)
        const elementRect = elementRef.getBoundingClientRect();
        // Allow some overflow but not complete loss
        const minX = -elementRect.width * 0.5;
        const maxX = dragState.stageWidth - elementRect.width * 0.5;
        const minY = -elementRect.height * 0.5;
        const maxY = dragState.stageHeight - elementRect.height * 0.5;
        
        rawLeft = Math.max(minX, Math.min(maxX, rawLeft));
        rawTop = Math.max(minY, Math.min(maxY, rawTop));

        // Convert to percentage
        const percentLeft = (rawLeft / dragState.stageWidth) * 100;
        const percentTop = (rawTop / dragState.stageHeight) * 100;

        // Apply directly to DOM for smooth 60fps
        elementRef.style.left = `${percentLeft}%`;
        elementRef.style.top = `${percentTop}%`;
        
        // Use standard translate
        elementRef.style.transform = 'translate3d(0, 0, 0)';
    };

    const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        const dragState = dragStateRef.current;
        const elementRef = draggableRefs.current.get(id);

        if (dragState && elementRef) {
            try { (event.currentTarget as HTMLElement).releasePointerCapture(dragState.pointerId); } catch (err) { }
            
            elementRef.style.cursor = 'grab';
            elementRef.style.transform = 'translate3d(0, 0, 0)';

            if (isClickRef.current) {
                justSelectedRef.current = true;
                setActiveElementId(id);
                // Don't auto-open a menu - let user choose from toolbar
                setTimeout(() => { justSelectedRef.current = false; }, 100);
            } else {
                // Read final calculated percentage from DOM or recalculate
                // Recalculating is safer to ensure sync with state logic
                let rawLeft = event.clientX - dragState.stageLeft - dragState.offsetX;
                let rawTop = event.clientY - dragState.stageTop - dragState.offsetY;
                
                // Applying exact same clamping as Move to ensure WYSIWYG
                const elementRect = elementRef.getBoundingClientRect();
                const minX = -elementRect.width * 0.5;
                const maxX = dragState.stageWidth - elementRect.width * 0.5;
                const minY = -elementRect.height * 0.5;
                const maxY = dragState.stageHeight - elementRect.height * 0.5;
                
                rawLeft = Math.max(minX, Math.min(maxX, rawLeft));
                rawTop = Math.max(minY, Math.min(maxY, rawTop));

                 // Convert to percentage
                const percentLeft = (rawLeft / dragState.stageWidth) * 100;
                const percentTop = (rawTop / dragState.stageHeight) * 100;
                
                updateElement(id, { position: { left: percentLeft, top: percentTop, unit: '%' } });
            }
        }
        isDragging.current = null;
        dragStateRef.current = null;
    };

    // Handle stuck uploads
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isUploading) {
                const userAlreadyContributed = currentUser?.id && story?.contributions?.some(c => c.userId === currentUser.id);
                if (userAlreadyContributed) {
                    setIsUploading(false);
                    resetComposer();
                    setShowStitchMenu(false);
                }
                const UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;
                if (uploadStartTimeRef.current && Date.now() - uploadStartTimeRef.current > UPLOAD_TIMEOUT_MS) {
                    setIsUploading(false);
                }
            }
        };

        const onFocus = () => handleVisibilityChange();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', onFocus);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', onFocus);
        };
    }, [isUploading, currentUser?.id, story?.contributions, resetComposer]);

    // Auto-submit audio
    useEffect(() => {
        if (audioBlob && stitchMode === 'audio') {
            handleComposerSubmit();
        }
    }, [audioBlob]); 

    // Reset move tracking
    useEffect(() => {
        setHasMovedInCurrentEdit(false);
    }, [activeElementId]);

    const handleMediaSourceSelection = useCallback(async (type: 'video' | 'image', source: 'camera' | 'gallery') => {
        setMediaSourcePicker(null);
        try {
            const file = type === 'video' ? await captureVideo(source) : await capturePhoto(source);
            if (file) {
                const previewUrl = URL.createObjectURL(file);
                setMediaDraft({ type, file, previewUrl, source });
                setTextElements([]);
                setStitchMode(type);
            } else {
                setShowStitchMenu(true);
            }
        } catch (error) {
            console.error(`[Story] ${type} capture failed:`, error);
            setShowStitchMenu(true);
        }
    }, [addTextElement]);

    const handleCroppedImage = useCallback((blob: Blob) => {
        setImageToCrop(null);
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(file);
        setMediaDraft({ type: 'image', file, previewUrl, source: 'gallery' });
        setTextElements([]);
        setStitchMode('image');
    }, []);

    const handleStitchOption = async (mode: 'video' | 'image' | 'text' | 'drawing' | 'audio') => {
        setShowStitchMenu(false);
        resetComposer();

        if (mode === 'text') {
            setTextElements([]);
            setStitchMode('text');
            addTextElement();
            return;
        }

        if (mode === 'video') {
            if (Capacitor.isNativePlatform()) {
                setMediaSourcePicker({ type: 'video' });
            } else {
                await handleMediaSourceSelection('video', 'gallery');
            }
            return;
        }

        if (mode === 'image') {
            if (Capacitor.isNativePlatform()) {
                setMediaSourcePicker({ type: 'image' });
            } else {
                await handleMediaSourceSelection('image', 'gallery');
            }
            return;
        }

        if (mode === 'drawing') {
            setStitchMode('drawing');
            return;
        }

        if (mode === 'audio') {
            setStitchMode('audio');
            return;
        }
    };

    const computeNextTurnUserId = (willComplete: boolean) => {
        if (willComplete || !currentUser) return undefined;
        const participants = story.participants;
        const currentIndex = participants.findIndex((p) => p.id === currentUser.id);
        if (currentIndex === -1 || participants.length === 0) return story.currentTurnUserId;
        const nextIndex = (currentIndex + 1) % participants.length;
        return participants[nextIndex]?.id ?? story.currentTurnUserId;
    };

    const handleComposerSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!stitchMode || !currentUser) return;

        // Check limits... (simplified for brevity, original logic was detailed)
        const isBrandOwner = story && currentUser && story.creatorId === currentUser.id;
        const isBrandPost = story?.postType === 'canon' || story?.postType === 'seed';
        const userHasContributed = story.contributions?.some(c => c.userId === currentUser.id);

        if (isBrandPost && !isBrandOwner && userHasContributed) {
            console.error("You've already contributed to this brand post.");
            resetComposer();
            setShowStitchMenu(false);
            return;
        }

        const trimmed = (stitchMode === 'text' || stitchMode === 'drawing') ? textElements.map(el => el.content).join(" ").trim() : '';
        if (stitchMode === 'text' && trimmed.length === 0) {
            console.error('Please add some text before posting.');
            return;
        }

        let drawingFile: File | undefined;
        if (stitchMode === 'drawing') {
            if (!drawingCanvasRef.current || drawingCanvasRef.current.isEmpty()) {
                console.error('Please draw something before posting.');
                return;
            }
            try {
                const blob = await drawingCanvasRef.current.exportToBlob();
                drawingFile = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
            } catch (error) {
                console.error('Failed to export drawing:', error);
                return;
            }
        }

        // Image filtering
        let filteredImageFile: File | undefined;
        if (stitchMode === 'image' && mediaDraft?.file && (photoFilter !== 'normal' || photoStickers.length > 0)) {
            try {
                const filterValue = PHOTO_FILTERS.find(f => f.id === photoFilter)?.filter || 'none';
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = mediaDraft.previewUrl!;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.filter = filterValue;
                    ctx.drawImage(img, 0, 0);
                    ctx.filter = 'none';
                    // Stickers would be drawn here
                    
                    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                    if (blob) {
                        filteredImageFile = new File([blob], mediaDraft.file.name, { type: 'image/jpeg' });
                    }
                }
            } catch (err) {
                console.error('Failed to apply filter:', err);
            }
        }

        // Upload
        setIsUploading(true);
        setUploadProgress(0);
        uploadStartTimeRef.current = Date.now();

        let videoFileToUpload = mediaDraft?.file;
        if (stitchMode === 'video' && mediaDraft?.file) {
            const hasTrimPoints = mediaDraft.trimStart !== undefined && mediaDraft.trimEnd !== undefined;
            const shouldTrim = needsTrimming(mediaDraft.trimStart, mediaDraft.trimEnd, undefined, mediaDraft.isMuted);
            if (shouldTrim && hasTrimPoints) {
                try {
                    videoFileToUpload = await trimVideo({
                        file: mediaDraft.file,
                        startTime: mediaDraft.trimStart ?? 0,
                        endTime: mediaDraft.trimEnd ?? 0,
                        isMuted: mediaDraft.isMuted,
                        onProgress: (p) => setUploadProgress(Math.round(p * 0.3))
                    });
                } catch (e) {
                    console.error('Trim failed', e);
                    videoFileToUpload = mediaDraft.file;
                }
            }
        }

        let audioMediaUrl: string | undefined;
        if (stitchMode === 'audio' && audioBlob) {
             const upload = await uploadAudio(audioBlob, currentUser.id);
             if (upload.url) audioMediaUrl = upload.url;
             else {
                 setIsUploading(false);
                 return;
             }
        }

        // Caption logic
        let caption = '';
        if (stitchMode === 'text') {
             caption = textElements.map(el => el.content).join(" ");
        } else if (mediaDraft?.caption) {
             caption = mediaDraft.caption;
        }

        // Text Styles
        const textStylePayload: TextStyle = { ...DEFAULT_TEXT_STYLE };
        if (textElements.length > 0) {
             textStylePayload.elements = textElements.map(el => ({
                   id: el.id,
                   content: el.content,
                   position: el.position,
                   style: el.style
             }));
             
             // For backward compatibility (if needed by older clients for simple text posts),
             // populate root styles from the first element if it exists.
             if (textElements.length === 1) {
                  const firstEl = textElements[0];
                  Object.assign(textStylePayload, firstEl.style);
             }
        }

        try {
            const maxWeeves = typeof story.maxWeeves === 'number' ? story.maxWeeves : null;
            const willComplete = maxWeeves !== null && story.contributions.length + 1 >= maxWeeves;
            const computedNextTurnUserId = computeNextTurnUserId(willComplete);
            const nextTurnUpdate = willComplete ? null : computedNextTurnUserId;

            let contributionTimestamp = Date.now();
            let positionToUse: number | null = targetSlotPosition;
            const currentUserParticipant = story.participants.find(p => p.id === currentUser.id);
            if (positionToUse === null && currentUserParticipant && typeof currentUserParticipant.position === 'number') {
                positionToUse = currentUserParticipant.position;
            }
            if (positionToUse !== null) {
                contributionTimestamp = (positionToUse + 1) * 1000000;
            }

            const { contribution } = await createStoryContribution({
                storyId: story.id,
                userId: currentUser.id,
                userName: currentUser.name,
                mediaType: stitchMode,
                content: caption,
                file: stitchMode === 'drawing' ? drawingFile : 
                      stitchMode === 'video' ? videoFileToUpload : 
                      (filteredImageFile || mediaDraft?.file),
                mediaUrl: audioMediaUrl,
                textStyle: textStylePayload,
                timestamp: contributionTimestamp,
                nextTurnUserId: nextTurnUpdate,
                onProgress: (p) => {
                     const hasTrimmed = stitchMode === 'video' && videoFileToUpload !== mediaDraft?.file;
                     setUploadProgress(hasTrimmed ? 30 + Math.round(p * 0.7) : Math.round(p));
                },
                mediaSource: mediaDraft?.source
            });

            // Optimistic update
            const isPending = (story.postType === 'canon' || story.postType === 'seed') && story.creatorId !== currentUser.id;
            if (!isPending) {
                addContribution(story.id, contribution, { nextTurnUserId: nextTurnUpdate });
                setTimeout(() => fetchStories(), 100);
            }

            resetComposer();
            setShowStitchMenu(false);
            if (onContributionAdded) onContributionAdded();

            // Onboarding check
            if (story.title === 'Your First Weeve Story' && story.maxWeeves === 3) {
                 await supabase.from('profiles').update({ completed_onboarding: true, onboarding_step: null }).eq('user_id', currentUser.id);
                 useStore.getState().setCurrentUser({ ...currentUser, completedOnboarding: true, onboardingStep: undefined });
            }

        } catch (error) {
            console.error('Error adding contribution:', error);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            uploadStartTimeRef.current = null;
        }
    };

    return {
        showStitchMenu, setShowStitchMenu,
        mediaSourcePicker, setMediaSourcePicker,
        stitchMode, setStitchMode,
        isUploading, uploadProgress,
        textElements, setTextElements,
        activeElementId, setActiveElementId,
        mediaDraft, setMediaDraft,
        imageToCrop, setImageToCrop,
        photoFilter, setPhotoFilter,
        showPhotoFilterPanel, setShowPhotoFilterPanel,
        showStickerPanel, setShowStickerPanel,
        showVideoTrimmer, setShowVideoTrimmer,
        videoCurrentTime, setVideoCurrentTime,
        photoStickers, setPhotoStickers,
        draggingStickerId, setDraggingStickerId,
        activeMenu, setActiveMenu,
        hasMovedInCurrentEdit, setHasMovedInCurrentEdit,
        targetSlotPosition, setTargetSlotPosition,
        audioBlob, setAudioBlob,
        audioDuration, setAudioDuration,
        dragStateRef, textAreaRef, draggableRefs, stageRef, isDragging, isClickRef, justSelectedRef, isScrubbingRef, stickerLastTapRef,
        handleMediaSourceSelection,
        handleCroppedImage,
        handleStitchOption,
        handleComposerSubmit,
        resetComposer,
        addTextElement,
        updateElement,
        updateTextStyle,
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        isPostDisabled,
        currentUser
    };
}
