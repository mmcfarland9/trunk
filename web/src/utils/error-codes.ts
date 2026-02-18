/**
 * Error code registry utilities for cross-platform error messaging.
 * Provides typed access to shared error codes from shared/error-codes.json.
 */

import errorCodesJson from '../../../shared/error-codes.json'

export type ErrorCategory = 'auth' | 'sync' | 'validation'

export type ErrorInfo = {
  code: string
  defaultMessage: string
  userMessage: string
}

/**
 * Get error info for a specific error key within a category.
 *
 * @param category - The error category (auth, sync, validation)
 * @param errorKey - The specific error key (e.g., 'NOT_CONFIGURED')
 * @returns The error info object with code, defaultMessage, and userMessage
 */
export function getErrorInfo(category: ErrorCategory, errorKey: string): ErrorInfo {
  const categoryErrors = errorCodesJson[category]
  const errorInfo = categoryErrors[errorKey as keyof typeof categoryErrors]

  if (!errorInfo) {
    return {
      code: 'UNKNOWN',
      defaultMessage: 'An unknown error occurred',
      userMessage: 'Something went wrong. Please try again.',
    }
  }

  return errorInfo as ErrorInfo
}

/**
 * Get the user-facing message for an error.
 *
 * @param category - The error category (auth, sync, validation)
 * @param errorKey - The specific error key (e.g., 'NOT_CONFIGURED')
 * @returns The user-friendly error message
 */
export function getUserMessage(category: ErrorCategory, errorKey: string): string {
  return getErrorInfo(category, errorKey).userMessage
}

/**
 * Get the error code for an error.
 *
 * @param category - The error category (auth, sync, validation)
 * @param errorKey - The specific error key (e.g., 'NOT_CONFIGURED')
 * @returns The error code (e.g., 'AUTH_001')
 */
export function getErrorCode(category: ErrorCategory, errorKey: string): string {
  return getErrorInfo(category, errorKey).code
}
