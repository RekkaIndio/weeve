"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, User, Bell, Lock, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
    const router = useRouter();
    const { currentUser, logoutUser } = useStore();

    const handleLogout = () => {
        logoutUser();
        router.push('/login');
    };

    const sections = [
        {
            title: "Account",
            items: [
                { label: "Edit Profile", icon: User, action: () => console.log("Edit Profile") },
                { label: "Change Password", icon: Lock, action: () => console.log("Change Password") },
            ]
        },
        {
            title: "Notifications",
            items: [
                { label: "Push Notifications", icon: Bell, toggle: true },
                { label: "Email Alerts", icon: Bell, toggle: true },
            ]
        },
        {
            title: "Privacy",
            items: [
                { label: "Account Privacy", icon: Lock, toggle: true },
                { label: "Blocked Users", icon: User, action: () => console.log("Blocked Users") },
            ]
        },
        {
            title: "Support",
            items: [
                { label: "Help Center", icon: HelpCircle, action: () => console.log("Help Center") },
                { label: "Report a Problem", icon: HelpCircle, action: () => console.log("Report a Problem") },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Settings</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Profile Preview */}
                <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl">
                    <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-16 h-16 rounded-full border-2 border-gray-700"
                    />
                    <div>
                        <h2 className="font-bold text-lg">{currentUser.name}</h2>
                        <p className="text-sm text-gray-400">@{currentUser.name.toLowerCase().replace(' ', '_')}</p>
                    </div>
                </div>

                {sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
                            {section.title}
                        </h3>
                        <div className="bg-gray-900 rounded-xl overflow-hidden">
                            {section.items.map((item, itemIdx) => (
                                <div
                                    key={itemIdx}
                                    className={`flex items-center justify-between p-4 ${itemIdx !== section.items.length - 1 ? 'border-b border-gray-800' : ''
                                        } ${item.action ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}`}
                                    onClick={item.action}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-gray-800 text-gray-400">
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium">{item.label}</span>
                                    </div>

                                    {item.toggle ? (
                                        <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer bg-[#EC1D99]">
                                            <span className="absolute left-6 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform translate-x-0"></span>
                                        </div>
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button onClick={handleLogout} className="w-full p-4 bg-gray-900 rounded-xl flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-gray-800 transition-colors mt-8">
                    <LogOut className="w-5 h-5" />
                    Log Out
                </button>

                <div className="text-center text-xs text-gray-600 mt-8 pb-8">
                    Weeve v1.0.0
                </div>
            </div>
        </div>
    );
}
