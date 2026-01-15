import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, MoreVertical, Play, Edit2, Trash, LogOut, GitBranch,
    Sparkles, Loader2, Type, Smile, Crop, Video, Camera, FileVideo, Image as ImageIcon
} from 'lucide-react';
import { type Story, type Contribution, type User, type TextStyle } from '@/lib/store';
import { leaveStory, deleteStory } from '@/lib/stories';
import { NON_VIDEO_AUTO_ADVANCE_MS } from '@/lib/playback';
import { TimelineEntry, PhotoSticker } from '../types';

import { DrawingCanvasRef } from '@/app/components/DrawingCanvas';
import EditStoryModal from "@/app/components/EditStoryModal";
import AudioRecorder from "@/app/components/AudioRecorder";
import ImageCropper from "@/app/components/ImageCropper";

import { VideoPlayer, AutoAdvance } from './VideoPlayer';
import { ConfirmModal } from './Modals';
import { StitchComposer } from './StitchComposer';
import { StitchMenu } from './StitchMenu';
import { MediaPickerOverlay } from './MediaPickerOverlay';
import { StoryTimeline } from './StoryTimeline';
import StitchContextThumbnails from '@/app/components/StitchContextThumbnails';

import { useComposer } from '../hooks/useComposer';

interface ActiveStoryViewProps {
    story: Story;
    currentUser: User | null;
    contributions: Contribution[];
    timelineEntries: TimelineEntry[];
    originalStoryTitle?: string;
    isUserParticipant: boolean;
    isMyTurn: boolean;
}

