/**
 * Vitest Setup File
 * Mocks browser APIs not available in jsdom
 */

// Mock IntersectionObserver for framer-motion's whileInView/viewport
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

// @ts-ignore
globalThis.IntersectionObserver = MockIntersectionObserver;

// Mock matchMedia if not available
if (!globalThis.matchMedia) {
  // @ts-ignore
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
