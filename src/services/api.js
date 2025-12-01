/**
 * Centralized API Service
 *
 * Provides fetch wrappers for all API endpoints with:
 * - CSRF token inclusion
 * - Error handling
 * - Request/response formatting
 * - Environment-based API URL configuration
 */

/**
 * API Base URL Configuration
 *
 * Reads from environment variable REACT_APP_API_BASE_URL
 * Defaults to localhost:8000 for development
 *
 * Usage in .env.local:
 *   REACT_APP_API_BASE_URL=http://localhost:8000      (same server)
 *   REACT_APP_API_BASE_URL=http://192.168.1.190:8000  (network access)
 */
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

/**
 * Get CSRF token from meta tag or cookie
 * In production, this would read from a meta tag or cookie set by the server
 */
function getCSRFToken() {
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  return metaToken ? metaToken.getAttribute("content") : "";
}

/**
 * Base fetch wrapper with common configuration
 *
 * @param {string} endpoint - API endpoint path (e.g., "/api/health")
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function apiFetch(endpoint, options = {}) {
  const csrfToken = getCSRFToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(csrfToken && { "X-CSRF-Token": csrfToken }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include", // Include cookies for cross-origin requests
  };

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * Upload PDF to backend server
 *
 * @param {File} file - PDF file to upload
 * @returns {Promise<Object>} Upload result { pdf_id, filename, page_count }
 * @throws {Error} If upload fails
 */
export async function uploadPDF(file) {
  const csrfToken = getCSRFToken();
  const url = `${API_BASE_URL}/api/upload-pdf`;

  const formData = new FormData();
  formData.append("file", file);

  const config = {
    method: "POST",
    body: formData,
    credentials: "include", // Include cookies for cross-origin requests
    headers: {
      ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      // Note: Don't set Content-Type for FormData - browser sets it with boundary
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `PDF upload failed: ${response.status}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error.message.startsWith("PDF upload failed")) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * OCR text extraction API
 *
 * @param {Object} snipData - Snip data
 * @param {string} snipData.pdf_id - PDF identifier from upload
 * @param {number} snipData.page - PDF page number
 * @param {Object} snipData.rect - Normalized PDF coordinates {x, y, width, height}
 * @returns {Promise<Object>} OCR result {id, text, image_id}
 * @throws {Error} If request fails
 */
export async function extractText(snipData) {
  if (!snipData.pdf_id) {
    throw new Error("pdf_id is required for OCR extraction");
  }

  const response = await apiFetch("/api/snip-crop", {
    method: "POST",
    body: JSON.stringify(snipData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `OCR request failed: ${response.status}`,
    );
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
    throw new Error("texts must be a non-empty array");
  }

  const response = await apiFetch("/api/summarize", {
    method: "POST",
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Summarization request failed: ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Health check endpoint - returns full service status
 *
 * @returns {Promise<Object>} Health status object or null if unavailable
 * @property {string} status - 'healthy' or 'degraded'
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} version - API version
 * @property {boolean} model_loaded - OCR model ready
 * @property {boolean} gpu_available - GPU accessible
 * @property {boolean} ollama_available - Summarization service ready
 * @property {string|null} gpu_memory_used - e.g., "7.1GB"
 * @property {string|null} gpu_memory_total - e.g., "47.5GB"
 */
export async function healthCheck() {
  try {
    const response = await apiFetch("/api/health", {
      method: "GET",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

/**
 * Get PDF document info
 *
 * @param {string} pdfId - PDF identifier from upload
 * @returns {Promise<Object>} PDF info { pdf_id, filename, size, page_count, uploaded_at, expires_at }
 * @throws {Error} If request fails
 */
export async function getPdfInfo(pdfId) {
  const response = await apiFetch(`/api/pdf/${pdfId}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to get PDF info");
  }

  return response.json();
}

/**
 * Delete PDF document
 *
 * @param {string} pdfId - PDF identifier from upload
 * @returns {Promise<void>}
 * @throws {Error} If request fails
 */
export async function deletePdf(pdfId) {
  const response = await apiFetch(`/api/pdf/${pdfId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete PDF");
  }
}
