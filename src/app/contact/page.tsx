"use client";

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Mail, MessageSquare, Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
    const router = useRouter()
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formState),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to send message')
            }

            setIsSubmitted(true)
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormState(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    return (
        <main className="min-h-screen bg-black text-gray-200 p-8 md:p-16 font-sans">
            <div className="max-w-3xl mx-auto relative">
                <button
                    onClick={() => router.back()}
                    className="fixed top-8 right-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50 text-white"
                    aria-label="Close"
                >
                    <X className="w-6 h-6" />
                </button>

                <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
                <p className="text-lg text-gray-400 mb-12">
                    Have a question, feedback, or just want to say hello? We'd love to hear from you.
                </p>

                {isSubmitted ? (
                    <div className="bg-gradient-to-r from-[#EC1D99]/20 to-purple-500/20 border border-[#EC1D99]/30 rounded-2xl p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-[#EC1D99] mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Message Sent!</h2>
                        <p className="text-gray-300 mb-6">
                            Thank you for reaching out. We'll get back to you within 24-48 hours.
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Return to Previous Page
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Contact Form */}
                        <div className="bg-white/5 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <MessageSquare className="w-6 h-6 text-[#EC1D99]" />
                                <h2 className="text-xl font-bold text-white">Send us a message</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                                            Your Name
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formState.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                            Your Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formState.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                                        Subject
                                    </label>
                                    <select
                                        id="subject"
                                        name="subject"
                                        value={formState.subject}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors"
                                    >
                                        <option value="" className="bg-gray-900">Select a topic</option>
                                        <option value="general" className="bg-gray-900">General Inquiry</option>
                                        <option value="feedback" className="bg-gray-900">Feedback & Suggestions</option>
                                        <option value="partnership" className="bg-gray-900">Partnership Opportunities</option>
                                        <option value="press" className="bg-gray-900">Press & Media</option>
                                        <option value="other" className="bg-gray-900">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formState.message}
                                        onChange={handleChange}
                                        required
                                        rows={5}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors resize-none"
                                        placeholder="Tell us what's on your mind..."
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 text-white font-bold rounded-lg hover:from-[#d4178a] hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Direct Contact */}
                        <div className="bg-white/5 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Mail className="w-6 h-6 text-[#EC1D99]" />
                                <h2 className="text-xl font-bold text-white">Or email us directly</h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-1">General Inquiries</p>
                                    <a href="mailto:hello@tryweeve.com" className="text-[#EC1D99] hover:underline font-medium">
                                        hello@tryweeve.com
                                    </a>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-1">Partnerships</p>
                                    <a href="mailto:partners@tryweeve.com" className="text-[#EC1D99] hover:underline font-medium">
                                        partners@tryweeve.com
                                    </a>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-1">Press & Media</p>
                                    <a href="mailto:press@tryweeve.com" className="text-[#EC1D99] hover:underline font-medium">
                                        press@tryweeve.com
                                    </a>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-1">Legal</p>
                                    <a href="mailto:legal@tryweeve.com" className="text-[#EC1D99] hover:underline font-medium">
                                        legal@tryweeve.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-16 pt-8 border-t border-white/10 text-center">
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Close and Return
                    </button>
                </div>
            </div>
        </main>
    )
}
