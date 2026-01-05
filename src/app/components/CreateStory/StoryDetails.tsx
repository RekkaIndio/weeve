import React from "react";
import { Type, AlignLeft, Hash, Loader, X } from "lucide-react";
import { CreateStoryFormState } from "./types";

interface StoryDetailsProps {
    formState: CreateStoryFormState;
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

    // Hashtag props
    hashtagInput: string;
    onHashtagInputChange: (value: string) => void;
    onAddHashtag: (tag?: string) => void;
    onRemoveHashtag: (tag: string) => void;
    hashtagSuggestions: string[];
    showHashtagDropdown: boolean;
    setShowHashtagDropdown: (show: boolean) => void;
    isSearchingHashtags: boolean;
    onSelectHashtagSuggestion: (tag: string) => void;

    // Refs
    titleInputRef: React.RefObject<HTMLInputElement>;
    hashtagInputRef: React.RefObject<HTMLInputElement>;
}

const StoryDetails = ({
    formState,
    onTitleChange,
    onDescriptionChange,
    hashtagInput,
    onHashtagInputChange,
    onAddHashtag,
    onRemoveHashtag,
    hashtagSuggestions,
    showHashtagDropdown,
    setShowHashtagDropdown,
    isSearchingHashtags,
    onSelectHashtagSuggestion,
    titleInputRef,
    hashtagInputRef,
}: StoryDetailsProps) => {
    return (
        <div className="space-y-6">
            <div className="text-left mb-4">
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Type className="w-5 h-5 text-[#EC1D99]" />
                    Story Details
                </h2>
                <p className="text-gray-400 text-sm">Give your story a name and description</p>
            </div>

            {/* Story Title Input */}
            <div>
                <label
                    htmlFor="title"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
                >
                    Story Title <span className="text-[#EC1D99]">*</span>
                </label>
                <div className="relative group">
                    <input
                        id="title"
                        type="text"
                        value={formState.title}
                        ref={titleInputRef}
                        onChange={onTitleChange}
                        placeholder="Give your story a name..."
                        className="w-full px-4 py-4 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white text-lg font-semibold placeholder-gray-500 font-sans backdrop-blur-sm"
                        aria-describedby="title-counter"
                    />
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />
                </div>
                <p
                    className="text-xs text-gray-500 mt-2 font-sans text-right px-1"
                    id="title-counter"
                >
                    {formState.title.length}/60
                </p>
            </div>

            {/* Story Description Input */}
            <div>
                <label
                    htmlFor="description"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
                >
                    Description <span className="text-gray-500 font-normal normal-case ml-1">(Optional)</span>
                </label>
                <div className="relative group">
                    <textarea
                        id="description"
                        value={formState.description}
                        onChange={onDescriptionChange}
                        rows={3}
                        placeholder="What's this story about? Set the scene for your collaborators..."
                        className="w-full px-4 py-4 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white resize-none placeholder-gray-500 font-sans backdrop-blur-sm leading-relaxed"
                        aria-describedby="desc-counter"
                    />
                    <AlignLeft className="absolute left-4 top-5 w-5 h-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />
                </div>
                <p
                    className="text-xs text-gray-500 mt-2 text-right px-1"
                    id="desc-counter"
                >
                    {formState.description.length}/200
                </p>
            </div>

            {/* Hashtags Input */}
            <div className="relative">
                <label
                    htmlFor="hashtag"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
                >
                    Hashtags <span className="text-gray-500 font-normal normal-case ml-1">(Optional)</span>
                </label>
                <div className="flex gap-2 items-center relative">
                    <div className="relative flex-1 group">
                        <input
                            id="hashtag"
                            type="text"
                            value={hashtagInput}
                            onChange={(e) => onHashtagInputChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "," || e.key === " ") {
                                    e.preventDefault();
                                    onAddHashtag();
                                }
                                if (e.key === "Escape") {
                                    setShowHashtagDropdown(false);
                                }
                                if (e.key === "ArrowDown" && hashtagSuggestions.length > 0) {
                                    e.preventDefault();
                                    setShowHashtagDropdown(true);
                                }
                            }}
                            onFocus={() => setShowHashtagDropdown(true)}
                            onBlur={() => {
                                // Delay to allow click on dropdown
                                setTimeout(() => setShowHashtagDropdown(false), 200);
                            }}
                            placeholder="#adventure #friends"
                            className="w-full px-4 py-4 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white placeholder-gray-500 font-sans backdrop-blur-sm"
                            ref={hashtagInputRef}
                            autoComplete="off"
                        />
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />

                        {/* Hashtag Suggestions Dropdown */}
                        {showHashtagDropdown && (hashtagSuggestions.length > 0 || isSearchingHashtags) && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto ring-1 ring-white/10">
                                {isSearchingHashtags && (
                                    <div className="flex items-center justify-center py-3 text-gray-500 text-sm">
                                        <Loader className="w-4 h-4 animate-spin mr-2" />
                                        Searching...
                                    </div>
                                )}
                                {!isSearchingHashtags && hashtagSuggestions.length > 0 && (
                                    <>
                                        <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-800">
                                            Existing hashtags
                                        </div>
                                        {hashtagSuggestions.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    onSelectHashtagSuggestion(tag);
                                                }}
                                                className="w-full px-3 py-2.5 text-left text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                                            >
                                                <span className="text-[#EC1D99]">#</span>
                                                <span>{tag}</span>
                                            </button>
                                        ))}
                                    </>
                                )}
                                {!isSearchingHashtags && hashtagSuggestions.length === 0 && hashtagInput.trim() && (
                                    <div className="px-3 py-3 text-gray-500 text-sm text-center">
                                        No matching hashtags found. Press Enter to create a new one.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onAddHashtag()}
                        className="px-6 py-4 rounded-2xl bg-[#EC1D99] text-white font-bold hover:bg-[#D41C84] transition-colors shadow-lg shadow-[#EC1D99]/20"
                    >
                        Add
                    </button>
                </div>

                {/* Hashtag Chips */}
                {formState.hashtags && formState.hashtags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {formState.hashtags.map((tag) => (
                            <div
                                key={tag}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 text-gray-200 rounded-full text-sm border border-gray-700/50 group hover:border-[#EC1D99]/50 transition-colors"
                            >
                                <span>#{tag}</span>
                                <button
                                    onClick={() => onRemoveHashtag(tag)}
                                    className="text-gray-500 hover:text-white transition-colors font-bold group-hover:text-red-400"
                                    aria-label={`Remove ${tag}`}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryDetails;
