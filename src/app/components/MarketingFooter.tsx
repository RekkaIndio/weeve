import Link from "next/link";
import NextImage from "next/image";

export default function MarketingFooter() {
    return (
        <footer className="border-t border-white/10 py-12 bg-black text-white">
            <div className="max-w-7xl mx-auto px-6">
                {/* Main footer content */}
                <div className="flex flex-col md:flex-row items-start justify-between gap-12">
                    {/* Logo and description */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <NextImage src="/weeve-logo.png" alt="Weeve Logo" width={56} height={56} className="w-14 h-14 rounded-xl" />
                            <span className="font-bold text-2xl">Weeve</span>
                        </div>
                        <p className="text-sm text-gray-400 max-w-xs">
                            Collaborative storytelling for the next generation.
                        </p>
                    </div>

                    {/* Links sections */}
                    <div className="flex flex-wrap gap-12 md:gap-16">
                        {/* Legal */}
                        <div className="flex flex-col gap-3">
                            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Legal</h4>
                            <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                                Terms & Conditions
                            </Link>
                        </div>

                        {/* Company */}
                        <div className="flex flex-col gap-3">
                            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Company</h4>
                            <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
                                Contact Us
                            </Link>
                            <Link href="/help" className="text-sm text-gray-400 hover:text-white transition-colors">
                                Help & Support
                            </Link>
                        </div>

                        {/* Social */}
                        <div className="flex flex-col gap-3">
                            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Connect</h4>
                            <a
                                href="https://www.linkedin.com/company/tryweeve"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                                LinkedIn
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-400">
                        © {new Date().getFullYear()} Weeve Inc. All rights reserved.
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
                            Terms
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
