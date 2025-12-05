"use client";

import { motion } from "framer-motion";

interface WeeveLinesProps {
    className?: string;
    color?: string;
}

export default function WeeveLines({ className = "", color = "#EC1D99" }: WeeveLinesProps) {
    return (
        <svg className={`absolute inset-0 w-full h-full pointer-events-none opacity-30 ${className}`}>
            <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0" />
                    <stop offset="50%" stopColor={color} stopOpacity="1" />
                    <stop offset="100%" stopColor="#purple-600" stopOpacity="0" />
                </linearGradient>
            </defs>
            <motion.path
                d="M 50% 50% L 20% 20%"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
            />
            <motion.path
                d="M 50% 50% L 80% 25%"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.7 }}
            />
            <motion.path
                d="M 50% 50% L 15% 70%"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.9 }}
            />
            <motion.path
                d="M 50% 50% L 85% 75%"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 1.1 }}
            />
        </svg>
    );
}

