'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as fabric from 'fabric';
import { Pencil, Eraser, Undo2, Redo2, Trash2 } from 'lucide-react';

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
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
    ({ className = '' }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
        const [currentColor, setCurrentColor] = useState('#FFFFFF');
        const [currentBrushSize, setCurrentBrushSize] = useState(8);
        const [isErasing, setIsErasing] = useState(false);
        const [canUndo, setCanUndo] = useState(false);
        const [canRedo, setCanRedo] = useState(false);
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

        const handleUndo = () => {
            const canvas = fabricCanvasRef.current;
            if (!canvas || historyStepRef.current <= 0) return;

            historyStepRef.current--;
            const state = historyRef.current[historyStepRef.current];

            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
                updateUndoRedoState();
            });
        };

        const handleRedo = () => {
            const canvas = fabricCanvasRef.current;
            if (!canvas || historyStepRef.current >= historyRef.current.length - 1) return;

            historyStepRef.current++;
            const state = historyRef.current[historyStepRef.current];

            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
                updateUndoRedoState();
            });
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
        };

        const toggleEraser = () => {
            setIsErasing(!isErasing);
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

                {/* Drawing Tools */}
                <div className="mt-4 space-y-4">
                    {/* Color Palette */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {COLOR_OPTIONS.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleColorSelect(color)}
                                className={`w-10 h-10 rounded-full border-2 transition-all ${currentColor === color && !isErasing
                                    ? 'border-white scale-110'
                                    : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: color }}
                                aria-label={`Select color ${color}`}
                            />
                        ))}
                    </div>

                    {/* Brush Size */}
                    <div className="flex gap-2 justify-center">
                        {BRUSH_SIZE_OPTIONS.map((size) => (
                            <button
                                key={size.value}
                                onClick={() => setCurrentBrushSize(size.value)}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${currentBrushSize === size.value
                                    ? 'bg-[#EC1D99] text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>

                    {/* Tool Actions */}
                    <div className="flex gap-2 justify-center flex-wrap">
                        <button
                            onClick={toggleEraser}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isErasing
                                ? 'bg-[#EC1D99] text-white'
                                : 'bg-gray-800 text-white hover:bg-gray-700'
                                }`}
                        >
                            <Eraser className="w-4 h-4" />
                            Eraser
                        </button>

                        <button
                            onClick={handleUndo}
                            disabled={!canUndo}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Undo2 className="w-4 h-4" />
                            Undo
                        </button>

                        <button
                            onClick={handleRedo}
                            disabled={!canRedo}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Redo2 className="w-4 h-4" />
                            Redo
                        </button>

                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear
                        </button>
                    </div>
                </div>
            </div>
        );
    }
);

DrawingCanvas.displayName = 'DrawingCanvas';
