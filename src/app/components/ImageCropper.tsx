"use client";

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import getCroppedImg from '@/lib/cropImage'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
    aspect?: number;
}

const ImageCropper = ({ imageSrc, onCropComplete, onCancel, aspect = 1 }: ImageCropperProps) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop)
    }

    const onZoomChange = (zoom: number) => {
        setZoom(zoom)
    }

    const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
            if (croppedImage) {
                onCropComplete(croppedImage)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="relative flex-1 bg-black">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    onCropChange={onCropChange}
                    onCropComplete={onCropCompleteHandler}
                    onZoomChange={onZoomChange}
                />
            </div>

            <div className="bg-gray-900 p-6 space-y-6 pb-12">
                <div className="flex items-center gap-4">
                    <ZoomOut className="w-5 h-5 text-gray-400" />
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => {
                            setZoom(Number(e.target.value))
                        }}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#EC1D99]"
                    />
                    <ZoomIn className="w-5 h-5 text-gray-400" />
                </div>

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
                        disabled={isProcessing}
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
    )
}

export default ImageCropper
