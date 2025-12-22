'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as fabric from 'fabric';
import { Eraser, Undo2, Redo2, Palette, Circle, X, Type } from 'lucide-react';

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

const COLOR_OPTIONS = [
    '#FFFFFF', // White
    '#000000', // Black
    '#EC1D99', // Pink (brand color)
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#FFD93D', // Yellow
    '#A78BFA', // Purple
];

const BRUSH_SIZE_OPTIONS = [
    { label: 'S', value: 3 },
    { label: 'M', value: 8 },
    { label: 'L', value: 15 },
    { label: 'XL', value: 25 },
];

export interface DrawingCanvasRef {
    exportToBlob: () => Promise<Blob>;
    clear: () => void;
    isEmpty: () => boolean;
}

interface DrawingCanvasProps {
    className?: string;
    onAddText?: () => void;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
    ({ className = '', onAddText }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
        const [currentColor, setCurrentColor] = useState('#FFFFFF');
        const [currentBrushSize, setCurrentBrushSize] = useState(8);
        const [isErasing, setIsErasing] = useState(false);
        const [canUndo, setCanUndo] = useState(false);
        const [canRedo, setCanRedo] = useState(false);
        const [activePanel, setActivePanel] = useState<'color' | 'size' | null>(null);
        const historyRef = useRef<string[]>([]);
        const historyStepRef = useRef(0);

        // Initialize fabric canvas
        useEffect(() => {
            if (!canvasRef.current || !containerRef.current) return;

            const { clientWidth, clientHeight } = containerRef.current;

            // Create fabric canvas
            const canvas = new fabric.Canvas(canvasRef.current, {
                width: clientWidth,
                height: clientHeight,
                backgroundColor: '#1F2937', // gray-800
                isDrawingMode: true,
                selection: false,
                renderOnAddRemove: false, // Performance optimization
            });

            // Configure brush
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = currentColor;
            canvas.freeDrawingBrush.width = currentBrushSize;

            fabricCanvasRef.current = canvas;

            // Save initial state
            saveHistory(canvas);

            // Track drawing changes for undo/redo
            canvas.on('path:created', () => {
                saveHistory(canvas);
            });

            // Cleanup
            return () => {
                canvas.dispose();
                fabricCanvasRef.current = null;
            };
        }, []);

        // Update brush when color or size changes
        useEffect(() => {
            const canvas = fabricCanvasRef.current;
            if (!canvas || !canvas.freeDrawingBrush) return;

            if (isErasing) {
                // Eraser mode: use white color with destination-out
                canvas.freeDrawingBrush.color = '#1F2937'; // Same as background
                canvas.freeDrawingBrush.width = currentBrushSize * 2; // Eraser is larger
            } else {
                canvas.freeDrawingBrush.color = currentColor;
                canvas.freeDrawingBrush.width = currentBrushSize;
            }
        }, [currentColor, currentBrushSize, isErasing]);

        const saveHistory = (canvas: fabric.Canvas) => {
            const json = JSON.stringify(canvas.toJSON());

            // Remove any redo states
            historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);

            // Add new state
            historyRef.current.push(json);
            historyStepRef.current = historyRef.current.length - 1;

            // Limit history to 50 states
            if (historyRef.current.length > 50) {
                historyRef.current.shift();
                historyStepRef.current--;
            }

            updateUndoRedoState();
        };

        const updateUndoRedoState = () => {
            setCanUndo(historyStepRef.current > 0);
            setCanRedo(historyStepRef.current < historyRef.current.length - 1);
        };

        const handleUndo = async () => {
            const canvas = fabricCanvasRef.current;
            if (!canvas || historyStepRef.current <= 0) return;

            historyStepRef.current--;
            const state = historyRef.current[historyStepRef.current];

            try {
                await canvas.loadFromJSON(state);
                canvas.requestRenderAll();
                updateUndoRedoState();
            } catch (err) {
                console.error('Undo failed:', err);
            }
        };

        const handleRedo = async () => {
            const canvas = fabricCanvasRef.current;
            if (!canvas || historyStepRef.current >= historyRef.current.length - 1) return;

            historyStepRef.current++;
            const state = historyRef.current[historyStepRef.current];

            try {
                await canvas.loadFromJSON(state);
                canvas.requestRenderAll();
                updateUndoRedoState();
            } catch (err) {
                console.error('Redo failed:', err);
            }
        };

        const handleClear = () => {
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;

            canvas.clear();
            canvas.backgroundColor = '#1F2937';
            canvas.renderAll();
            saveHistory(canvas);
        };

