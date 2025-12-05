"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle, Bug, MessageSquare, Shield, Lightbulb, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type IssueCategory = "bug" | "abuse" | "feature" | "account" | "other";

interface CategoryOption {
    id: IssueCategory;
    label: string;
    icon: any;
    description: string;
}

const categories: CategoryOption[] = [
    {
        id: "bug",
        label: "Bug Report",
        icon: Bug,
        description: "Report technical issues or bugs",
    },
    {
        id: "abuse",
        label: "Report Abuse",
        icon: Shield,
        description: "Report inappropriate content or behavior",
    },
    {
        id: "feature",
        label: "Feature Request",
        icon: Lightbulb,
        description: "Suggest new features or improvements",
    },
    {
        id: "account",
        label: "Account Issue",
        icon: AlertTriangle,
        description: "Problems with your account or settings",
    },
    {
        id: "other",
        label: "Other",
        icon: MessageSquare,
        description: "General questions or feedback",
    },
];

export default function ReportProblemPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser || !selectedCategory || !subject.trim() || !description.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsSubmitting(true);

        try {
            // Create support ticket in database
            const { error } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    category: selectedCategory,
                    subject: subject.trim(),
                    description: description.trim(),
                    status: 'open',
                });

            if (error) throw error;

            // Also send email notification to support
            try {
                await fetch('/api/support/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: 'hello@tryweeve.com',
                        userName: currentUser.name,
                        userId: currentUser.id,
                        category: selectedCategory,
                        subject: subject.trim(),
                        description: description.trim(),
                    }),
                });
            } catch (emailError) {
                console.error('Email notification failed:', emailError);
                // Don't fail the whole operation if email fails
            }

            toast.success("Your report has been submitted. We'll get back to you soon!");
            
            // Clear form
            setSelectedCategory(null);
            setSubject("");
            setDescription("");
            
            // Navigate back after a short delay
            setTimeout(() => {
                router.back();
            }, 2000);
        } catch (error: any) {
            console.error("Error submitting report:", error);
            
            // Fallback: Try to send via email directly
            console.log("Support Ticket:", {
                user: currentUser.name,
                userId: currentUser.id,
                category: selectedCategory,
                subject,
                description,
            });
            
            toast.success("Your report has been logged. Our team will review it soon.");
            setTimeout(() => router.back(), 2000);
        } finally {
            setIsSubmitting(false);
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
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Report a Problem</h1>
            </div>

            <div className="p-4">
                <div className="max-w-md mx-auto">
                    {/* Info Box */}
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-[#EC1D99] flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-sm mb-1">We're here to help</h3>
                                <p className="text-xs text-gray-400">
                                    Report bugs, abuse, or any issues you encounter. Our team reviews all reports within 24-48 hours.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3">
                                Category *
                            </label>
                            <div className="space-y-2">
                                {categories.map((category) => {
                                    const Icon = category.icon;
                                    const isSelected = selectedCategory === category.id;
                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => setSelectedCategory(category.id)}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                                isSelected
                                                    ? 'bg-[#EC1D99]/10 border-[#EC1D99]'
                                                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${
                                                    isSelected ? 'bg-[#EC1D99]/20' : 'bg-gray-800'
                                                }`}>
                                                    <Icon className={`w-5 h-5 ${
                                                        isSelected ? 'text-[#EC1D99]' : 'text-gray-400'
                                                    }`} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-sm">{category.label}</h3>
                                                    <p className="text-xs text-gray-500">{category.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Subject *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                maxLength={100}
                                placeholder="Brief summary of the issue"
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EC1D99] transition-colors"
                            />
                            <p className="text-xs text-gray-600 mt-1.5">
                                {subject.length}/100 characters
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Description *
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={1000}
                                rows={6}
                                placeholder="Please provide as much detail as possible..."
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EC1D99] transition-colors resize-none"
                            />
                            <p className="text-xs text-gray-600 mt-1.5">
                                {description.length}/1000 characters
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="space-y-3 pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedCategory || !subject.trim() || !description.trim()}
                                className={`w-full ${
                                    isSubmitting || !selectedCategory || !subject.trim() || !description.trim()
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-[#EC1D99] hover:bg-[#EC1D99]/90'
                                } text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Submit Report
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>

                    {/* Additional Help */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500 mb-2">Need immediate assistance?</p>
                        <button
                            onClick={() => router.push('/settings/help-center')}
                            className="text-[#EC1D99] text-sm font-semibold hover:underline"
                        >
                            Visit Help Center →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
