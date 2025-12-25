import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { type TextStyle, type Contribution } from "@/lib/store";

export const EMPTY_CONTRIBUTIONS: Contribution[] = [];

export const FONT_OPTIONS = [
    { label: "Sans", value: "'Inter', 'Helvetica Neue', sans-serif" },
    { label: "Serif", value: "'Playfair Display', 'Georgia', serif" },
    { label: "Mono", value: "'Space Mono', 'Courier New', monospace" },
    { label: "Script", value: "'Pacifico', 'Brush Script MT', cursive" },
    { label: "Display", value: "'Bebas Neue', 'Impact', sans-serif" },
] as const;

export const FONT_SIZE_OPTIONS = [18, 24, 32, 40, 48, 56] as const;

export const TEXT_COLOR_OPTIONS = [
    "#FFFFFF",
    "#EC1D99",
    "#FFD166",
    "#06D6A0",
    "#118AB2",
    "#EF476F",
    "#F4F1DE",
] as const;

export const BACKGROUND_OPTIONS = [
    "transparent",
    "rgba(0,0,0,0.6)",
    "rgba(236,29,153,0.25)",
    "rgba(255,209,102,0.25)",
    "rgba(17,138,178,0.25)",
    "rgba(244,241,222,0.35)",
] as const;

export const ALIGN_OPTIONS: Array<{ value: TextStyle["textAlign"]; icon: typeof AlignLeft }> = [
    { value: "left", icon: AlignLeft },
    { value: "center", icon: AlignCenter },
    { value: "right", icon: AlignRight },
];

export const DEFAULT_TEXT_STYLE: TextStyle = {
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    fontSize: 28,
    textColor: "#FFFFFF",
    backgroundColor: "transparent",
    textAlign: "center",
};
