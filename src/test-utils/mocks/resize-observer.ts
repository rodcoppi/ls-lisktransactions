/**
 * ResizeObserver mock for testing
 */

export function setupResizeObserver() {
  const mockResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  Object.defineProperty(window, 'ResizeObserver', {
    value: mockResizeObserver,
    writable: true,
  })

  Object.defineProperty(global, 'ResizeObserver', {
    value: mockResizeObserver,
    writable: true,
  })
}

export function createMockResizeObserverEntry(
  target: Element,
  contentRect: Partial<DOMRectReadOnly> = {}
) {
  return {
    target,
    contentRect: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
      ...contentRect,
    },
    borderBoxSize: [{ inlineSize: 100, blockSize: 100 }],
    contentBoxSize: [{ inlineSize: 100, blockSize: 100 }],
    devicePixelContentBoxSize: [{ inlineSize: 100, blockSize: 100 }],
  }
}