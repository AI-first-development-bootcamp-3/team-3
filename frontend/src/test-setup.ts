import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia; antd's responsive Grid/Form hooks call
// it on mount, so any test rendering a real antd Form needs this polyfill.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
