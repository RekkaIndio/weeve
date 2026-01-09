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
                </div>
            </header>

            <main className="px-4 py-6 max-w-xl mx-auto space-y-6">
                {/* Coming Soon State */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
                        <Users className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                        <p className="text-gray-400 max-w-sm mx-auto">
                            We're working hard to bring you the best collaboration experience. Stay tuned for updates!
                        </p>
                    </div>

                    {/* Disabled Toggle for visual context */}
                    <div className="flex items-center justify-between bg-black/40 rounded-xl p-4 mt-6 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-500">Accept Requests</h3>
                                <p className="text-sm text-gray-600">Coming soon</p>
                            </div>
                        </div>
                        <div className="w-12 h-7 rounded-full bg-gray-800 relative">
                            <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-gray-600" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
