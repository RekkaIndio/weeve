import '@testing-library/jest-dom';

// Provide minimal environment variables required by modules that initialize at import time
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon';

// Polyfill attachEvent/detachEvent for happy-dom compatibility with React 19
// React's input event polyfill uses these legacy IE methods
if (typeof window !== 'undefined') {
  // @ts-expect-error - adding IE legacy methods for React compatibility
  if (!HTMLElement.prototype.attachEvent) {
    // @ts-expect-error - adding IE legacy methods
    HTMLElement.prototype.attachEvent = function(event: string, handler: EventListener) {
      const eventName = event.replace(/^on/, '');
      this.addEventListener(eventName, handler);
    };
  }
  // @ts-expect-error - adding IE legacy methods for React compatibility
  if (!HTMLElement.prototype.detachEvent) {
    // @ts-expect-error - adding IE legacy methods
    HTMLElement.prototype.detachEvent = function(event: string, handler: EventListener) {
      const eventName = event.replace(/^on/, '');
      this.removeEventListener(eventName, handler);
    };
  }
}

// Mock fabric to avoid pulling in native `canvas` bindings during tests (node-canvas)
// This prevents errors when running Vitest in environments where canvas native module
// isn't compiled for the current Node version.
import { vi } from 'vitest';

// Stub out the node `canvas` native module in case it's required by any package
vi.mock('canvas', () => ({}));

vi.mock('fabric', () => {
  // Minimal stub of the fabric API used in the app
  class StubCanvas {
    width = 0;
    height = 0;
    freeDrawingBrush: any = { color: '#000', width: 1 };
    constructor(_el?: any, opts?: any) {
      if (opts) {
        this.width = opts.width ?? 0;
        this.height = opts.height ?? 0;
      }
    }
    toDataURL() { return ''; }
    getObjects() { return []; }
    dispose() { /* noop */ }
    renderAll() { /* noop */ }
    loadFromJSON(_state: any, cb?: () => void) { if (cb) cb(); }
    clear() { /* noop */ }
    on() { /* noop */ }
  }

  class StubPencilBrush {
    canvas: any;
    color = '#000';
    width = 1;
    constructor(canvas: any) { this.canvas = canvas; }
  }

  return {
    Canvas: StubCanvas,
    PencilBrush: StubPencilBrush,
  };
});

// Additional global mocks or polyfills can be added here in the future

// Provide a minimal mock for Next's client-side navigation utilities used by many components.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: (key: string) => null,
  }),
}));
