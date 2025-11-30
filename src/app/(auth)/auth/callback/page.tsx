"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
                // Successful sign in, redirect to home
                router.replace("/");
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
            <div className="w-12 h-12 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-1">
                <p className="text-lg font-semibold">Authenticating with Google</p>
                <p className="text-sm text-gray-300">This will only take a moment...</p>
            </div>
        </div>
    );
}
