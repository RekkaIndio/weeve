"use client";

import { use, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore, type TextStyle, type Contribution, type User } from "@/lib/store";
import { createStoryContribution } from "@/lib/data";
import { capturePhoto, captureVideo } from "@/lib/camera";
import { ChevronLeft, Plus, Play, MoreVertical, Video, Camera, Type, X, Loader2, Edit2, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp } from "lucide-react";
import EditStoryModal from "@/app/components/EditStoryModal";
import { toast } from "sonner";

const FONT_OPTIONS = [
    { label: "Sans", value: "'Inter', 'Helvetica Neue', sans-serif" },
    { label: "Serif", value: "'Playfair Display', 'Georgia', serif" },
    { label: "Mono", value: "'Space Mono', 'Courier New', monospace" },
    { label: "Script", value: "'Pacifico', 'Brush Script MT', cursive" },
    { label: "Display", value: "'Bebas Neue', 'Impact', sans-serif" },
] as const;

const FONT_SIZE_OPTIONS = [18, 24, 32, 40, 48, 56] as const;

const TEXT_COLOR_OPTIONS = [
    "#FFFFFF",
    "#EC1D99",
    "#FFD166",
    "#06D6A0",
    "#118AB2",
    "#EF476F",
    "#F4F1DE",
] as const;

const BACKGROUND_OPTIONS = [
    "transparent",
    "rgba(0,0,0,0.6)",
    "rgba(236,29,153,0.25)",
    "rgba(255,209,102,0.25)",
    "rgba(17,138,178,0.25)",
    "rgba(244,241,222,0.35)",
] as const;

const EMOJI_OPTIONS = [
    "✨",
    "🔥",
    "🎉",
    "🌟",
    "💫",
    "🥳",
    "🚀",
    "🎬",
    "📸",
    "🎵",
] as const;

const ALIGN_OPTIONS: Array<{ value: TextStyle["textAlign"]; icon: typeof AlignLeft }> = [
    { value: "left", icon: AlignLeft },
    { value: "center", icon: AlignCenter },
    { value: "right", icon: AlignRight },
];

const EMPTY_CONTRIBUTIONS: Contribution[] = [];

