/**
 * Text Sanitization Utility
 *
 * Provides DOMPurify integration for sanitizing user-editable content
 * to prevent XSS attacks (FR-051)
 */

import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 *
 * @param {string} dirty - Potentially unsafe HTML/text content
 * @param {Object} config - Optional DOMPurify configuration
 * @returns {string} Sanitized safe HTML/text
 */
export function sanitizeHTML(dirty, config = {}) {
  if (typeof dirty !== "string") {
    return "";
  }

  const defaultConfig = {
    ALLOWED_TAGS: [], // No HTML tags allowed by default (plain text only)
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content even if tags are removed
    ...config,
  };

  return DOMPurify.sanitize(dirty, defaultConfig);
}

/**
 * Sanitize plain text content (strips all HTML tags)
 *
 * @param {string} text - Text content that may contain HTML
 * @returns {string} Plain text with all HTML removed
 */
export function sanitizeText(text) {
  if (typeof text !== "string") {
    return "";
  }

  // Strip all HTML tags and return plain text
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize user input for display in text fields
 * Preserves line breaks but removes all HTML
 *
 * @param {string} input - User input from text fields
 * @returns {string} Sanitized text safe for display
 */
export function sanitizeUserInput(input) {
  if (typeof input !== "string") {
    return "";
  }

  // For text inputs, we want plain text only
  // Line breaks (\n) are preserved automatically since we're stripping HTML
  return sanitizeText(input);
}

/**
 * Sanitize summary text for display
 * Allows basic formatting if needed, but currently returns plain text
 *
 * @param {string} summary - Summary text from API
 * @returns {string} Sanitized summary safe for display
 */
export function sanitizeSummary(summary) {
  if (typeof summary !== "string") {
    return "";
  }

  // For MVP, summaries are plain text
  // If backend starts returning formatted summaries, adjust ALLOWED_TAGS
  return sanitizeText(summary);
}
