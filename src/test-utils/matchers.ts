/**
 * Custom Jest matchers for enhanced testing capabilities
 */

import type { MatcherFunction } from 'expect'

// Custom matcher for checking if a component has proper accessibility attributes
const toHaveAccessibleName: MatcherFunction<[string]> = function (
  received,
  expectedName
) {
  const { isNot } = this
  const element = received as HTMLElement

  if (!element) {
    return {
      message: () => 'Expected element to exist',
      pass: false,
    }
  }

  const accessibleName =
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.getAttribute('title') ||
    element.textContent ||
    ''

  const pass = accessibleName.includes(expectedName)

  return {
    message: () =>
      `Expected element ${isNot ? 'not ' : ''}to have accessible name "${expectedName}", but got "${accessibleName}"`,
    pass,
  }
}

// Custom matcher for checking loading states
const toBeInLoadingState: MatcherFunction<[]> = function (received) {
  const { isNot } = this
  const element = received as HTMLElement

  if (!element) {
    return {
      message: () => 'Expected element to exist',
      pass: false,
    }
  }

  const hasLoadingAttribute = element.getAttribute('aria-busy') === 'true'
  const hasLoadingClass = element.classList.contains('loading')
  const hasSpinner = element.querySelector('[data-testid="spinner"]') !== null
  const hasLoadingText = element.textContent?.includes('Loading') || false

  const pass = hasLoadingAttribute || hasLoadingClass || hasSpinner || hasLoadingText

  return {
    message: () =>
      `Expected element ${isNot ? 'not ' : ''}to be in loading state`,
    pass,
  }
}

// Custom matcher for checking error states
const toBeInErrorState: MatcherFunction<[string?]> = function (
  received,
  expectedError
) {
  const { isNot } = this
  const element = received as HTMLElement

  if (!element) {
    return {
      message: () => 'Expected element to exist',
      pass: false,
    }
  }

  const hasErrorAttribute = element.getAttribute('aria-invalid') === 'true'
  const hasErrorClass = element.classList.contains('error')
  const hasErrorRole = element.getAttribute('role') === 'alert'
  const errorText = element.textContent || ''

  let pass = hasErrorAttribute || hasErrorClass || hasErrorRole

  if (expectedError) {
    pass = pass && errorText.includes(expectedError)
  }

  return {
    message: () =>
      expectedError
        ? `Expected element ${isNot ? 'not ' : ''}to be in error state with message "${expectedError}"`
        : `Expected element ${isNot ? 'not ' : ''}to be in error state`,
    pass,
  }
}

// Custom matcher for checking if a number is within a percentage range
const toBeWithinPercentage: MatcherFunction<[number, number]> = function (
  received,
  expected,
  percentage
) {
  const { isNot } = this
  
  if (typeof received !== 'number' || typeof expected !== 'number') {
    return {
      message: () => 'Expected both values to be numbers',
      pass: false,
    }
  }

  const tolerance = Math.abs(expected * (percentage / 100))
  const difference = Math.abs(received - expected)
  const pass = difference <= tolerance

  return {
    message: () =>
      `Expected ${received} ${isNot ? 'not ' : ''}to be within ${percentage}% of ${expected} (tolerance: ${tolerance}, difference: ${difference})`,
    pass,
  }
}

// Custom matcher for checking if a value is a valid timestamp
const toBeValidTimestamp: MatcherFunction<[]> = function (received) {
  const { isNot } = this
  
  const date = new Date(received)
  const pass = !isNaN(date.getTime()) && date.getTime() > 0

  return {
    message: () =>
      `Expected ${received} ${isNot ? 'not ' : ''}to be a valid timestamp`,
    pass,
  }
}

// Custom matcher for checking if an array is sorted
const toBeSorted: MatcherFunction<[('asc' | 'desc')?, string?]> = function (
  received,
  direction = 'asc',
  key
) {
  const { isNot } = this
  
  if (!Array.isArray(received)) {
    return {
      message: () => 'Expected value to be an array',
      pass: false,
    }
  }

  if (received.length <= 1) {
    return {
      message: () => 'Array is too short to determine sort order',
      pass: true,
    }
  }

  let pass = true
  for (let i = 1; i < received.length; i++) {
    const prev = key ? received[i - 1][key] : received[i - 1]
    const curr = key ? received[i][key] : received[i]
    
    if (direction === 'asc') {
      if (prev > curr) {
        pass = false
        break
      }
    } else {
      if (prev < curr) {
        pass = false
        break
      }
    }
  }

  return {
    message: () =>
      `Expected array ${isNot ? 'not ' : ''}to be sorted in ${direction}ending order${key ? ` by key "${key}"` : ''}`,
    pass,
  }
}

// Custom matcher for checking if a React component has specific props
const toHaveProps: MatcherFunction<[Record<string, any>]> = function (
  received,
  expectedProps
) {
  const { isNot } = this
  
  if (!received || typeof received !== 'object' || !received.props) {
    return {
      message: () => 'Expected a React element with props',
      pass: false,
    }
  }

  const { props } = received
  let pass = true
  const missingProps: string[] = []
  const mismatchedProps: Array<{ key: string; expected: any; actual: any }> = []

  Object.entries(expectedProps).forEach(([key, expectedValue]) => {
    if (!(key in props)) {
      missingProps.push(key)
      pass = false
    } else if (props[key] !== expectedValue) {
      mismatchedProps.push({
        key,
        expected: expectedValue,
        actual: props[key],
      })
      pass = false
    }
  })

  const message = () => {
    if (missingProps.length > 0) {
      return `Expected element ${isNot ? 'not ' : ''}to have props: ${missingProps.join(', ')}`
    }
    if (mismatchedProps.length > 0) {
      const mismatches = mismatchedProps
        .map(({ key, expected, actual }) => `${key}: expected ${expected}, got ${actual}`)
        .join(', ')
      return `Expected element ${isNot ? 'not ' : ''}to have matching props: ${mismatches}`
    }
    return `Expected element ${isNot ? 'not ' : ''}to have specified props`
  }

  return { message, pass }
}

// Extend Jest expect with custom matchers
expect.extend({
  toHaveAccessibleName,
  toBeInLoadingState,
  toBeInErrorState,
  toBeWithinPercentage,
  toBeValidTimestamp,
  toBeSorted,
  toHaveProps,
})

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAccessibleName(expectedName: string): R
      toBeInLoadingState(): R
      toBeInErrorState(expectedError?: string): R
      toBeWithinPercentage(expected: number, percentage: number): R
      toBeValidTimestamp(): R
      toBeSorted(direction?: 'asc' | 'desc', key?: string): R
      toHaveProps(expectedProps: Record<string, any>): R
    }
  }
}