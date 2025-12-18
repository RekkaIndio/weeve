// Minimal mock for the `canvas` native module used by some packages.
// This prevents Vitest from attempting to load node-canvas native bindings
// during tests where we don't need full canvas functionality.

export class Canvas {
  width = 0;
  height = 0;
  getContext() {
    return {
      drawImage: () => {},
      fillRect: () => {},
      toDataURL: () => '',
    } as any;
  }
}

export function createCanvas(_w?: number, _h?: number) {
  return new Canvas();
}

export const Image = function () {
  // minimal placeholder
} as any;

export default {
  Canvas,
  createCanvas,
  Image,
};
