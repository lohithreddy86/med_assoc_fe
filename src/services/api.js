/**
 * Centralized API Service
 *
 * Provides fetch wrappers for all API endpoints with:
 * - CSRF token inclusion
 * - Error handling
 * - Request/response formatting
 */

/**
 * Get CSRF token from meta tag or cookie
 * In production, this would read from a meta tag or cookie set by the server
 */
function getCSRFToken() {
  // For MVP, return empty string since we're using MSW
  // In production, implement proper CSRF token retrieval
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  return metaToken ? metaToken.getAttribute('content') : '';
}

/**
 * Base fetch wrapper with common configuration
 */
async function apiFetch(url, options = {}) {
  const csrfToken = getCSRFToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'same-origin', // Include cookies for HTTPS/SameSite
  };

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * OCR text extraction API
 *
 * @param {Object} snipData - Snip data
 * @param {number} snipData.page - PDF page number
 * @param {Object} snipData.rect - Normalized PDF coordinates {x, y, width, height}
 * @returns {Promise<Object>} OCR result {id, text, image_id}
 * @throws {Error} If request fails
 */
export async function extractText(snipData) {
  const response = await apiFetch('/api/snip-crop', {
    method: 'POST',
    body: JSON.stringify(snipData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `OCR request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Text summarization API
 *
 * @param {string[]} texts - Array of text strings to summarize
 * @returns {Promise<Object>} Summary result {summary, timestamp, model_version}
 * @throws {Error} If request fails
 */
export async function summarizeTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('texts must be a non-empty array');
  }

  const response = await apiFetch('/api/summarize', {
    method: 'POST',
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Summarization request failed: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Health check endpoint (optional, for monitoring)
 */
export async function healthCheck() {
  try {
    const response = await apiFetch('/api/health', {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