        const handleColorSelect = (color: string) => {
            setCurrentColor(color);
            if (isErasing) setIsErasing(false);
            setActivePanel(null);
        };

        const toggleEraser = () => {
            setIsErasing(!isErasing);
            setActivePanel(null);
        };

        const handleSizeSelect = (size: number) => {
            setCurrentBrushSize(size);
            setActivePanel(null);
        };

        // Expose methods to parent via ref
        useImperativeHandle(ref, () => ({
            exportToBlob: async (): Promise<Blob> => {
                return new Promise((resolve, reject) => {
                    const canvas = fabricCanvasRef.current;
                    if (!canvas) {
                        reject(new Error('Canvas not initialized'));
                        return;
                    }

                    canvas.renderAll();

                    // Calculate multiplier to scale up to target resolution
                    const multiplier = TARGET_WIDTH / canvas.width!;

                    // Export canvas as data URL
                    const dataUrl = canvas.toDataURL({
                        format: 'png',
                        quality: 0.9,
                        multiplier: multiplier,
                    });

                    // Convert data URL to blob
                    fetch(dataUrl)
                        .then(res => res.blob())
                        .then(blob => resolve(blob))
                        .catch(err => reject(err));
                });
            },
            clear: handleClear,
            isEmpty: (): boolean => {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return true;
                return canvas.getObjects().length === 0;
            },
        }));

        return (
            <div className={`relative ${className}`}>
                {/* Canvas Container */}
                <div
                    ref={containerRef}
                    className="relative bg-gray-800 rounded-lg overflow-hidden"
                    style={{
                        width: '100%',
                        maxWidth: '540px',
                        aspectRatio: `${TARGET_WIDTH} / ${TARGET_HEIGHT}`,
                        margin: '0 auto',
                    }}
                >
                    <canvas ref={canvasRef} className="w-full h-full" />
                </div>

                {/* Right Side Tool Menu */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[70]">
                    {/* Add Text Button */}
                    {onAddText && (
                        <button
                            onClick={onAddText}
                            className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                            aria-label="Add Text"
                        >
                            <Type className="w-5 h-5 text-white" />
                        </button>
                    )}

                    {/* Color Tool */}
                    <button
                        onClick={() => setActivePanel(activePanel === 'color' ? null : 'color')}
                        className={`w-10 h-10 rounded-full border-2 shadow-lg transition-all ${activePanel === 'color' ? 'border-white scale-110' : 'border-white/30'}`}
                        style={{ backgroundColor: currentColor }}
                        aria-label="Select color"
                    />

                    {/* Size Tool */}
                    <button
                        onClick={() => setActivePanel(activePanel === 'size' ? null : 'size')}
                        className={`w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 flex items-center justify-center shadow-lg transition-all ${activePanel === 'size' ? 'border-white' : 'border-white/30'}`}
                        aria-label="Brush size"
                    >
                        <Circle className="text-white" style={{ width: currentBrushSize + 8, height: currentBrushSize + 8 }} fill="currentColor" />
                    </button>

                    {/* Eraser */}
                    <button
                        onClick={toggleEraser}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${isErasing ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}
                        aria-label="Eraser"
                    >
                        <Eraser className="w-5 h-5 text-white" />
                    </button>

                    {/* Undo */}
                    <button
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg disabled:opacity-40 transition-all"
                        aria-label="Undo"
                    >
                        <Undo2 className="w-5 h-5 text-white" />
                    </button>

                    {/* Redo */}
                    <button
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg disabled:opacity-40 transition-all"
                        aria-label="Redo"
                    >
                        <Redo2 className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Pop-out Color Panel */}
                {activePanel === 'color' && (
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/10 z-[71] animate-in slide-in-from-right-2">
                        <div className="grid grid-cols-2 gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => handleColorSelect(color)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all ${currentColor === color && !isErasing
                                        ? 'border-white scale-110'
                                        : 'border-transparent hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    aria-label={`Select color ${color}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Pop-out Size Panel */}
                {activePanel === 'size' && (
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/10 z-[71] animate-in slide-in-from-right-2">
                        <div className="flex flex-col gap-2">
                            {BRUSH_SIZE_OPTIONS.map((size) => (
                                <button
                                    key={size.value}
                                    onClick={() => handleSizeSelect(size.value)}
                                    className={`px-4 py-2 rounded-lg font-bold transition-colors ${currentBrushSize === size.value
                                        ? 'bg-[#EC1D99] text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

DrawingCanvas.displayName = 'DrawingCanvas';
