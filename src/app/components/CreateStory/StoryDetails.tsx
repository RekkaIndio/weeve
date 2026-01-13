import React from "react";
import { Type, AlignLeft, Hash, Loader } from "lucide-react";
import { CreateStoryFormState } from "./types";

interface StoryDetailsProps {
    formState: CreateStoryFormState;
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

    // hashtagInput: string;
    // onHashtagInputChange: (value: string) => void;
    // onAddHashtag: (tag?: string) => void;
    // onRemoveHashtag: (tag: string) => void;
    hashtagSuggestions: string[];
    isSearchingHashtags: boolean;
    onSelectHashtagSuggestion: (tag: string) => void;
    activeField: 'title' | 'description' | null;

    // Refs
    titleInputRef: React.RefObject<HTMLInputElement>;
}

const StoryDetails = ({
    formState,
    onTitleChange,
    onDescriptionChange,
    // hashtagInput,
    // onHashtagInputChange,
    // onAddHashtag,
    // onRemoveHashtag,
    hashtagSuggestions,
    isSearchingHashtags,
    onSelectHashtagSuggestion,
    titleInputRef,
    activeField,
}: StoryDetailsProps) => {
    return (
        <div className="space-y-4">
            <div className="text-left mb-2">
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
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 font-sans pl-1"
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
                        maxLength={60}
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
                {/* Autocomplete Dropdown for Title */}
                {activeField === 'title' && (hashtagSuggestions.length > 0 || isSearchingHashtags) && (
                    <div className="absolute left-0 top-full mt-2 w-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto ring-1 ring-white/10">
                        {isSearchingHashtags && (
                            <div className="flex items-center justify-center py-3 text-gray-500 text-sm">
                                <Loader className="w-4 h-4 animate-spin mr-2" />
                                Searching...
                            </div>
                        )}
                        {!isSearchingHashtags && hashtagSuggestions.length > 0 && (
                            <>
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
                    </div>
                )}
            </div>

            {/* Story Description Input */}
            <div>
                <label
                    htmlFor="description"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 font-sans pl-1"
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
                        maxLength={200}
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
                {/* Autocomplete Dropdown for Description */}
                {activeField === 'description' && (hashtagSuggestions.length > 0 || isSearchingHashtags) && (
                    <div className="absolute left-0 top-full mt-2 w-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto ring-1 ring-white/10">
                        {isSearchingHashtags && (
                            <div className="flex items-center justify-center py-3 text-gray-500 text-sm">
                                <Loader className="w-4 h-4 animate-spin mr-2" />
                                Searching...
                            </div>
                        )}
                        {!isSearchingHashtags && hashtagSuggestions.length > 0 && (
                            <>
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
                    </div>
                )}
            </div>

            <p className="text-xs text-gray-500 mb-2 font-sans pl-1">
                Add hashtags by typing #hashtags in the title or description.
            </p>

            <div className="flex flex-wrap gap-2">
                {(formState.hashtags || []).map((tag) => (
                    <div
                        key={tag}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 text-gray-200 rounded-full text-sm border border-gray-700/50"
                    >
                        <Hash className="w-3 h-3 text-[#EC1D99]" />
                        <span>{tag}</span>
                    </div>
                ))}
            </div>
            {/* </div>  Removed wrapper div */}
        </div>
    );
};

export default StoryDetails;
