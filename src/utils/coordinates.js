/**
 * Coordinate Conversion Utilities
 *
 * This module implements the coordinate conversion algorithm specified in spec.md
 * to convert browser pixel coordinates to normalized PDF coordinates.
 *
 * Algorithm:
 * Step 1: Convert to unscaled canvas coordinates (browserX / scale)
 * Step 2: Normalize to 0-1 range (canvasX / pageWidth)
 * Step 3: Invert Y-axis (1.0 - (normalizedY + normalizedHeight))
 *
 * The Y-axis inversion is necessary because:
 * - Browser coordinates: origin at top-left, Y increases downward
 * - PDF coordinates: origin at bottom-left, Y increases upward
 */

/**
 * Convert browser pixel coordinates to normalized PDF coordinates
 *
 * @param {Object} browserRect - Rectangle in browser pixel coordinates
 * @param {number} browserRect.x - X coordinate from top-left origin
 * @param {number} browserRect.y - Y coordinate from top-left origin
 * @param {number} browserRect.width - Width in pixels
 * @param {number} browserRect.height - Height in pixels
 * @param {number} scale - Canvas rendering scale factor (e.g., 1.5 for high-DPI displays)
 * @param {Object} pageDimensions - Original PDF page dimensions
 * @param {number} pageDimensions.width - Page width in points
 * @param {number} pageDimensions.height - Page height in points
 * @returns {Object} Normalized PDF rectangle with coordinates in 0-1 range
 *
 * @example
 * // For a 100×50px selection at (200, 300) on a 600×800px page with scale=1.5:
 * const result = convertToNormalizedPDFCoords(
 *   { x: 200, y: 300, width: 100, height: 50 },
 *   1.5,
 *   { width: 600, height: 800 }
 * );
 * // Result: { x: 0.222, y: 0.708, width: 0.111, height: 0.042 }
 */
export function convertToNormalizedPDFCoords(
  browserRect,
  scale,
  pageDimensions,
) {
  // Validate inputs
  if (!browserRect || typeof browserRect !== "object") {
    throw new Error("Invalid browserRect: must be an object");
  }

  if (
    typeof browserRect.x !== "number" ||
    typeof browserRect.y !== "number" ||
    typeof browserRect.width !== "number" ||
    typeof browserRect.height !== "number"
  ) {
    throw new Error("Invalid browserRect: x, y, width, height must be numbers");
  }

  if (typeof scale !== "number" || scale <= 0) {
    throw new Error("Invalid scale: must be a positive number");
  }

  if (!pageDimensions || typeof pageDimensions !== "object") {
    throw new Error("Invalid pageDimensions: must be an object");
  }

  if (
    typeof pageDimensions.width !== "number" ||
    typeof pageDimensions.height !== "number" ||
    pageDimensions.width <= 0 ||
    pageDimensions.height <= 0
  ) {
    throw new Error(
      "Invalid pageDimensions: width and height must be positive numbers",
    );
  }

  // Step 1: Convert to unscaled canvas coordinates
  // Divide by scale to get actual canvas coordinates independent of DPI scaling
  const canvasX = browserRect.x / scale;
  const canvasY = browserRect.y / scale;
  const canvasWidth = browserRect.width / scale;
  const canvasHeight = browserRect.height / scale;

  // Step 2: Normalize to 0-1 range
  // Divide by page dimensions to get coordinates as fraction of page size
  const normalizedX = canvasX / pageDimensions.width;
  const normalizedY = canvasY / pageDimensions.height;
  const normalizedWidth = canvasWidth / pageDimensions.width;
  const normalizedHeight = canvasHeight / pageDimensions.height;

  // Step 3: Invert Y-axis (browser top-left → PDF bottom-left)
  // PDF origin is at bottom-left, so Y=0 is at the bottom
  // Browser origin is at top-left, so Y=0 is at the top
  // Formula: pdfY = 1.0 - (browserY + height)
  const pdfNormalizedY = 1.0 - (normalizedY + normalizedHeight);

  // Clamp all values to valid 0-1 range to avoid floating point issues
  // and ensure coordinates don't exceed page bounds
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const result = {
    x: clamp(normalizedX, 0, 1),
    y: clamp(pdfNormalizedY, 0, 1),
    width: clamp(normalizedWidth, 0.001, 1), // Minimum width to avoid zero
    height: clamp(normalizedHeight, 0.001, 1), // Minimum height to avoid zero
  };

  // Ensure x + width and y + height don't exceed 1.0
  if (result.x + result.width > 1.0) {
    result.width = 1.0 - result.x;
  }
  if (result.y + result.height > 1.0) {
    result.height = 1.0 - result.y;
  }

  return result;
}

/**
 * Extract page dimensions from a PDF document
 *
 * @param {Object} pdfDocument - PDF.js document object
 * @param {number} pageNumber - Page number (1-indexed)
 * @returns {Promise<Object>} Page dimensions { width, height } in points
 *
 * @example
 * const dimensions = await extractPageDimensions(pdfDocument, 1);
 * // Returns: { width: 612, height: 792 } for standard US Letter
 */
export async function extractPageDimensions(pdfDocument, pageNumber) {
  if (!pdfDocument) {
    throw new Error("Invalid pdfDocument: must be provided");
  }

  if (
    typeof pageNumber !== "number" ||
    pageNumber < 1 ||
    pageNumber > pdfDocument.numPages
  ) {
    throw new Error(
      `Invalid pageNumber: must be between 1 and ${pdfDocument.numPages}`,
    );
  }

  try {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });

    return {
      width: viewport.width,
      height: viewport.height,
    };
  } catch (error) {
    throw new Error(`Failed to extract page dimensions: ${error.message}`);
  }
}

/**
 * Get current canvas scale factor from a rendered PDF page
 *
 * This is useful when the PDF is displayed at different zoom levels.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element rendering the PDF
 * @param {Object} pageDimensions - Original PDF page dimensions
 * @returns {number} Scale factor
 *
 * @example
 * const scale = getCanvasScale(canvasElement, { width: 612, height: 792 });
 * // Returns: 1.5 (if canvas is 918px wide for a 612pt page)
 */
export function getCanvasScale(canvas, pageDimensions) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Invalid canvas: must be an HTMLCanvasElement");
  }

  if (!pageDimensions || !pageDimensions.width) {
    throw new Error("Invalid pageDimensions: must have width property");
  }

  return canvas.width / pageDimensions.width;
}