export function ActiveStoryView({
    story,
    currentUser,
    contributions,
    timelineEntries,
    originalStoryTitle,
    isUserParticipant,
    isMyTurn
}: ActiveStoryViewProps) {
    const router = useRouter();
    const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
    const justSelectedRef = useRef(false);

    // Playback State
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    // Modals State
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Composer Hook
    const composer = useComposer(
        story,
        currentUser,
        drawingCanvasRef,
        () => {
            setActiveIndex(story.contributions.length);
            setIsPlaying(true);
        }
    );

    const {
        stitchMode, showStitchMenu, setShowStitchMenu, isUploading, uploadProgress,
        handleStitchOption, handleMediaSourceSelection, handleComposerSubmit,
        mediaSourcePicker, setMediaSourcePicker, resetComposer,
        textElements, activeElementId, setActiveElementId, activeMenu, setActiveMenu,
        mediaDraft, setMediaDraft, photoFilter, setPhotoFilter, showPhotoFilterPanel, setShowPhotoFilterPanel,
        showStickerPanel, setShowStickerPanel, photoStickers, setPhotoStickers,
        draggingStickerId, setDraggingStickerId, showVideoTrimmer, setShowVideoTrimmer,
        hasMovedInCurrentEdit, setHasMovedInCurrentEdit, updateTextStyle, addTextElement,
        handleDragStart, handleDragMove, handleDragEnd,
        isPostDisabled, setTargetSlotPosition,
        setAudioBlob, setAudioDuration,
        setImageToCrop, imageToCrop, handleCroppedImage,
        draggableRefs
    } = composer;

    const isComposerOpen = stitchMode !== null;

    // Computed
    const activeSegment = useMemo(() => {
        if (!contributions || contributions.length === 0) return null;
        return contributions[activeIndex];
    }, [contributions, activeIndex]);

    // Legacy text style helper for playback
    const hasCustomTextStyle = activeSegment?.textStyle && Object.keys(activeSegment.textStyle).length > 0;
    const legacyTextStyle = (activeSegment?.textStyle || {}) as TextStyle;

    const participantsWithoutContributions = useMemo(() => {
        return story.participants.filter(p =>
            !contributions.some(c => c.userId === p.id)
        ) || [];
    }, [story.participants, contributions]);

    const participantMap = useMemo(() => {
        const map = new Map<string, User>();
        story.participants.forEach(p => map.set(p.id, p));
        return map;
    }, [story.participants]);

    const mediaPickerConfig = useMemo(() => {
        if (!mediaSourcePicker) return null;
        const isVideo = mediaSourcePicker.type === 'video';
        return {
            type: mediaSourcePicker.type,
            heading: isVideo ? 'How do you want to add a video?' : 'How do you want to add a photo?',
            takeLabel: isVideo ? 'Take Video' : 'Take Photo',
            uploadLabel: isVideo ? 'Upload Video' : 'Upload Photo',
            TakeIcon: isVideo ? Video : Camera,
            UploadIcon: isVideo ? FileVideo : ImageIcon,
        } as const;
    }, [mediaSourcePicker]);

    // Computed
    const userHasContributed = useMemo(() => {
        if (!currentUser || !contributions) return false;
        return contributions.some(c => c.userId === currentUser.id);
    }, [currentUser, contributions]);

    // Handlers
    const handleNext = () => {
        if (activeIndex < contributions.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
        }
    };

    const handleLeaveStoryAction = async () => {
        if (!story || !currentUser) return;
        try {
            await leaveStory(story.id, currentUser.id, currentUser.name);
            router.push('/groups/' + story.groupId);
        } catch (error) {
            console.error('Failed to leave story:', error);
        }
    };

    const handleDeleteStoryAction = async () => {
        if (!story || !currentUser) return;
        try {
            await deleteStory(story.id, currentUser.id);
            router.push(story.groupId ? `/groups/${story.groupId}` : '/feed');
        } catch (error) {
            console.error('Failed to delete story:', error);
        }
    };

    const handleTrimChange = (start: number, end: number) => {
        setMediaDraft(prev => prev ? { ...prev, trimStart: start, trimEnd: end } : null);
    };

    return (
        <div className="h-full flex flex-col bg-black text-white relative">
            {/* Header */}
            {!isComposerOpen && (
                <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
                    <button onClick={() => router.back()} className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-sm tracking-wide uppercase opacity-80 font-sans">Weeve Timeline</h1>
                        {story?.title && <div className="text-sm text-gray-300 mt-1 font-semibold">{story.title}</div>}
                        {story.forkedFromStoryId && (
                            <button
                                onClick={() => router.push(`/story/${story.forkedFromStoryId}`)}
                                className="flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-xs text-gray-200 hover:bg-black/60 hover:text-white transition-all border border-white/10 pointer-events-auto shadow-lg"
                            >
                                <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                <span className="opacity-80">Weeve of</span>
                                <span className="font-bold text-white max-w-[150px] truncate">
                                    {originalStoryTitle || 'Original'}
                                </span>
                            </button>
                        )}
                        {story.groupId && (
                            <button
                                onClick={() => router.push(`/groups/${story.groupId}`)}
                                className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                {story.groupAvatar && (
                                    <img src={story.groupAvatar} alt="Group" className="w-3 h-3 rounded-full" />
                                )}
                                <span className="text-[10px] font-medium text-gray-300">{story.groupName || 'From Group'}</span>
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
                        {showMenu && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden pointer-events-auto z-50">
                                {(story.creatorId === currentUser?.id || isUserParticipant || userHasContributed) && (
                                    <button onClick={() => { setShowEditModal(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors">
                                        <Edit2 className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-white">{story.creatorId === currentUser?.id ? 'Edit Story' : 'Manage Contribution'}</span>
                                    </button>
                                )}
                                {story.creatorId === currentUser?.id && (
                                    <button onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800">
                                        <Trash className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-medium text-red-400">Delete Story</span>
                                    </button>
                                )}
                                {isUserParticipant && (
                                    <button onClick={() => { setShowLeaveConfirm(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800">
                                        <LogOut className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-medium text-red-400">Leave Story</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden cursor-pointer" onClick={() => setIsPlaying(!isPlaying)}>
                {!isPlaying && !stitchMode && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <div className="p-4 rounded-full glass animate-in zoom-in duration-200">
                            <Play className="w-8 h-8 fill-white" />
                        </div>
                    </div>
                )}

                {stitchMode ? (
                    <div className="absolute inset-0 bg-[#111] flex items-center justify-center"></div>
                ) : activeSegment ? (
                    <>
                        {activeSegment.mediaType === 'video' ? (
                            <VideoPlayer key={activeSegment.id} src={activeSegment.mediaUrl} onComplete={handleNext} isPlaying={isPlaying} />
                        ) : (activeSegment.mediaType === 'image' || activeSegment.mediaType === 'drawing') ? (
                            <div className={`relative w-full h-full flex items-center justify-center bg-black`}>
                                <img
                                    src={activeSegment.mediaUrl || "https://via.placeholder.com/400x800"}
                                    className={`w-full h-full ${activeSegment.mediaType === 'drawing' ? 'object-contain' : 'object-contain'}`}
                                    alt="Story segment"
                                />
                                <AutoAdvance onComplete={handleNext} isPlaying={isPlaying} duration={NON_VIDEO_AUTO_ADVANCE_MS} />
                            </div>
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center p-8"
                                style={{ backgroundColor: legacyTextStyle.backgroundColor === 'transparent' ? 'rgba(0,0,0,0.85)' : legacyTextStyle.backgroundColor }}
                            >
                                <AutoAdvance onComplete={handleNext} isPlaying={isPlaying} duration={NON_VIDEO_AUTO_ADVANCE_MS} />
                            </div>
                        )}

                        {/* Text Overlay */}
                        {activeSegment.textStyle?.elements && activeSegment.textStyle.elements.length > 0 ? (
                            <>
                                {activeSegment.textStyle.elements.map((element) => (
                                    <div key={element.id} className="absolute pointer-events-none" style={{
                                        left: 0,
                                        top: 0,
                                        transform: element.position.unit === '%'
                                            ? `translate3d(${element.position.left}vw, ${element.position.top}vh, 0)`
                                            : `translate3d(${element.position.left}px, ${element.position.top}px, 0)`,
                                        zIndex: 20
                                    }}>
                                        <div className="min-w-[200px] max-w-[80vw] text-center" style={{ ...element.style, backgroundColor: 'transparent', padding: 0 }}>
                                            <span style={{
                                                backgroundColor: element.style.backgroundColor,
                                                padding: '0.4em 0.6em',
                                                borderRadius: '0.5em',
                                                backdropFilter: 'blur(4px)',
                                                whiteSpace: 'pre-wrap',
                                                boxDecorationBreak: 'clone',
                                                WebkitBoxDecorationBreak: 'clone',
                                                lineHeight: '1.5',
                                                display: 'inline'
                                            }}>
                                                {element.content}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div className="absolute bottom-32 left-6 z-10">
                                    <span className="font-bold text-shadow-sm font-sans text-white">{activeSegment.userName}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                {activeSegment.mediaType === 'text' && activeSegment.content && (
                                    <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                                        <div className="max-w-xl w-full mx-auto rounded-3xl px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]" style={{ ...legacyTextStyle, backgroundColor: legacyTextStyle.backgroundColor, whiteSpace: 'pre-line' }}>
                                            {activeSegment.content}
                                        </div>
                                    </div>
                                )}
                                {activeSegment.mediaType !== 'text' && activeSegment.content && (
                                    <div className="absolute bottom-32 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                                        <div className="mb-2"><span className="font-bold text-shadow-sm font-sans">{activeSegment.userName}</span></div>
                                        <div className="w-full" style={{ textAlign: hasCustomTextStyle ? legacyTextStyle.textAlign : 'left' as const }}>
                                            <span
                                                className="text-lg font-medium leading-snug text-shadow-sm font-sans"
                                                style={hasCustomTextStyle ? {
                                                    ...legacyTextStyle,
                                                    backgroundColor: legacyTextStyle.backgroundColor !== 'transparent' ? legacyTextStyle.backgroundColor : undefined,
                                                    padding: '0.75rem 1.25rem', borderRadius: '1.5rem', display: 'inline-block', whiteSpace: 'pre-line'
                                                } : {}}
                                            >
                                                {activeSegment.content}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white px-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-[#EC1D99]/10 flex items-center justify-center mb-6 animate-pulse">
                            <Sparkles className="w-10 h-10 text-[#EC1D99]" />
                        </div>
                        <h3 className="text-2xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-3">Start the Story</h3>
                        <p className="text-gray-400 max-w-sm leading-relaxed">Be the first to add a weeve and set the direction for what comes next.</p>
                    </div>
                )}

                {isUploading && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                        <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="36"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    className="text-gray-700"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="36"
                                    fill="none"
                                    stroke="#EC1D99"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray="226.2"
                                    strokeDashoffset={226.2 - (226.2 * uploadProgress) / 100}
                                    className="transition-all duration-300 ease-out"
                                />
                            </svg>
                            <span className="text-xl font-bold text-white z-10">{uploadProgress}%</span>
                        </div>
                        <p className="font-bold text-white animate-pulse">Uploading...</p>
                    </div>
                )}
            </div>

            {/* Timeline Controls */}
            {!isComposerOpen && (
                <StoryTimeline
                    timelineEntries={timelineEntries}
                    story={story}
                    currentUser={currentUser}
                    activeContributionIndex={activeIndex}
                    isMyTurn={isMyTurn}
                    isStoryComplete={false}
                    contributions={contributions}
                    participantMap={participantMap}
                    participantsWithoutContributions={participantsWithoutContributions}
                    onContributionSelect={(index) => { setActiveIndex(index); setIsPlaying(true); }}
                    onAddWeeve={(slotPosition) => {
                        if (typeof slotPosition === 'number') setTargetSlotPosition(slotPosition);
                        setShowStitchMenu(true);
                    }}
                />
            )}

            {/* Context Thumbnails (Composer Mode) */}
            {isComposerOpen && (
                <StitchContextThumbnails
                    contributions={contributions}
                    className="bottom-[70px]"
                />
            )}


            {/* Creation Overlays */}
            {showStitchMenu && <StitchMenu onOptionSelect={handleStitchOption} onClose={() => setShowStitchMenu(false)} />}
            {mediaPickerConfig && <MediaPickerOverlay config={mediaPickerConfig} onSelectSource={handleMediaSourceSelection} onCancel={() => setMediaSourcePicker(null)} />}

            {stitchMode === 'audio' && !showStitchMenu && (
                <div className="absolute inset-0 z-40">
                    <AudioRecorder
                        userAvatar={currentUser?.avatar}
                        userName={currentUser?.name || 'User'}
                        onRecordingComplete={(blob, duration) => { setAudioBlob(blob); setAudioDuration(duration); }}
                        onCancel={() => { resetComposer(); setShowStitchMenu(false); }}
                        maxDuration={60}
                    />
                </div>
            )}

            <StitchComposer
                isComposerOpen={isComposerOpen && stitchMode !== 'audio'}
                stitchMode={stitchMode}
                mediaDraft={mediaDraft}
                photoFilter={photoFilter}
                photoStickers={photoStickers}
                textElements={textElements}
                activeElementId={activeElementId}
                activeMenu={activeMenu}
                hasMovedInCurrentEdit={hasMovedInCurrentEdit}
                showPhotoFilterPanel={showPhotoFilterPanel}
                showStickerPanel={showStickerPanel}
                draggingStickerId={draggingStickerId}
                drawingCanvasRef={drawingCanvasRef}
                draggableRefs={draggableRefs}
                justSelectedRef={justSelectedRef}
                stageRef={composer.stageRef}
                onBackgroundClick={() => { if (activeElementId) { setActiveElementId(null); setActiveMenu(null); setHasMovedInCurrentEdit(false); } }}
                onAddText={addTextElement}
                onToggleStickers={() => {
                    const opening = !showStickerPanel; setShowStickerPanel(opening); setShowPhotoFilterPanel(false);
                    if (opening) setActiveMenu(null);
                }}
                onClearStickers={() => setPhotoStickers([])}
                onSetPhotoStickers={setPhotoStickers}
                onSetDraggingStickerId={setDraggingStickerId}
                onSelectFilter={setPhotoFilter}
                onSelectSticker={(emoji) => {
                    const newSticker: PhotoSticker = { id: `sticker-${Date.now()}-${photoStickers.length}`, emoji, x: 50, y: 50, scale: 1 };
                    setPhotoStickers(prev => [...prev, newSticker]);
                }}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onSetActiveElementId={setActiveElementId}
                onSetActiveMenu={(menu) => { setActiveMenu(menu); if (menu !== null) setShowStickerPanel(false); }}
                onSetHasMovedInCurrentEdit={setHasMovedInCurrentEdit}
                onUpdateTextStyle={updateTextStyle}
                onUpdateTextContent={(id, content) => composer.updateElement(id, { content })}
                onDeleteTextElement={(id) => {
                    composer.setTextElements(prev => prev.filter(el => el.id !== id));
                    composer.setActiveElementId(null);
                    composer.setActiveMenu(null);
                }}
                onToggleTrimmer={() => { setShowVideoTrimmer(p => !p); setShowStickerPanel(false); setActiveMenu(null); }}
                onTrimChange={handleTrimChange}
                showVideoTrimmer={showVideoTrimmer}
                isMuted={mediaDraft?.isMuted}
                onToggleMute={() => {
                    const newMuted = !mediaDraft?.isMuted;
                    setMediaDraft(prev => prev ? { ...prev, isMuted: newMuted } : null);
                    const video = document.querySelector('.absolute.inset-0 video') as HTMLVideoElement | null;
                    if (video) video.muted = !!newMuted;
                }}
            />

            {/* Composer Header */}
            {isComposerOpen && (
                <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-auto">
                    <button onClick={resetComposer} className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white font-medium hover:bg-black/60 transition-colors">Cancel</button>
                    <button onClick={(e) => handleComposerSubmit(e)} disabled={isPostDisabled || isUploading} className={`px-6 py-2 rounded-full font-bold transition-colors ${isPostDisabled || isUploading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-[#EC1D99] text-white hover:bg-[#D41C84]'}`}>
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post'}
                    </button>
                </div>
            )}

            {/* Photo Tools Menu */}
            {isComposerOpen && stitchMode === 'image' && mediaDraft?.previewUrl && !activeElementId && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 pointer-events-auto">
                    <button onClick={() => { setShowPhotoFilterPanel(false); setShowStickerPanel(false); addTextElement(); }} className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg hover:bg-gray-700">
                        <Type className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => { setShowPhotoFilterPanel(!showPhotoFilterPanel); setShowStickerPanel(false); }} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${showPhotoFilterPanel ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}>
                        <Sparkles className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => { setShowStickerPanel(!showStickerPanel); setShowPhotoFilterPanel(false); }} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${showStickerPanel ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}>
                        <Smile className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => { setShowStickerPanel(false); setShowPhotoFilterPanel(false); if (mediaDraft?.previewUrl) setImageToCrop(mediaDraft.previewUrl); }} className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg hover:bg-gray-700">
                        <Crop className="w-5 h-5 text-white" />
                    </button>
                    {photoStickers.length > 0 && (
                        <button onClick={() => setPhotoStickers([])} className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm border-2 border-red-500/50 flex items-center justify-center shadow-lg hover:bg-red-500/50">
                            <Trash className="w-5 h-5 text-red-400" />
                        </button>
                    )}
                </div>
            )}

            {showEditModal && <EditStoryModal story={story} onClose={() => setShowEditModal(false)} />}
            {imageToCrop && <ImageCropper imageSrc={imageToCrop} onCropComplete={handleCroppedImage} onCancel={() => setImageToCrop(null)} />}
            {showLeaveConfirm && <ConfirmModal isOpen={showLeaveConfirm} title="Leave Story?" message={`Are you sure you want to leave "${story.title}"? This will free up your slot for someone else.`} confirmLabel="Leave Story" onConfirm={handleLeaveStoryAction} onClose={() => setShowLeaveConfirm(false)} variant="danger" />}
            {showDeleteConfirm && <ConfirmModal isOpen={showDeleteConfirm} title="Delete Story?" message="Are you sure you want to delete this story? This action cannot be undone." confirmLabel="Delete Story" onConfirm={handleDeleteStoryAction} onClose={() => setShowDeleteConfirm(false)} variant="danger" />}
        </div>
    );
}
