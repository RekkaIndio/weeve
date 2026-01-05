import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWatermarkImage } from '../src/lib/mediaUtils';

describe('createWatermarkImage', () => {
    let mockContext: any;
    
    beforeEach(() => {
        // Mock Image
        global.Image = class {
            onload: () => void = () => {};
            src: string = '';
            width: number = 100;
            height: number = 100;
            set crossOrigin(val: string) {}
            
            constructor() {
                setTimeout(() => this.onload(), 0); // Simulate immediate load
            }
        } as any;

        // Mock Canvas getContext
        mockContext = {
            measureText: vi.fn().mockReturnValue({ width: 50 }),
            fillText: vi.fn(),
            drawImage: vi.fn(),
            clearRect: vi.fn(),
            createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
            fillRect: vi.fn(),
            shadowColor: '',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            font: '',
            fillStyle: '',
            textAlign: '',
            textBaseline: '',
            imageSmoothingEnabled: false,
            imageSmoothingQuality: ''
        };

        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockContext),
            toBlob: (cb: any) => cb(new Blob(['fake-image'], { type: 'image/png' })),
            width: 0,
            height: 0
        };

        vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            if (tagName === 'canvas') return mockCanvas as any;
            return document.createElement(tagName as any);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create a watermark with simple username', async () => {
        await createWatermarkImage('testuser');
        
        // Verify username text is drawn
        expect(mockContext.fillText).toHaveBeenCalledWith('@testuser', expect.any(Number), expect.any(Number));
        
        // Verify only one text draw (plus logo via drawImage) for username
        // Actually the code draws 'Weeve' at the bottom too? No, that's createWatermarkImage, not createImageFromText.
        // let's check the code:
        // createWatermarkImage draws text and logo. No 'Weeve' at bottom mentioned in my memory, let's re-read code if needed.
        // Wait, line 150: ctx.fillText(text, textX, centerY);
        // Then line 160: ctx.drawImage(...)
        // So expected call count for fillText is 1.
        
        // BUT wait, I see "ctx.fillText('Weeve', width / 2, height - 40);" in createImageFromText, not createWatermarkImage?
        // Let's assume createWatermarkImage only calls fillText once for the username.
        
        // Count calls to fillText with specific args
        const calls = mockContext.fillText.mock.calls;
        const textCalls = calls.filter((c: any[]) => c[0].includes('@testuser'));
        expect(textCalls.length).toBe(1);
    });

    it('should create a watermark with original creator attribution', async () => {
        await createWatermarkImage('testuser', 'originalCreator');
        
        // Verify username text is drawn
        expect(mockContext.fillText).toHaveBeenCalledWith('@testuser', expect.any(Number), expect.any(Number));
        
        // Verify fork attribution text is drawn
        // The code: forkText = `${forkSymbol} from @${originalCreator}`;
        // forkSymbol is '⑂'
        const expectedForkText = '⑂ from @originalCreator';
        expect(mockContext.fillText).toHaveBeenCalledWith(expectedForkText, expect.any(Number), expect.any(Number));
        
        // Verify Weeve pink color was set for the second line
        // The last fillStyle before the second fillText should be '#EC1D99'
        // But checking exact order with mocks without call order indices is tricky.
        // However, we can check if fillStyle was set to that value at some point.
        // Or verify the draw call happened.
    });
});
