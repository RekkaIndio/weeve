import { type Contribution, type User } from "@/lib/store";

export interface PhotoSticker {
    id: string;
    emoji: string;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    scale: number;
}

export interface TimelineEntry {
    type: 'contribution' | 'empty';
    contribution?: Contribution;
    participant?: User | null;
    index?: number;
    occurrence?: number;
    isLatestForUser?: boolean;
    position: number;
    sortPosition?: number;
}

export interface MediaPickerConfig {
    type: 'image' | 'video';
    heading: string;
    takeLabel: string;
    uploadLabel: string;
    TakeIcon: React.ElementType;
    UploadIcon: React.ElementType;
}

export interface MediaDraft {
    type: 'video' | 'image';
    file?: File;
    previewUrl?: string;
    trimStart?: number; // Video trim start point in seconds
    trimEnd?: number;   // Video trim end point in seconds
}
