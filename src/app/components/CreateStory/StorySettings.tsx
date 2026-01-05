import React from "react";
import { Hash } from "lucide-react";
import { CreateStoryFormState } from "./types";

interface StorySettingsProps {
    formState: CreateStoryFormState;
    setFormState: React.Dispatch<React.SetStateAction<CreateStoryFormState>>;
    currentUser?: {
        isBrand?: boolean;
        isInfluencer?: boolean;
        preferences?: Record<string, any>;
    };
    showAdvancedOptions: boolean;
    setShowAdvancedOptions: (show: boolean) => void;
}

const StorySettings = ({
    formState,
    setFormState,
    currentUser,
    showAdvancedOptions,
    setShowAdvancedOptions,
}: StorySettingsProps) => {
    return (
        <div className="space-y-6">
            <div className="text-left mb-2">
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-[#EC1D99]" />
                    Settings
                </h2>
                <p className="text-gray-400 text-sm">Configure advanced settings</p>
            </div>


            {/* Advanced Options */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="w-full flex items-center justify-between p-4 bg-gray-800/30 border border-white/5 rounded-2xl hover:bg-gray-800/50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-300 font-sans group-hover:text-white transition-colors">Advanced Options</span>
                        <span className="text-xs text-gray-500 font-medium bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
                            {[
                                formState.turnTimerHours && '⏰ Timer',
                                formState.scheduledFor && '📅 Scheduled',
                            ].filter(Boolean).join(', ') || 'Optional'}
                        </span>
                    </div>
                    <svg
                        className={`w-5 h-5 text-gray-500 group-hover:text-white transition-all duration-300 ${showAdvancedOptions ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showAdvancedOptions && (
                    <div className="mt-2 p-4 bg-gray-800/30 border border-white/5 rounded-2xl space-y-4 animate-fadeIn">
                        {/* Turn Timer - Hidden for Seed/Canon posts which use visibility days */}
                        {formState.postType !== 'seed' && formState.postType !== 'canon' && (
                            <>
                                <div>
                                    <label htmlFor="turn-timer" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1">
                                        Turn Timer
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="turn-timer"
                                            value={formState.turnTimerHours ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                setFormState(prev => ({ ...prev, turnTimerHours: value }));
                                            }}
                                            className="w-full px-4 py-4 pl-4 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white font-sans appearance-none"
                                        >
                                            <option value="">No limit</option>
                                            <option value="6">6 hours</option>
                                            <option value="12">12 hours</option>
                                            <option value="24">24 hours</option>
                                            <option value="48">48 hours</option>
                                            <option value="72">72 hours</option>
                                            <option value="168">1 week</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 px-1">
                                        How long each participant has to add their part
                                    </p>
                                </div>

                                <div className="h-px bg-white/5" />
                            </>
                        )}

                        {/* Allow Comments Toggle */}
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <div className="text-sm text-gray-300 font-bold font-sans">
                                    Allow comments
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Users can comment on this story
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formState.allowComments}
                                    onChange={() => {
                                        setFormState(prev => ({ ...prev, allowComments: !prev.allowComments }));
                                    }}
                                    className="sr-only peer"
                                />
                                <span
                                    className={`w-12 h-7 rounded-full transition-colors duration-300 ${formState.allowComments ? "bg-[#EC1D99]" : "bg-gray-700"}`}
                                >
                                    <span
                                        className={`block w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 ease-spring ${formState.allowComments ? "translate-x-5.5" : "translate-x-0.5"} translate-y-0.5`}
                                    ></span>
                                </span>
                            </label>
                        </div>

                        {/* Schedule Post - Brand Only */}
                        {currentUser?.isBrand && (
                            <>
                                <div className="h-px bg-white/5" />
                                <div>
                                    <label htmlFor="schedule-time" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1">
                                        Schedule Post
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            id="schedule-time"
                                            value={formState.scheduledFor || ''}
                                            onChange={(e) => {
                                                setFormState(prev => ({ ...prev, scheduledFor: e.target.value }));
                                            }}
                                            className="w-full px-4 py-4 pl-4 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white font-sans appearance-none [&::-webkit-calendar-picker-indicator]:invert"
                                        />
                                        {!formState.scheduledFor && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 px-1">
                                        Set a future date and time to publish this story
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StorySettings;
