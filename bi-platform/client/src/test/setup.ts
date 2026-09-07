import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom não implementa estas APIs usadas por gráficos e chats
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
(globalThis as any).ResizeObserver ||= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).IntersectionObserver ||= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
