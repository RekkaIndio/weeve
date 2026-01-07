"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, DollarSign, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { getCollabSettings, updateCollabSettings, formatPrice, parseToCents } from "@/lib/collaborations";

export default function CollaborationSettingsPage() {
    const router = useRouter();
    const { currentUser, setCurrentUser } = useStore();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [collabEnabled, setCollabEnabled] = useState(true);
    const [priceInput, setPriceInput] = useState("");
    const [priceCents, setPriceCents] = useState<number>(0);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        (async () => {
            try {
                const settings = await getCollabSettings(currentUser.id);
                setCollabEnabled(settings.enabled);
                if (settings.priceCents && settings.priceCents > 0) {
                    setPriceCents(settings.priceCents);
                    setPriceInput((settings.priceCents / 100).toFixed(2));
                } else {
                    setPriceCents(0);
                    setPriceInput("");
                }
            } catch (err) {
                console.error('[CollabSettings] Failed to load settings:', err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [currentUser]);

    const handlePriceChange = (value: string) => {
        // Only allow numbers and one decimal point
        const cleaned = value.replace(/[^0-9.]/g, '');
        // Ensure only one decimal point
        const parts = cleaned.split('.');
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 2) return;

        setPriceInput(cleaned);
        setPriceCents(parseToCents(cleaned));
        setHasChanges(true);
    };

    const handleToggle = () => {
        setCollabEnabled(!collabEnabled);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!currentUser || isSaving) return;

        setIsSaving(true);
        try {
            const success = await updateCollabSettings(currentUser.id, {
                enabled: collabEnabled,
                priceCents: priceCents > 0 ? priceCents : null
            });

            if (success) {
                setCurrentUser({
                    ...currentUser,
                    collabEnabled,
                    collabPriceCents: priceCents > 0 ? priceCents : undefined
                });
                setHasChanges(false);
                router.back();
            }
        } catch (err) {
            console.error('[CollabSettings] Failed to save settings:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
                <div className="flex items-center justify-between max-w-xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full border border-gray-700 hover:bg-gray-900 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold">Collaboration Settings</h1>
                    </div>
                    {hasChanges && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-[#EC1D99] text-white font-bold rounded-lg hover:bg-[#D41C84] disabled:opacity-50 transition-colors"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                </div>
            </header>

            <main className="px-4 py-6 max-w-xl mx-auto space-y-6">
                {isLoading ? (
                    <div className="text-center text-gray-500 py-12">Loading settings...</div>
                ) : (
                    <>
                        {/* Enable/Disable Toggle */}
                        <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Accept Collaboration Requests</h3>
                                        <p className="text-sm text-gray-400">Allow other creators to collaborate with you</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggle}
                                    className={`relative w-12 h-7 rounded-full transition-colors ${collabEnabled ? 'bg-purple-500' : 'bg-gray-700'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${collabEnabled ? 'left-6' : 'left-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Pricing Section */}
                        {collabEnabled && (
                            <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Collaboration Price</h3>
                                        <p className="text-sm text-gray-400">Set your rate per collaboration request</p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={priceInput}
                                        onChange={(e) => handlePriceChange(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 pl-8 text-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>

                                {priceCents > 0 && (
                                    <p className="text-sm text-gray-400">
                                        Creators will pay <span className="text-purple-400 font-semibold">{formatPrice(priceCents)}</span> to request a collaboration with you
                                    </p>
                                )}

                                {priceCents === 0 && (
                                    <p className="text-sm text-gray-400">
                                        Leave empty for free collaborations
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-purple-500/10 rounded-2xl p-4 border border-purple-500/30">
                            <div className="flex gap-3">
                                <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-purple-200 space-y-2">
                                    <p><strong>How it works:</strong></p>
                                    <ul className="list-disc list-inside space-y-1 text-purple-200/80">
                                        <li>Other creators can send you collaboration requests from your profile</li>
                                        <li>If you set a price, they pay when sending the request</li>
                                        <li>You keep the payment when you accept, or it's refunded if you decline</li>
                                        <li>Collaboration stories are always public once complete</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
