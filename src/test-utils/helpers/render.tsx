/**
 * Custom render utilities for React Testing Library
 * Provides pre-configured providers and testing utilities
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/providers/theme-provider'

// Mock providers for testing
interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  initialTheme?: 'light' | 'dark' | 'system'
}

function TestProviders({ 
  children, 
  queryClient,
  initialTheme = 'light'
}: TestProvidersProps) {
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme={initialTheme}
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialTheme?: 'light' | 'dark' | 'system'
  wrapper?: React.ComponentType<{ children: React.ReactNode }>
}

function customRender(
  ui: ReactElement,
  {
    queryClient,
    initialTheme,
    wrapper,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult {
  const Wrapper = wrapper || (({ children }: { children: React.ReactNode }) => (
    <TestProviders 
      queryClient={queryClient}
      initialTheme={initialTheme}
    >
      {children}
    </TestProviders>
  ))

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Render with query client
export function renderWithQueryClient(
  ui: ReactElement,
  queryClient?: QueryClient,
  options?: Omit<CustomRenderOptions, 'queryClient'>
) {
  return customRender(ui, { ...options, queryClient })
}

// Render with theme
export function renderWithTheme(
  ui: ReactElement,
  theme: 'light' | 'dark' | 'system' = 'light',
  options?: Omit<CustomRenderOptions, 'initialTheme'>
) {
  return customRender(ui, { ...options, initialTheme: theme })
}

// Render with all providers
export function renderWithAllProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return customRender(ui, options)
}

// Export everything from testing library + custom render
export * from '@testing-library/react'
export { customRender as render }

// Helper to create a fresh query client for each test
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  })
}

// Helper to wait for queries to settle
export async function waitForQueryToSettle(queryClient: QueryClient, key?: string) {
  if (key) {
    await queryClient.getQueryData([key])
  }
  await queryClient.getQueryCache().clear()
}

// Mock intersection observer for components that use it
export function mockIntersectionObserver() {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: jest.fn(() => mockObserver),
  })

  return mockObserver
}

// Mock resize observer for components that use it
export function mockResizeObserver() {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: jest.fn(() => mockObserver),
  })

  return mockObserver
}

// Helper to simulate user interactions
export function createUserInteractions() {
  return {
    clickElement: (element: Element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    },
    
    focusElement: (element: Element) => {
      element.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    },
    
    blurElement: (element: Element) => {
      element.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    },
    
    hoverElement: (element: Element) => {
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    },
    
    unhoverElement: (element: Element) => {
      element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    },
    
    keyPress: (element: Element, key: string) => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
      element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }))
    },
  }
}

// Helper to create mock props for components
export function createMockProps<T>(overrides: Partial<T> = {}): T {
  return {
    ...overrides,
  } as T
}

// Helper to wait for async operations
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to create mock event objects
export function createMockEvent<T extends Event>(
  type: string,
  properties: Partial<T> = {}
): T {
  const event = new Event(type) as T
  Object.assign(event, properties)
  return event
}