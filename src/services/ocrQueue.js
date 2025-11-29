/**
 * OCR Queue Manager
 *
 * Manages non-blocking sequential FIFO processing of OCR requests
 * with max queue size of 50 requests and 30-second timeout per request.
 *
 * Features:
 * - FIFO queue processing (first in, first out)
 * - Non-blocking: can enqueue new requests while processing
 * - Max queue size: 50 pending requests
 * - 30-second timeout per request
 * - Sequential processing (one at a time)
 * - Status tracking per request
 */

class OCRQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = 50;
    this.requestTimeout = 30000; // 30 seconds
    this.activeRequest = null;
  }

  /**
   * Enqueue a new OCR request
   *
   * @param {Object} snipData - Snip data containing page number and normalized coordinates
   * @param {number} snipData.page - PDF page number
   * @param {Object} snipData.rect - Normalized PDF coordinates
   * @param {Function} onSuccess - Callback for successful OCR
   * @param {Function} onError - Callback for OCR failure
   * @param {Function} onTimeout - Callback for timeout
   * @returns {string|null} Request ID if enqueued, null if queue is full
   */
  enqueue(snipData, onSuccess, onError, onTimeout) {
    // Check queue capacity
    if (this.queue.length >= this.maxQueueSize) {
      if (onError) {
        onError(new Error('Too many pending OCR requests. Please wait for earlier snips to complete.'));
      }
      return null;
    }

    const requestId = crypto.randomUUID();
    const request = {
      id: requestId,
      snipData,
      onSuccess,
      onError,
      onTimeout,
      status: 'pending',
      enqueuedAt: Date.now(),
    };

    this.queue.push(request);

    // Start processing if not already processing
    if (!this.processing) {
      this.processNext();
    }

    return requestId;
  }

  /**
   * Process the next request in the queue
   */
  async processNext() {
    // If already processing or queue is empty, do nothing
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const request = this.queue.shift();
    this.activeRequest = request;
    request.status = 'processing';

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (this.activeRequest && this.activeRequest.id === request.id) {
        request.status = 'timeout';
        if (request.onTimeout) {
          request.onTimeout(new Error('OCR request timed out. Click retry to try again.'));
        }
        this.activeRequest = null;
        this.processing = false;
        this.processNext(); // Process next request
      }
    }, this.requestTimeout);

    try {
      // Make OCR API request
      const response = await fetch('/api/snip-crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.snipData),
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR request failed');
      }

      const data = await response.json();

      // Mark as success
      request.status = 'success';
      if (request.onSuccess) {
        request.onSuccess(data);
      }
    } catch (error) {
      // Clear timeout
      clearTimeout(timeoutId);

      // Mark as error
      request.status = 'error';
      if (request.onError) {
        request.onError(error);
      }
    } finally {
      this.activeRequest = null;
      this.processing = false;

      // Process next request in queue
      this.processNext();
    }
  }

  /**
   * Get current queue status
   *
   * @returns {Object} Queue statistics
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      maxQueueSize: this.maxQueueSize,
      activeRequest: this.activeRequest
        ? {
            id: this.activeRequest.id,
            status: this.activeRequest.status,
            enqueuedAt: this.activeRequest.enqueuedAt,
          }
        : null,
    };
  }

  /**
   * Clear the queue (use with caution)
   */
  clear() {
    this.queue = [];
    this.processing = false;
    this.activeRequest = null;
  }
}

// Export singleton instance
export const ocrQueue = new OCRQueue();
