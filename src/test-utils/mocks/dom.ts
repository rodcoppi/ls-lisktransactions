/**
 * DOM API mocks for testing environment
 * Provides implementations for browser APIs not available in jsdom
 */

export function setupIntersectionObserver() {
  // Mock IntersectionObserver
  const mockIntersectionObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }))

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: mockIntersectionObserver,
  })

  Object.defineProperty(global, 'IntersectionObserver', {
    writable: true,
    value: mockIntersectionObserver,
  })
}

export function setupMutationObserver() {
  const mockMutationObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(),
  }))

  Object.defineProperty(window, 'MutationObserver', {
    writable: true,
    value: mockMutationObserver,
  })

  Object.defineProperty(global, 'MutationObserver', {
    writable: true,
    value: mockMutationObserver,
  })
}

export function setupGeolocation() {
  const mockGeolocation = {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  }

  Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    value: mockGeolocation,
  })
}

export function setupCanvas() {
  // Mock HTMLCanvasElement methods
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    fillText: jest.fn(),
    strokeText: jest.fn(),
  }))

  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => '')
  HTMLCanvasElement.prototype.getImageData = jest.fn()
}

export function setupWebSocket() {
  const mockWebSocket = jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    send: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.CONNECTING,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  }))

  Object.defineProperty(global, 'WebSocket', {
    writable: true,
    value: mockWebSocket,
  })
}

export function setupStorage() {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  }

  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  })
}

export function setupClipboard() {
  const mockClipboard = {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
    write: jest.fn(() => Promise.resolve()),
    read: jest.fn(() => Promise.resolve([])),
  }

  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true,
  })
}

export function setupMediaQuery() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

export function setupScrollBehavior() {
  Element.prototype.scrollTo = jest.fn()
  Element.prototype.scrollBy = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()

  Object.defineProperty(window, 'scrollTo', {
    value: jest.fn(),
    writable: true,
  })

  Object.defineProperty(window, 'scrollBy', {
    value: jest.fn(),
    writable: true,
  })
}

export function setupURL() {
  Object.defineProperty(global, 'URL', {
    value: {
      createObjectURL: jest.fn(() => 'mocked-object-url'),
      revokeObjectURL: jest.fn(),
    },
    writable: true,
  })
}

export function setupAnimationFrame() {
  Object.defineProperty(global, 'requestAnimationFrame', {
    value: jest.fn((cb) => setTimeout(cb, 16)),
    writable: true,
  })

  Object.defineProperty(global, 'cancelAnimationFrame', {
    value: jest.fn((id) => clearTimeout(id)),
    writable: true,
  })
}

// Convenience function to setup all DOM mocks
export function setupAllDOMMocks() {
  setupIntersectionObserver()
  setupMutationObserver()
  setupGeolocation()
  setupCanvas()
  setupWebSocket()
  setupStorage()
  setupClipboard()
  setupMediaQuery()
  setupScrollBehavior()
  setupURL()
  setupAnimationFrame()
}