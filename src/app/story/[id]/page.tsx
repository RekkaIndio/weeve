"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { ChevronLeft, Plus, Play, Pause, MoreVertical, Video, Camera, Type, X, Loader2, Edit2 } from "lucide-react";
import EditStoryModal from "@/app/components/EditStoryModal";

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
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [textContribution, setTextContribution] = useState("");

    // Edit Story States
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    if (!story) return <div>Story not found</div>;

    const activeSegment = story.contributions[activeIndex];
    const isMyTurn = story.currentTurnUserId === currentUser.id;

    const handleNext = () => {
        if (activeIndex < story.contributions.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            setIsPlaying(false); // End of story
        }
    };

    const handleStitchOption = (mode: 'video' | 'image' | 'text') => {
        setStitchMode(mode);
        setShowStitchMenu(false);
        if (mode === 'video') {
            // Simulate recording start
            setIsRecording(true);
            setTimeout(() => {
                setIsRecording(false);
                simulateUpload('video');
            }, 3000); // Record for 3 seconds
        } else if (mode === 'image') {
            simulateUpload('image');
        }
    };

    const simulateUpload = (type: 'video' | 'image' | 'text', content?: string) => {
        setIsUploading(true);
        setUploadProgress(0);

        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);

            if (progress >= 100) {
                clearInterval(interval);
                completeContribution(type, content);
            }
        }, 200);
    };

    const completeContribution = (type: 'video' | 'image' | 'text', content?: string) => {
        let mediaUrl = undefined;
        let caption = content || "Just added a new part! ✨";

        if (type === 'video') {
            mediaUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
            caption = "Check out this view! 🎥";
        } else if (type === 'image') {
            mediaUrl = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop";
            caption = "Captured this moment 📸";
        }

        addContribution(story.id, caption, type, mediaUrl);
        setIsUploading(false);
        setStitchMode(null);
        // Auto-play the new segment
        setActiveIndex(story.contributions.length);
        setIsPlaying(true);
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!textContribution.trim()) return;
        simulateUpload('text', textContribution);
    };

    return (
        <div className="h-full flex flex-col bg-black text-white relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
                <button onClick={() => router.back()} className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-sm tracking-wide uppercase opacity-80 font-sans">Weeve Timeline</h1>
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
                            // Text Only Fallback
                            <div className="w-full h-full flex items-center justify-center bg-[#EC1D99] p-8 text-center">
                                <p className="text-2xl font-bold">{activeSegment.content}</p>
                                <AutoAdvance onComplete={handleNext} isPlaying={isPlaying} duration={3000} />
                            </div>
                        )}

                        {/* Caption Overlay */}
                        <div className="absolute bottom-32 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-[#EC1D99] flex items-center justify-center text-xs font-bold ring-2 ring-black">
                                    {activeSegment.userName[0]}
                                </div>
                                <span className="font-bold text-shadow-sm font-sans">{activeSegment.userName}</span>
                            </div>
                            <p className="text-lg font-medium leading-snug text-shadow-sm font-sans">{activeSegment.content}</p>
                        </div>
                    </>
                ) : (
                    <div className="text-gray-500">No segments yet. Be the first!</div>
                )}

                {/* Recording Overlay */}
                {isRecording && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center animate-pulse">
                            <div className="w-16 h-16 bg-red-500 rounded-full"></div>
                        </div>
                        <p className="mt-4 font-bold text-red-500">Recording...</p>
                    </div>
                )}

                {/* Uploading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-[#EC1D99] animate-spin mb-4" />
                        <p className="font-bold">Uploading... {uploadProgress}%</p>
                    </div>
                )}
            </div>

            {/* Timeline Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl p-4 pb-8 border-t border-white/10 z-30 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                {/* Timeline Nodes */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide px-2">
                    {story.contributions.map((c, idx) => (
                        <button
                            key={c.id}
                            onClick={() => { setActiveIndex(idx); setIsPlaying(true); }}
                            className={`shrink-0 w-12 h-12 rounded-full border-2 overflow-hidden transition-all duration-300 relative ${idx === activeIndex ? 'border-[#EC1D99] scale-110 ring-2 ring-[#EC1D99]/30 shadow-[0_0_15px_rgba(236,29,153,0.5)]' : 'border-gray-700 opacity-50 hover:opacity-80 hover:scale-105'
                                }`}
                        >
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userName}`}
                                className="w-full h-full object-cover bg-gray-800"
                            />
                            {idx < story.contributions.length - 1 && (
                                <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-gray-700 -z-10"></div>
                            )}
                        </button>
                    ))}

                    {isMyTurn && (
                        <button
                            onClick={() => setShowStitchMenu(true)}
                            className="shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400 hover:text-[#EC1D99] hover:border-[#EC1D99] transition-colors"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Action Button */}
                {isMyTurn ? (
                    <button
                        onClick={() => setShowStitchMenu(true)}
                        className="w-full bg-[#EC1D99] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-[#D41C84] transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Stitch Your Part
                    </button>
                ) : (
                    <div className="text-center text-xs text-gray-500 py-2">
                        Waiting for {story.participants.find(p => p.id === story.currentTurnUserId)?.name} to stitch...
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
                            onClick={() => setStitchMode('text')}
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

            {/* Text Input Modal */}
            {stitchMode === 'text' && !showStitchMenu && (
                <div className="absolute inset-0 bg-black z-50 flex flex-col p-6">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setStitchMode(null)} className="text-white">Cancel</button>
                        <h2 className="font-bold">Write Caption</h2>
                        <button onClick={handleTextSubmit} className="text-[#EC1D99] font-bold">Post</button>
                    </div>
                    <textarea
                        value={textContribution}
                        onChange={(e) => setTextContribution(e.target.value)}
                        placeholder="What's happening?"
                        className="w-full h-64 bg-gray-900 rounded-xl p-4 text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#EC1D99]"
                        autoFocus
                    />
                </div>
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
