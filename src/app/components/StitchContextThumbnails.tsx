"use client";

import { useState } from "react";
import { Contribution } from "@/lib/store";
import { Video, Type, Pencil, Camera, X, Mic } from "lucide-react";
import { VideoThumbnail } from "@/app/(app)/story/[id]/components/VideoThumbnail";
import { useKeyboard } from "@/hooks/useKeyboard";

interface StitchContextThumbnailsProps {
    contributions: Contribution[];
    onThumbnailClick?: (index: number) => void;
    className?: string;
    inline?: boolean; // When true, renders without fixed positioning (for use inside other modals)
}

/**
 * Horizontal thumbnail strip at the bottom showing existing story contributions.
 * Displayed during stitch composition to give users context about what's already in the story.
 * Click on a thumbnail to see a larger preview.
 */
export default function StitchContextThumbnails({ contributions, onThumbnailClick, className, inline }: StitchContextThumbnailsProps) {
    const [previewContribution, setPreviewContribution] = useState<Contribution | null>(null);
    const isKeyboardOpen = useKeyboard();

    if (contributions.length === 0) return null;

    const getMediaTypeIcon = (mediaType: string) => {
        switch (mediaType) {
            case 'video':
                return <Video className="w-4 h-4 text-white" />;
            case 'image':
                return <Camera className="w-4 h-4 text-white" />;
            case 'drawing':
                return <Pencil className="w-4 h-4 text-white" />;
            case 'text':
                return <Type className="w-4 h-4 text-white" />;
            case 'audio':
                return <Mic className="w-4 h-4 text-white" />;
            default:
                return null;
        }
    };

    const handleClick = (contribution: Contribution, index: number) => {
        // Open preview
        setPreviewContribution(contribution);
        // Also call the optional callback if provided
        onThumbnailClick?.(index);
    };

    const closePreview = () => {
        setPreviewContribution(null);
    };

    // When keyboard is open, position at bottom of viewport (which shrinks when keyboard opens)
    // When keyboard is closed, use the default className positioning
    const positionClass = isKeyboardOpen
        ? 'bottom-2' // Small offset from bottom of shrunken viewport
        : (className || 'bottom-[70px]');

    // Check if className contains a z-index override
    const hasZIndexOverride = className?.includes('z-[');
    const zIndexClass = hasZIndexOverride ? '' : 'z-[100]';

    // Container class depends on inline mode
    const containerClass = inline
        ? 'relative w-full pointer-events-auto'
        : `fixed left-0 right-0 ${zIndexClass} pointer-events-auto transition-all duration-200 ${positionClass}`;

    return (
        <>
            <div className={containerClass}>
                {/* Thumbnail strip - horizontal scrolling */}
                <div
                    className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {contributions.map((contribution, index) => (
                        <button
                            key={contribution.id}
                            onClick={() => handleClick(contribution, index)}
                            className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden border-2 border-[#EC1D99]/70 hover:border-[#EC1D99] active:scale-95 transition-all bg-gray-800 group"
                        >
                            {/* Thumbnail content */}
                            {contribution.mediaUrl && (contribution.mediaType === 'image' || contribution.mediaType === 'drawing') ? (
                                <img
                                    src={contribution.mediaUrl}
                                    alt={`Part ${index + 1}`}
                                    className="w-full h-full object-cover pointer-events-none"
                                    draggable={false}
                                />
                            ) : contribution.mediaUrl && contribution.mediaType === 'video' ? (
                                <>
                                    <VideoThumbnail
                                        src={contribution.mediaUrl}
                                        className="w-full h-full object-cover pointer-events-none"
                                    />
                                    {/* Video icon indicator in corner */}
                                    <div className="absolute bottom-0.5 left-0.5 bg-black/50 rounded p-0.5">
                                        <Video className="w-3 h-3 text-white" />
                                    </div>
                                </>
                            ) : (
                                /* Text-only or fallback */
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                    {getMediaTypeIcon(contribution.mediaType)}
                                </div>
                            )}

                            {/* Part number badge */}
                            <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded-md px-1 py-0.5">
                                <span className="text-[9px] font-bold text-white">{index + 1}</span>
                            </div>

                            {/* Media type indicator (top-left) */}
                            <div className="absolute top-0.5 left-0.5 bg-black/50 rounded-md p-0.5">
                                {getMediaTypeIcon(contribution.mediaType)}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview Modal */}
            {previewContribution && (
                <div
                    className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={closePreview}
                >
                    {/* Close button */}
                    <button
                        onClick={closePreview}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Part indicator */}
                    <div className="absolute top-4 left-4 bg-black/70 rounded-lg px-3 py-1.5">
                        <span className="text-sm font-bold text-white">
                            Part {contributions.findIndex(c => c.id === previewContribution.id) + 1}
                        </span>
                    </div>

                    {/* Preview content */}
                    <div className="max-w-full max-h-[80vh] rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        {previewContribution.mediaUrl && (previewContribution.mediaType === 'image' || previewContribution.mediaType === 'drawing') ? (
                            <img
                                src={previewContribution.mediaUrl}
                                alt="Preview"
                                className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                            />
                        ) : previewContribution.mediaUrl && previewContribution.mediaType === 'video' ? (
                            <video
                                src={previewContribution.mediaUrl}
                                className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                                controls
                                autoPlay
                                playsInline
                            />
                        ) : (
                            /* Text-only preview */
                            <div className="w-80 h-80 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl">
                                <div className="text-center p-6">
                                    {getMediaTypeIcon(previewContribution.mediaType)}
                                    <p className="mt-4 text-white text-lg">{previewContribution.content || 'Text stitch'}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tap anywhere to close hint */}
                    <div className="absolute bottom-6 left-0 right-0 text-center">
                        <span className="text-xs text-gray-400">Tap anywhere to close</span>
                    </div>
                </div>
            )}
        </>
    );
}
