import Link from "next/link";
import NextImage from "next/image";

export default function MarketingFooter() {
    return (
        <footer className="border-t border-white/10 py-12 bg-black text-white">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                    <NextImage src="/weeve-logo.png" alt="Weeve Logo" width={56} height={56} className="w-14 h-14 rounded-xl" />
                    <span className="font-bold text-2xl">Weeve</span>
                </div>
                <div className="text-sm text-gray-600">
                    © 2024 Weeve Inc. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
