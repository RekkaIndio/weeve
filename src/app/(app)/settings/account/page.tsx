"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Mail, Phone, Globe, Trash2, Loader, CheckCircle, XCircle } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

export default function AccountPage() {
    const router = useRouter();
    const { currentUser } = useStore();

    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [initialPhone, setInitialPhone] = useState<string>("");
    const [region, setRegion] = useState<string>("");

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadAccountData = async () => {
            try {
                // Get Auth Data (Email, Phone)
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) throw error;

                if (user) {
                    setEmail(user.email || "");
                    setPhone(user.phone || "");
                    setInitialPhone(user.phone || "");
                }

                // Get Region/Timezone
                try {
                    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    setRegion(timezone);
                } catch (e) {
                    setRegion("Unknown");
                }

            } catch (err) {
                console.error("Failed to load account data:", err);
                console.error("Failed to load account information");
            } finally {
                setIsLoading(false);
            }
        };

        loadAccountData();
    }, []);

    const handleSavePhone = async () => {
        if (phone === initialPhone) return;

        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                phone: phone
            });

            if (error) throw error;

            setInitialPhone(phone);
            // toast removed
        } catch (err: any) {
            console.error("Failed to update phone:", err);
            console.error(err.message || "Failed to update phone number");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg ml-2">Account Information</h1>
            </div>

            <div className="p-6 space-y-8">
                {/* Email Section (Read-only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email Address
                    </label>
                    <div className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed">
                        {email || "No email linked"}
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">
                        Email address cannot be changed directly.
                    </p>
                </div>

                {/* Phone Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Phone Number
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1234567890"
                            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EC1D99] transition-colors"
                        />
                    </div>
                    {phone !== initialPhone && (
                        <div className="mt-2 flex justify-end">
                            <button
                                onClick={handleSavePhone}
                                disabled={isSaving}
                                className="px-4 py-2 bg-[#EC1D99] rounded-lg text-sm font-bold text-white hover:bg-[#EC1D99]/90 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Update Phone"}
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-gray-600 mt-1.5">
                        Include country code (e.g., +1 for US).
                    </p>
                </div>

                {/* Region Section (Read-only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Region / Timezone
                    </label>
                    <div className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-gray-400">
                        {region}
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">
                        Detected from your device settings.
                    </p>
                </div>

                {/* Delete Account Section */}
                <div className="pt-8 border-t border-gray-800">
                    <button
                        onClick={() => router.push('/settings/delete-account')}
                        className="w-full p-4 bg-transparent border border-red-900/30 rounded-xl flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-900/10 transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                        Delete Account
                    </button>
                    <p className="text-center text-xs text-gray-600 mt-2">
                        Permanently delete your account and all data.
                    </p>
                </div>
            </div>
        </div>
    );
}
