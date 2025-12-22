"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
    aspect?: number;
}

function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect?: number,
) {
    if (aspect) {
        return centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90,
                },
                aspect,
                mediaWidth,
                mediaHeight,
            ),
            mediaWidth,
            mediaHeight,
        );
    }
    // Free aspect - default to 90% of the image
    return {
        unit: '%' as const,
        x: 5,
        y: 5,
        width: 90,
        height: 90,
    };
}

const ImageCropper = ({ imageSrc, onCropComplete, onCancel, aspect }: ImageCropperProps) => {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isProcessing, setIsProcessing] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspect));
    }

    async function handleSave() {
        if (!completedCrop || !imgRef.current) return;

        setIsProcessing(true);
        try {
            const image = imgRef.current;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('No 2d context');
            }

            // Calculate the scale between natural size and displayed size
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;

            // Set canvas size to the cropped area size
            canvas.width = completedCrop.width * scaleX;
            canvas.height = completedCrop.height * scaleY;

            ctx.drawImage(
                image,
                completedCrop.x * scaleX,
                completedCrop.y * scaleY,
                completedCrop.width * scaleX,
                completedCrop.height * scaleY,
                0,
                0,
                canvas.width,
                canvas.height,
            );

            // Convert canvas to blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        onCropComplete(blob);
                    }
                    setIsProcessing(false);
                },
                'image/jpeg',
                0.9
            );
        } catch (e) {
            console.error('Error cropping image:', e);
            setIsProcessing(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Crop Area */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-h-full"
                >
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Crop"
                        onLoad={onImageLoad}
                        className="max-h-[70vh] max-w-full object-contain"
                        crossOrigin="anonymous"
                    />
                </ReactCrop>
            </div>

            {/* Instructions */}
            <div className="text-center py-2 text-gray-400 text-sm">
                Drag the corners to adjust the crop area
            </div>

            {/* Controls */}
            <div className="bg-gray-900 p-6 pb-12">
                <div className="flex justify-between gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors font-sans"
                    >
                        <X className="w-5 h-5" />
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isProcessing || !completedCrop}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#EC1D99] text-white font-bold rounded-xl hover:bg-[#D41C84] transition-colors disabled:opacity-50 font-sans"
                    >
                        {isProcessing ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Apply
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
