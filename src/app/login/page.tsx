"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const { setCurrentUser } = useStore();

    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("");

    const handleLogin = () => {
        if (!name) return;
        const user = {
            id: `guest-${Date.now()}`,
            name,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            tokens: 100,
        };
        setCurrentUser(user);
        router.push("/");
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
                </div>

                {/* Weaving Lines Animation */}
                <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                            <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
                            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
                            <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Line 1 */}
                    <path
                        d="M-100,50 Q 50,100 200,50 T 500,50 T 800,50 T 1100,50"
                        fill="none"
                        stroke="url(#grad1)"
                        strokeWidth="2"
                        className="animate-weave-1"
                    />

                    {/* Line 2 */}
                    <path
                        d="M-100,80 Q 50,30 200,80 T 500,80 T 800,80 T 1100,80"
                        fill="none"
                        stroke="url(#grad2)"
                        strokeWidth="2"
                        className="animate-weave-2"
                    />

                    {/* Line 3 */}
                    <path
                        d="M-100,20 Q 50,70 200,20 T 500,20 T 800,20 T 1100,20"
                        fill="none"
                        stroke="url(#grad1)"
                        strokeWidth="2"
                        className="animate-weave-3"
                    />
                </svg>
            </div>

            {/* Login Form */}
            <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
                <div className="mb-6">
                    <img
                        src="/weeve-logo.png"
                        alt="WeeVe Logo"
                        className="w-24 h-24 object-contain"
                    />
                </div>
                <h1 className="mb-8 text-center text-4xl font-bold text-white">
                    Welcome Back
                </h1>

                <div className="space-y-4">
                    {/* Social Logins */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleLogin()}
                            className="flex items-center justify-center gap-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 py-3 text-white hover:bg-white/20 transition-all active:scale-95"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                        <button
                            onClick={() => handleLogin()}
                            className="flex items-center justify-center gap-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 py-3 text-white hover:bg-white/20 transition-all active:scale-95"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.03 3.93-.74 1.33.18 2.24.74 2.85 1.69-2.5 1.52-2.12 4.4.26 5.53-.69 1.79-1.68 3.58-3.08 5.06M12.03 5.31c-.15-1.53.86-2.98 2.24-3.55.29 1.71-1.07 3.21-2.24 3.55z" />
                            </svg>
                            Apple
                        </button>
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/20"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or continue with</span>
                        <div className="flex-grow border-t border-white/20"></div>
                    </div>

                    <input
                        className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <input
                        className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Avatar URL (optional)"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    />

                    <button
                        onClick={handleLogin}
                        className="w-full rounded-lg bg-white text-black py-4 font-bold text-lg transition-all hover:bg-gray-100 active:scale-95 shadow-lg"
                    >
                        Log In
                    </button>

                    <p className="mt-6 text-center text-sm text-gray-300">
                        No account?{" "}
                        <a
                            href="/signup"
                            className="text-white font-semibold underline hover:text-gray-200 transition-colors"
                        >
                            Sign up
                        </a>
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }

                @keyframes weave {
                    0% { transform: translateX(-100%) translateY(0); }
                    50% { transform: translateX(0%) translateY(10px); }
                    100% { transform: translateX(100%) translateY(0); }
                }

                .animate-weave-1 {
                    animation: weave 8s linear infinite;
                    transform-origin: center;
                }
                .animate-weave-2 {
                    animation: weave 12s linear infinite;
                    animation-delay: -4s;
                    transform-origin: center;
                }
                 .animate-weave-3 {
                    animation: weave 10s linear infinite;
                    animation-delay: -2s;
                    transform-origin: center;
                }
            `}</style>
        </div>
    );
}