const DEFAULT_TEXT_STYLE: TextStyle = {
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    fontSize: 28,
    textColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.6)",
    textAlign: "center",
};

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { stories, currentUser, addContribution } = useStore();

    const story = stories.find((s) => s.id === id);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    // Stitch Flow States
    const [showStitchMenu, setShowStitchMenu] = useState(false);
    const [stitchMode, setStitchMode] = useState<'video' | 'image' | 'text' | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [textContribution, setTextContribution] = useState("");
    const [textStyleOptions, setTextStyleOptions] = useState<TextStyle>({ ...DEFAULT_TEXT_STYLE });
    const [mediaDraft, setMediaDraft] = useState<{ type: 'video' | 'image'; file?: File; previewUrl?: string } | null>(null);
    const [textPosition, setTextPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
    const [optionsExpanded, setOptionsExpanded] = useState(true);
    const dragStateRef = useRef<{ offsetX: number; offsetY: number; width: number; height: number; pointerId: number } | null>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const draggableTextRef = useRef<HTMLDivElement>(null);
    const optionsPanelRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    // Edit Story States
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const contributions = story?.contributions ?? EMPTY_CONTRIBUTIONS;
    const maxWeeves = typeof story?.maxWeeves === 'number' ? story.maxWeeves : null;
    const contributionsCount = contributions.length;
    const isAtCapacity = maxWeeves !== null && contributionsCount >= maxWeeves;
    const isStoryComplete = story?.status === 'completed' || isAtCapacity;
    const remainingSlots = maxWeeves !== null ? Math.max(maxWeeves - contributionsCount, 0) : null;
    const activeSegment = contributions[activeIndex];
    const activeTextStyle = useMemo<TextStyle>(() => ({
        ...DEFAULT_TEXT_STYLE,
        ...(activeSegment?.textStyle ?? {}),
    }), [activeSegment?.textStyle]);
    const hasCustomTextStyle = Boolean(activeSegment?.textStyle);
    const isMyTurn = !isStoryComplete && story?.currentTurnUserId === currentUser?.id;
    const hasContributions = contributions.length > 0;
    const participantMap = useMemo(() => {
        const map = new Map<string, User>();
        (story?.participants ?? []).forEach((participant) => {
            map.set(participant.id, participant);
        });
        return map;
    }, [story?.participants]);
    const timelineEntries = useMemo(() => {
        const occurrences = new Map<string, number>();
        const latestIndexByUser = new Map<string, number>();
        contributions.forEach((contribution, index) => {
            latestIndexByUser.set(contribution.userId, index);
        });
        return contributions.map((contribution, index) => {
            const occurrence = (occurrences.get(contribution.userId) ?? 0) + 1;
            occurrences.set(contribution.userId, occurrence);
            return {
                contribution,
                index,
                occurrence,
                isLatestForUser: latestIndexByUser.get(contribution.userId) === index,
            };
        });
    }, [contributions]);
    const participantsWithoutContributions = useMemo(() => {
        const contributors = new Set(contributions.map((contribution) => contribution.userId));
        return (story?.participants ?? []).filter((participant) => !contributors.has(participant.id));
    }, [story?.participants, contributions]);
    const handleContributionSelect = useCallback((index: number) => {
        setActiveIndex(index);
        setIsPlaying(true);
    }, [setActiveIndex, setIsPlaying]);

    const isComposerOpen = stitchMode !== null && !showStitchMenu;
    const composerTitle = useMemo(() => {
        if (stitchMode === 'video') return 'Add Video Caption';
        if (stitchMode === 'image') return 'Add Photo Caption';
        if (stitchMode === 'text') return 'Write Caption';
        return 'Compose';
    }, [stitchMode]);

    const isPostDisabled = useMemo(() => {
        if (stitchMode === 'text') {
            return textContribution.trim().length === 0;
        }
        return false;
    }, [stitchMode, textContribution]);

    const clampPosition = useCallback((left: number, top: number, width: number, height: number) => {
        if (!stageRef.current) return { left, top };
        const viewport = stageRef.current.getBoundingClientRect();
        const panelHeight = optionsPanelRef.current?.getBoundingClientRect().height ?? 0;
        const bottomPadding = Math.max(panelHeight, 80);

        const minLeft = 16;
        const maxLeft = Math.max(minLeft, viewport.width - width - 16);
        const minTop = 16;
        const maxTop = Math.max(minTop, viewport.height - height - bottomPadding - 16);

        return {
            left: Math.min(Math.max(left, minLeft), maxLeft),
            top: Math.min(Math.max(top, minTop), maxTop),
        };
    }, []);

    useEffect(() => {
        if (!isComposerOpen) return;
        requestAnimationFrame(() => {
            if (!stageRef.current) return;
            const viewport = stageRef.current.getBoundingClientRect();
            const panelHeight = optionsPanelRef.current?.getBoundingClientRect().height ?? 0;
            const previewWidth = draggableTextRef.current?.offsetWidth ?? 240;
            const previewHeight = draggableTextRef.current?.offsetHeight ?? 120;
            const proposedLeft = (viewport.width - previewWidth) / 2;
            const proposedTop = (viewport.height - panelHeight - previewHeight) / 2;
            const clamped = clampPosition(proposedLeft, proposedTop, previewWidth, previewHeight);
            setTextPosition(clamped);
        });
    }, [isComposerOpen, clampPosition, optionsExpanded]);

    useEffect(() => {
        if (!isComposerOpen) return;
        if (!draggableTextRef.current) return;
        const previewWidth = draggableTextRef.current.offsetWidth;
        const previewHeight = draggableTextRef.current.offsetHeight;
        const clamped = clampPosition(textPosition.left, textPosition.top, previewWidth, previewHeight);
        if (clamped.left !== textPosition.left || clamped.top !== textPosition.top) {
            setTextPosition(clamped);
        }
    }, [textContribution, textStyleOptions, optionsExpanded, isComposerOpen, clampPosition, textPosition.left, textPosition.top, mediaDraft?.previewUrl]);

    const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!draggableTextRef.current) return;
        const rect = draggableTextRef.current.getBoundingClientRect();
        dragStateRef.current = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            width: rect.width,
            height: rect.height,
            pointerId: event.pointerId,
        };
        draggableTextRef.current.setPointerCapture(event.pointerId);
    };

    const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const dragState = dragStateRef.current;
        if (!dragState || !stageRef.current) return;
        const viewport = stageRef.current.getBoundingClientRect();
        const rawLeft = event.clientX - viewport.left - dragState.offsetX;
        const rawTop = event.clientY - viewport.top - dragState.offsetY;
        const clamped = clampPosition(rawLeft, rawTop, dragState.width, dragState.height);
        setTextPosition(clamped);
    };

    const handleDragEnd = () => {
        if (dragStateRef.current && draggableTextRef.current) {
            try {
                draggableTextRef.current.releasePointerCapture(dragStateRef.current.pointerId);
            } catch (err) {
                // ignore
            }
        }
        dragStateRef.current = null;
    };

    const updateTextStyle = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => {
        setTextStyleOptions((prev) => ({ ...prev, [key]: value }));
    };

    const resetComposer = () => {
        setTextContribution("");
        setTextStyleOptions({ ...DEFAULT_TEXT_STYLE });
        setMediaDraft(null);
        setStitchMode(null);
        setOptionsExpanded(true);
        setTextPosition({ left: 0, top: 0 });
        if (dragStateRef.current && draggableTextRef.current) {
            try {
                draggableTextRef.current.releasePointerCapture(dragStateRef.current.pointerId);
            } catch (err) {
                // ignore
            }
        }
        dragStateRef.current = null;
    };

    const toggleOptionsPanel = () => {
        setOptionsExpanded((prev) => !prev);
    };

    const handleComposerCancel = () => {
        resetComposer();
        setShowStitchMenu(false);
    };

    useEffect(() => {
        return () => {
            if (mediaDraft?.previewUrl) {
                URL.revokeObjectURL(mediaDraft.previewUrl);
            }
        };
    }, [mediaDraft?.previewUrl]);

    useEffect(() => {
        if (!isStoryComplete) return;
        resetComposer();
        setShowStitchMenu(false);
    }, [isStoryComplete]);

    if (!story) return <div>Story not found</div>;

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    const handleNext = () => {
        if (activeIndex < story.contributions.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            setIsPlaying(false); // End of story
        }
    };

    const handleStitchOption = async (mode: 'video' | 'image' | 'text') => {
        if (isStoryComplete) {
            toast.error('This story has reached its stitch limit.');
            return;
        }

        setShowStitchMenu(false);
        resetComposer();

        if (mode === 'text') {
            setStitchMode('text');
            return;
        }

        if (mode === 'video') {
            console.log('[Story] Requesting video capture');
            const file = await captureVideo();
            if (file) {
                console.log('[Story] Video file received:', file.name, file.size);
                const previewUrl = URL.createObjectURL(file);
                setMediaDraft({ type: 'video', file, previewUrl });
                setTextContribution("");
                setTextStyleOptions({ ...DEFAULT_TEXT_STYLE });
                setStitchMode('video');
            } else {
                console.log('[Story] No video file returned (user may have cancelled)');
                toast.error('Video capture cancelled or failed. Please try again.');
            }
            return;
        }

        if (mode === 'image') {
            console.log('[Story] Requesting photo capture');
            const file = await capturePhoto();
            if (file) {
                console.log('[Story] Photo file received:', file.name, file.size);
                const previewUrl = URL.createObjectURL(file);
                setMediaDraft({ type: 'image', file, previewUrl });
                setTextContribution("");
                setTextStyleOptions({ ...DEFAULT_TEXT_STYLE });
                setStitchMode('image');
            } else {
                console.log('[Story] No photo file returned (user may have cancelled)');
                toast.error('Photo capture cancelled or failed. Please try again.');
            }
        }
    };

    const computeNextTurnUserId = (willComplete: boolean) => {
        if (willComplete) {
            return undefined;
        }
        const participants = story.participants;
        const currentIndex = participants.findIndex((p) => p.id === currentUser.id);
        if (currentIndex === -1 || participants.length === 0) {
            return story.currentTurnUserId;
        }
        const nextIndex = (currentIndex + 1) % participants.length;
        return participants[nextIndex]?.id ?? story.currentTurnUserId;
    };

    const handleComposerSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!stitchMode || !currentUser) return;

        if (isStoryComplete) {
            toast.error('This story has reached its stitch limit.');
            resetComposer();
            setShowStitchMenu(false);
            return;
        }

        const trimmed = textContribution.trim();

        if (stitchMode === 'text' && trimmed.length === 0) {
            toast.error('Please add some text before posting.');
            return;
        }

        const requiresFile = stitchMode === 'video' || stitchMode === 'image';
        if (requiresFile && !mediaDraft?.file) {
            toast.error(`Please select a ${stitchMode === 'video' ? 'video' : 'photo'} to upload.`);
            return;
        }

        const caption = (() => {
            if (trimmed.length > 0) return trimmed;
            if (stitchMode === 'video') return 'Check out this view! 🎥';
            if (stitchMode === 'image') return 'Captured this moment 📸';
            return 'Just added a new part! ✨';
        })();

        const shouldPersistStyle = stitchMode === 'text' || trimmed.length > 0;
        const textStylePayload = shouldPersistStyle ? { ...textStyleOptions } : undefined;

        setIsUploading(true);

        try {
            const willComplete = maxWeeves !== null && story.contributions.length + 1 >= maxWeeves;
            const computedNextTurnUserId = computeNextTurnUserId(willComplete);
            const nextTurnUpdate = willComplete ? null : computedNextTurnUserId;
            const { contribution } = await createStoryContribution({
                storyId: story.id,
                userId: currentUser.id,
                userName: currentUser.name,
                mediaType: stitchMode,
                content: caption,
                file: mediaDraft?.file,
                textStyle: textStylePayload,
                timestamp: Date.now(),
                nextTurnUserId: nextTurnUpdate,
            });

            addContribution(story.id, contribution, { nextTurnUserId: nextTurnUpdate });
            toast.success('Contribution posted!');
            setActiveIndex(story.contributions.length);
            setIsPlaying(true);
            resetComposer();
            setShowStitchMenu(false);
        } catch (error) {
            console.error('Error adding contribution:', error);
            toast.error('Failed to post contribution. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };



    const handleEmojiInsert = (emoji: string) => {
        const textarea = textAreaRef.current;
        if (!textarea) {
            setTextContribution((prev) => prev + emoji);
            return;
        }

        const start = textarea.selectionStart ?? textContribution.length;
        const end = textarea.selectionEnd ?? textContribution.length;
        const nextValue = textContribution.slice(0, start) + emoji + textContribution.slice(end);
        setTextContribution(nextValue);

        requestAnimationFrame(() => {
            const caret = start + emoji.length;
            textarea.setSelectionRange(caret, caret);
            textarea.focus();
        });
    };

    return (
        <div ref={stageRef} className="h-full flex flex-col bg-black text-white relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
                <button onClick={() => router.back()} className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold text-sm tracking-wide uppercase opacity-80 font-sans">Weeve Timeline</h1>
                    {story.groupId && (
                        <button
                            onClick={() => router.push(`/groups/${story.groupId}`)}
                            className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            {story.groupAvatar && (
                                <img
                                    src={story.groupAvatar}
                                    alt="Group"
                                    className="w-3 h-3 rounded-full"
                                />
                            )}
                            <span className="text-[10px] font-medium text-gray-300">From Group</span>
                        </button>
                    )}
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto"
                    >
                        <MoreVertical className="w-6 h-6" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden pointer-events-auto z-50">
                            {story.creatorId === currentUser.id && (
                                <button
                                    onClick={() => {
                                        setShowEditModal(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-white">Edit Story</span>
                                </button>
                            )}
                            {/* Add more options here if needed */}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Media Player Area */}
            <div
                className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden cursor-pointer"
                onClick={() => setIsPlaying(!isPlaying)}
            >
                {/* Play/Pause Indicator */}
                {!isPlaying && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <div className="p-4 rounded-full glass animate-in zoom-in duration-200">
                            <Play className="w-8 h-8 fill-white" />
                        </div>
                    </div>
                )}
                {activeSegment ? (
                    <>
                        {activeSegment.mediaType === 'video' ? (
                            <VideoPlayer
                                key={activeSegment.id}
                                src={activeSegment.mediaUrl}
                                onComplete={handleNext}
                                isPlaying={isPlaying}
                            />
                        ) : activeSegment.mediaType === 'image' ? (
                            <div className="relative w-full h-full">
                                <img
                                    src={activeSegment.mediaUrl || "https://via.placeholder.com/400x800"}
                                    className="w-full h-full object-cover"
                                    alt="Story segment"
                                />
                                <AutoAdvance onComplete={handleNext} isPlaying={isPlaying} duration={3000} />
                            </div>
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center p-8"
                                style={{
                                    backgroundColor: activeTextStyle.backgroundColor === 'transparent'
                                        ? 'rgba(0,0,0,0.85)'
                                        : activeTextStyle.backgroundColor,
                                }}
                            >
                                <div
                                    className="max-w-xl w-full mx-auto rounded-3xl px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                                    style={{
                                        fontFamily: activeTextStyle.fontFamily,
                                        fontSize: activeTextStyle.fontSize,
                                        color: activeTextStyle.textColor,
                                        backgroundColor: activeTextStyle.backgroundColor === 'transparent'
                                            ? 'rgba(0,0,0,0.35)'
                                            : activeTextStyle.backgroundColor,
                                        textAlign: activeTextStyle.textAlign,
                                        whiteSpace: 'pre-line',
                                    }}
                                >
                                    {activeSegment.content}
                                </div>
                                <AutoAdvance onComplete={handleNext} isPlaying={isPlaying} duration={3000} />
                            </div>
                        )}

                        {/* Caption Overlay */}
                        {activeSegment.mediaType !== 'text' && (
                            <div className="absolute bottom-32 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                                <div className="mb-2">
                                    <span className="font-bold text-shadow-sm font-sans">{activeSegment.userName}</span>
                                </div>
                                <div
                                    className="w-full"
                                    style={{ textAlign: hasCustomTextStyle ? activeTextStyle.textAlign : 'left' }}
                                >
                                    <span
                                        className="text-lg font-medium leading-snug text-shadow-sm font-sans"
                                        style={{
                                            fontFamily: hasCustomTextStyle ? activeTextStyle.fontFamily : undefined,
                                            fontSize: hasCustomTextStyle ? activeTextStyle.fontSize : undefined,
                                            color: hasCustomTextStyle ? activeTextStyle.textColor : undefined,
                                            backgroundColor: hasCustomTextStyle && activeTextStyle.backgroundColor !== 'transparent'
                                                ? activeTextStyle.backgroundColor
                                                : undefined,
                                            padding: hasCustomTextStyle ? '0.75rem 1.25rem' : undefined,
                                            borderRadius: hasCustomTextStyle ? '1.5rem' : undefined,
                                            display: 'inline-block',
                                            whiteSpace: 'pre-line',
                                        }}
                                    >
                                        {activeSegment.content}
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-gray-500">No segments yet. Be the first!</div>
                )}

                {/* Uploading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-[#EC1D99] animate-spin mb-4" />
                        <p className="font-bold">Uploading...</p>
                    </div>
                )}
            </div>

            {/* Timeline Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl p-4 pb-8 border-t border-white/10 z-30 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide px-2 flex-nowrap">
                    {timelineEntries.map(({ contribution, index, occurrence, isLatestForUser }) => {
                        const participant = participantMap.get(contribution.userId);
                        const displayName = participant?.name ?? contribution.userName;
                        const avatar = participant?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
                        const isActive = index === activeIndex;
                        const isCurrentTurn = isLatestForUser && story.currentTurnUserId === contribution.userId;

                        return (
                            <button
                                key={`${contribution.id}-${index}`}
                                type="button"
                                onClick={() => handleContributionSelect(index)}
                                className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none text-white"
                            >
                                <div
                                    className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all shrink-0 ${isActive
                                        ? 'border-[#EC1D99] shadow-[0_0_15px_rgba(236,29,153,0.35)]'
                                        : isCurrentTurn
                                            ? 'border-[#EC1D99]/70 shadow-[0_0_12px_rgba(236,29,153,0.25)]'
                                            : 'border-gray-700'}`}
                                >
                                    <img
                                        src={avatar}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-300 font-medium max-w-[64px] truncate" title={displayName}>
                                    {displayName.split(' ').slice(0, 2).join(' ')}
                                </span>
                                <span className="text-[9px] uppercase tracking-wide text-gray-600">Part {occurrence}</span>
                                {isCurrentTurn && (
                                    <span className="text-[10px] text-[#EC1D99] font-semibold">Their turn</span>
                                )}
                            </button>
                        );
                    })}

                    {participantsWithoutContributions.map((participant) => {
                        const isCurrentTurn = story.currentTurnUserId === participant.id;
                        return (
                            <button
                                key={`pending-${participant.id}`}
                                type="button"
                                disabled
                                className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none opacity-40 cursor-default"
                            >
                                <div
                                    className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all shrink-0 ${isCurrentTurn ? 'border-[#EC1D99]/70 shadow-[0_0_12px_rgba(236,29,153,0.25)]' : 'border-gray-700'}`}
                                >
                                    <img
                                        src={participant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`}
                                        alt={participant.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium max-w-[64px] truncate" title={participant.name}>
                                    {participant.name.split(' ').slice(0, 2).join(' ')}
                                </span>
                                <span className="text-[9px] uppercase tracking-wide text-gray-600">No part yet</span>
                                {isCurrentTurn && (
                                    <span className="text-[10px] text-[#EC1D99] font-semibold">Their turn</span>
                                )}
                            </button>
                        );
                    })}

                    {isMyTurn && (
                        <button
                            onClick={() => setShowStitchMenu(true)}
                            className="shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400 hover:text-[#EC1D99] hover:border-[#EC1D99] transition-colors"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {!hasContributions && (
                    <div className="text-xs text-gray-500 px-2 pb-2">
                        No stitches yet. Be the first to add one!
                    </div>
                )}

                {/* Action Button */}
                {!isStoryComplete && remainingSlots !== null && (
                    <div className="text-center text-[10px] text-gray-500 pb-2">
                        {remainingSlots} stitch{remainingSlots === 1 ? '' : 'es'} remaining.
                    </div>
                )}

                {isStoryComplete ? (
                    <div className="text-center text-xs text-gray-500 py-2">
                        Story complete — stitch limit reached.
                    </div>
                ) : isMyTurn ? (
                    <button
                        onClick={() => setShowStitchMenu(true)}
                        className="w-full bg-[#EC1D99] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-[#D41C84] transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Stitch Your Part
                    </button>
                ) : (
                    <div className="text-center text-xs text-gray-500 py-2">
                        Waiting for {story.participants.find(p => p.id === story.currentTurnUserId)?.name ?? 'the next creator'} to stitch...
                    </div>
                )}
            </div>

            {/* Stitch Menu Modal */}
            {showStitchMenu && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-40 flex flex-col items-center justify-end pb-12 animate-in slide-in-from-bottom duration-300">
                    <button
                        onClick={() => setShowStitchMenu(false)}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <h2 className="text-xl font-bold mb-8">How do you want to stitch?</h2>

                    <div className="flex gap-6 mb-8">
                        <button
                            onClick={() => handleStitchOption('video')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Video className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">Video</span>
                        </button>

                        <button
                            onClick={() => handleStitchOption('image')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Camera className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">Photo</span>
                        </button>

                        <button
                            onClick={() => handleStitchOption('text')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Type className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">Text</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Composer Overlay */}
            {isComposerOpen && (
                <>
                    <div className="absolute inset-0 z-40 pointer-events-none">
                        {(stitchMode === 'video' || stitchMode === 'image') && mediaDraft?.previewUrl && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8 pt-12 pb-32">
                                {stitchMode === 'video' ? (
                                    <video
                                        src={mediaDraft.previewUrl}
                                        className="max-h-[70vh] w-auto rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                                        controls
                                    />
                                ) : (
                                    <img
                                        src={mediaDraft.previewUrl}
                                        alt="Selected media preview"
                                        className="max-h-[70vh] w-auto rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain"
                                    />
                                )}
                            </div>
                        )}

                        <div
                            ref={draggableTextRef}
                            className="pointer-events-auto select-none cursor-grab active:cursor-grabbing"
                            style={{
                                position: 'absolute',
                                left: `${textPosition.left}px`,
                                top: `${textPosition.top}px`,
                                fontFamily: textStyleOptions.fontFamily,
                                fontSize: textStyleOptions.fontSize,
                                color: textStyleOptions.textColor,
                                textAlign: textStyleOptions.textAlign,
                            }}
                            onPointerDown={handleDragStart}
                            onPointerMove={handleDragMove}
                            onPointerUp={handleDragEnd}
                            onPointerCancel={handleDragEnd}
                        >
                            <div className="relative">
                                <div
                                    className="rounded-[28px] px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.45)] border border-white/10 backdrop-blur-sm"
                                    style={{
                                        backgroundColor: textStyleOptions.backgroundColor === 'transparent'
                                            ? 'rgba(0,0,0,0.45)'
                                            : textStyleOptions.backgroundColor,
                                        whiteSpace: 'pre-line',
                                    }}
                                >
                                    {textContribution.trim().length > 0 ? textContribution : "Add your text..."}
                                </div>
                                <span className="absolute -top-3 right-3 text-[10px] uppercase tracking-widest text-gray-400 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                                    Drag
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 z-50">
                        <div
                            ref={optionsPanelRef}
                            className="bg-black/95 border-t border-white/10 rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.65)]"
                        >
                            <div className="flex items-center justify-between px-6 pt-4 pb-3">
                                <button
                                    onClick={handleComposerCancel}
                                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500">
                                    {composerTitle}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleOptionsPanel}
                                        className="rounded-full border border-white/10 p-2 text-gray-400 hover:text-white hover:border-white/30 transition-colors"
                                        aria-label={optionsExpanded ? 'Hide text options' : 'Show text options'}
                                    >
                                        {optionsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleComposerSubmit()}
                                        disabled={isPostDisabled || isUploading}
                                        className={`text-sm font-semibold transition-colors ${isPostDisabled || isUploading ? 'text-gray-500 opacity-40 cursor-not-allowed' : 'text-[#EC1D99]'}`}
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 pb-5 space-y-4">
                                <textarea
                                    ref={textAreaRef}
                                    value={textContribution}
                                    onChange={(e) => setTextContribution(e.target.value)}
                                    placeholder={stitchMode === 'text' ? "Share your next story move..." : 'Add a caption or overlay text'}
                                    className="w-full h-32 bg-gray-900 border border-gray-800 rounded-3xl p-4 text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#EC1D99]"
                                    style={{
                                        fontFamily: textStyleOptions.fontFamily,
                                        fontSize: textStyleOptions.fontSize,
                                        color: textStyleOptions.textColor,
                                        textAlign: textStyleOptions.textAlign,
                                    }}
                                    autoFocus
                                />

                                <div className={`space-y-5 transition-all duration-300 ${optionsExpanded ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'}`}>
                                    {stitchMode === 'text' && (
                                        <>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Font</p>
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                    {FONT_OPTIONS.map((font) => (
                                                        <button
                                                            key={font.value}
                                                            type="button"
                                                            onClick={() => updateTextStyle('fontFamily', font.value)}
                                                            className={`px-3 py-2 rounded-lg border transition-all ${textStyleOptions.fontFamily === font.value ? 'border-[#EC1D99] text-[#EC1D99]' : 'border-gray-800 text-gray-300 hover:border-gray-600'}`}
                                                            style={{ fontFamily: font.value }}
                                                        >
                                                            {font.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Size</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {FONT_SIZE_OPTIONS.map((size) => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={() => updateTextStyle('fontSize', size)}
                                                            className={`px-3 py-2 rounded-lg border transition-all ${textStyleOptions.fontSize === size ? 'border-[#EC1D99] text-[#EC1D99]' : 'border-gray-800 text-gray-300 hover:border-gray-600'}`}
                                                        >
                                                            {size}px
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Alignment</p>
                                                <div className="flex gap-2">
                                                    {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => updateTextStyle('textAlign', value)}
                                                            className={`p-2 rounded-lg border transition-all ${textStyleOptions.textAlign === value ? 'border-[#EC1D99] text-[#EC1D99]' : 'border-gray-800 text-gray-300 hover:border-gray-600'}`}
                                                            aria-label={`Align ${value}`}
                                                        >
                                                            <Icon className="w-5 h-5" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Text Colour</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {TEXT_COLOR_OPTIONS.map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => updateTextStyle('textColor', color)}
                                                            className={`w-9 h-9 rounded-full border-2 transition-transform ${textStyleOptions.textColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                                            style={{ backgroundColor: color }}
                                                            aria-label={`Set text colour ${color}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Background</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {BACKGROUND_OPTIONS.map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => updateTextStyle('backgroundColor', color)}
                                                            className={`w-12 h-9 rounded-lg border transition-all ${textStyleOptions.backgroundColor === color ? 'border-[#EC1D99]' : 'border-gray-800 hover:border-gray-600'}`}
                                                            style={{
                                                                background: color === 'transparent'
                                                                    ? 'linear-gradient(135deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)'
                                                                    : color,
                                                            }}
                                                            aria-label={color === 'transparent' ? 'No background' : `Background ${color}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Emojis</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {EMOJI_OPTIONS.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => handleEmojiInsert(emoji)}
                                                    className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900 hover:border-[#EC1D99] hover:text-[#EC1D99] transition-all"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
            {/* Edit Story Modal */}
            {showEditModal && (
                <EditStoryModal
                    story={story}
                    onClose={() => setShowEditModal(false)}
                />
            )}
        </div>
    );
}


function AutoAdvance({ onComplete, isPlaying, duration }: { onComplete: () => void, isPlaying: boolean, duration: number }) {
    useEffect(() => {
        if (!isPlaying) return;
        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
    }, [isPlaying, onComplete, duration]);
    return null;
}

function VideoPlayer({ src, onComplete, isPlaying }: { src?: string, onComplete: () => void, isPlaying: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);

    // Play or pause based on isPlaying
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) {
            const playVideo = async () => {
                try {
                    video.currentTime = 0;
                    await video.play();
                } catch (err) {
                    console.error("Autoplay failed:", err);
                    video.muted = true;
                    try {
                        await video.play();
                    } catch (mutedErr) {
                        console.error("Muted autoplay failed:", mutedErr);
                        setError(true);
                    }
                }
            };
            playVideo();
        } else {
            video.pause();
        }
    }, [src, isPlaying]);

    // Notify when video ends or safety timer fires
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onLoadedMetadata = () => {
            const duration = video.duration;
            if (isFinite(duration)) {
                const safetyTimer = setTimeout(() => {
                    console.log("Video safety timer triggered");
                    onComplete();
                }, (duration * 1000) + 2000);
                return () => clearTimeout(safetyTimer);
            }
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
    }, [src, onComplete]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <button onClick={onComplete} className="text-white">
                    Video Error. Skip →
                </button>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay={isPlaying}
            onEnded={onComplete}
            controls={false}
        />
    );
}
