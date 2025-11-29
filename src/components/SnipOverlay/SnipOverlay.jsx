import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { convertToNormalizedPDFCoords } from '../../utils/coordinates';
import { ocrQueue } from '../../services/ocrQueue';
import styles from './SnipOverlay.module.css';

export function SnipOverlay({ scale, pageDimensions, pageNumber }) {
  const { addSnip, updateSnip, addTextBox, deleteSnip, snips } = useAppContext();
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [selectedSnipId, setSelectedSnipId] = useState(null);
  const [resizing, setResizing] = useState(null); // { snipId, handle: 'nw'|'ne'|'sw'|'se'|'n'|'s'|'e'|'w' }
  const overlayRef = useRef(null);

  // Helper: Re-send OCR request after resizing
  const resendOCRRequest = useCallback((snip) => {
    // Convert updated browser coordinates to normalized PDF coordinates
    const normalizedCoords = convertToNormalizedPDFCoords(
      snip.browserRect,
      scale,
      pageDimensions
    );

    // Update snip with new coordinates and reset status
    updateSnip(snip.id, {
      rect: normalizedCoords,
      status: 'pending',
    });

    // Enqueue new OCR request
    const requestId = ocrQueue.enqueue(
      {
        page: pageNumber,
        rect: normalizedCoords,
      },
      // Success callback
      (extractedText) => {
        updateSnip(snip.id, { status: 'success' });

        // Create new text box with extracted text
        const textBox = {
          id: crypto.randomUUID(),
          text: extractedText || '',
          pageNumber,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        addTextBox(textBox);

        if (extractedText) {
          announceToScreenReader(`OCR complete. Text extracted: ${extractedText.substring(0, 50)}...`, 'status');
        } else {
          announceToScreenReader('OCR complete. No text detected in this region.', 'status');
        }
      },
      // Error callback
      (error) => {
        updateSnip(snip.id, { status: 'error', error: error.message });
        announceToScreenReader(`OCR failed: ${error.message}`, 'error');
      },
      // Timeout callback
      () => {
        updateSnip(snip.id, { status: 'error', error: 'Request timed out' });
        announceToScreenReader('OCR request timed out after 30 seconds', 'error');
      }
    );

    if (!requestId) {
      updateSnip(snip.id, { status: 'error', error: 'Too many pending requests' });
      announceToScreenReader('Too many pending OCR requests. Please wait for current requests to complete.', 'error');
    } else {
      updateSnip(snip.id, { status: 'processing' });
      announceToScreenReader(`Selection resized. Processing OCR...`, 'status');
    }
  }, [scale, pageDimensions, pageNumber, updateSnip, addTextBox]);

  // Keyboard handler for moving/resizing selections
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedSnipId) return;

      const snip = snips.find(s => s.id === selectedSnipId);
      if (!snip || !snip.browserRect) return;

      const moveStep = 5; // pixels
      const resizeStep = 5; // pixels
      let newRect = { ...snip.browserRect };
      let changed = false;

      if (e.shiftKey) {
        // Shift + Arrow: Resize
        switch (e.key) {
          case 'ArrowUp':
            newRect.height = Math.max(10, newRect.height - resizeStep);
            changed = true;
            break;
          case 'ArrowDown':
            newRect.height = newRect.height + resizeStep;
            changed = true;
            break;
          case 'ArrowLeft':
            newRect.width = Math.max(10, newRect.width - resizeStep);
            changed = true;
            break;
          case 'ArrowRight':
            newRect.width = newRect.width + resizeStep;
            changed = true;
            break;
          default:
            break;
        }
      } else {
        // Arrow: Move
        switch (e.key) {
          case 'ArrowUp':
            newRect.y = Math.max(0, newRect.y - moveStep);
            changed = true;
            break;
          case 'ArrowDown':
            newRect.y = newRect.y + moveStep;
            changed = true;
            break;
          case 'ArrowLeft':
            newRect.x = Math.max(0, newRect.x - moveStep);
            changed = true;
            break;
          case 'ArrowRight':
            newRect.x = newRect.x + moveStep;
            changed = true;
            break;
          default:
            break;
        }
      }

      if (changed) {
        e.preventDefault();
        updateSnip(selectedSnipId, { browserRect: newRect });

        // Re-send OCR request with new coordinates (debounced)
        // We'll send after a short delay to avoid sending too many requests
        if (window.resizeOCRTimeout) {
          clearTimeout(window.resizeOCRTimeout);
        }
        window.resizeOCRTimeout = setTimeout(() => {
          resendOCRRequest({ ...snip, browserRect: newRect });
        }, 500);

        const action = e.shiftKey ? 'resized' : 'moved';
        announceToScreenReader(`Selection ${action} using arrow keys`, 'status');
      }

      // Delete key: Delete selected snip
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSnip(selectedSnipId);
        setSelectedSnipId(null);
        announceToScreenReader('Selection deleted', 'status');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (window.resizeOCRTimeout) {
        clearTimeout(window.resizeOCRTimeout);
      }
    };
  }, [selectedSnipId, snips, updateSnip, deleteSnip, resendOCRRequest]);

  // Helper: Get handle at position (returns { snipId, handle } or null)
  const getHandleAtPosition = useCallback((x, y) => {
    const currentPageSnips = snips.filter(s => s.pageNumber === pageNumber && s.browserRect);

    for (const snip of currentPageSnips) {
      const { browserRect } = snip;
      const handleSize = 8;
      const handles = {
        nw: { x: browserRect.x, y: browserRect.y },
        ne: { x: browserRect.x + browserRect.width, y: browserRect.y },
        sw: { x: browserRect.x, y: browserRect.y + browserRect.height },
        se: { x: browserRect.x + browserRect.width, y: browserRect.y + browserRect.height },
        n: { x: browserRect.x + browserRect.width / 2, y: browserRect.y },
        s: { x: browserRect.x + browserRect.width / 2, y: browserRect.y + browserRect.height },
        w: { x: browserRect.x, y: browserRect.y + browserRect.height / 2 },
        e: { x: browserRect.x + browserRect.width, y: browserRect.y + browserRect.height / 2 },
      };

      for (const [handleName, handlePos] of Object.entries(handles)) {
        if (
          x >= handlePos.x - handleSize &&
          x <= handlePos.x + handleSize &&
          y >= handlePos.y - handleSize &&
          y <= handlePos.y + handleSize
        ) {
          return { snipId: snip.id, handle: handleName };
        }
      }
    }
    return null;
  }, [snips, pageNumber]);

  // Mouse down - start drawing or resizing
  const handleMouseDown = (e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a resize handle
    const handle = getHandleAtPosition(x, y);
    if (handle) {
      setResizing(handle);
      setSelectedSnipId(handle.snipId);
      return;
    }

    // Otherwise, start drawing a new selection
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
    setSelectedSnipId(null);
  };

  // Mouse move - update rectangle or resize
  const handleMouseMove = (e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Handle resizing
    if (resizing) {
      const snip = snips.find(s => s.id === resizing.snipId);
      if (!snip || !snip.browserRect) return;

      const { browserRect } = snip;
      let newRect = { ...browserRect };

      // Calculate new dimensions based on handle
      switch (resizing.handle) {
        case 'nw':
          newRect = {
            x: currentX,
            y: currentY,
            width: browserRect.x + browserRect.width - currentX,
            height: browserRect.y + browserRect.height - currentY,
          };
          break;
        case 'ne':
          newRect = {
            x: browserRect.x,
            y: currentY,
            width: currentX - browserRect.x,
            height: browserRect.y + browserRect.height - currentY,
          };
          break;
        case 'sw':
          newRect = {
            x: currentX,
            y: browserRect.y,
            width: browserRect.x + browserRect.width - currentX,
            height: currentY - browserRect.y,
          };
          break;
        case 'se':
          newRect = {
            x: browserRect.x,
            y: browserRect.y,
            width: currentX - browserRect.x,
            height: currentY - browserRect.y,
          };
          break;
        case 'n':
          newRect = {
            x: browserRect.x,
            y: currentY,
            width: browserRect.width,
            height: browserRect.y + browserRect.height - currentY,
          };
          break;
        case 's':
          newRect = {
            x: browserRect.x,
            y: browserRect.y,
            width: browserRect.width,
            height: currentY - browserRect.y,
          };
          break;
        case 'w':
          newRect = {
            x: currentX,
            y: browserRect.y,
            width: browserRect.x + browserRect.width - currentX,
            height: browserRect.height,
          };
          break;
        case 'e':
          newRect = {
            x: browserRect.x,
            y: browserRect.y,
            width: currentX - browserRect.x,
            height: browserRect.height,
          };
          break;
        default:
          break;
      }

      // Normalize negative dimensions
      if (newRect.width < 0) {
        newRect.x = newRect.x + newRect.width;
        newRect.width = Math.abs(newRect.width);
      }
      if (newRect.height < 0) {
        newRect.y = newRect.y + newRect.height;
        newRect.height = Math.abs(newRect.height);
      }

      // Update the snip's browser rect
      updateSnip(resizing.snipId, { browserRect: newRect });
      return;
    }

    // Handle drawing new selection
    if (!isDrawing || !startPoint) return;

    const width = currentX - startPoint.x;
    const height = currentY - startPoint.y;

    // Normalize negative dimensions (drawing from bottom-right to top-left)
    const normalizedRect = {
      x: width < 0 ? currentX : startPoint.x,
      y: height < 0 ? currentY : startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height),
    };

    setCurrentRect(normalizedRect);
  };

  // Mouse up - complete selection or resizing
  const handleMouseUp = () => {
    // Handle resizing completion
    if (resizing) {
      const snip = snips.find(s => s.id === resizing.snipId);
      if (snip && snip.browserRect) {
        // Re-send OCR request with new coordinates
        resendOCRRequest(snip);
      }
      setResizing(null);
      return;
    }

    if (!isDrawing || !currentRect || currentRect.width < 10 || currentRect.height < 10) {
      // Ignore very small selections (likely accidental clicks)
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentRect(null);
      return;
    }

    // Convert browser pixel coordinates to normalized PDF coordinates
    const normalizedCoords = convertToNormalizedPDFCoords(
      currentRect,
      scale,
      pageDimensions
    );

    const snipId = crypto.randomUUID();

    // Add snip to context (non-blocking UI per FR-025)
    const newSnip = {
      id: snipId,
      pageNumber,
      rect: normalizedCoords,
      browserRect: currentRect, // Keep for visual feedback
      status: 'pending', // Will change to 'processing' → 'success'/'error'
      createdAt: Date.now(),
    };

    addSnip(newSnip);

    // Announce to screen reader
    announceToScreenReader(`Snip created on page ${pageNumber}. Processing OCR...`, 'status');

    // Enqueue OCR request (non-blocking, FIFO queue with max 50 requests)
    const requestId = ocrQueue.enqueue(
      {
        page: pageNumber,
        rect: normalizedCoords,
      },
      // Success callback
      (extractedText) => {
        updateSnip(snipId, { status: 'success' });

        // Create new text box with extracted text
        const textBox = {
          id: crypto.randomUUID(),
          text: extractedText || '', // Handle empty text case
          pageNumber,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        addTextBox(textBox);

        // Announce success
        if (extractedText) {
          announceToScreenReader(`OCR complete. Text extracted: ${extractedText.substring(0, 50)}...`, 'status');
        } else {
          announceToScreenReader('OCR complete. No text detected in this region.', 'status');
        }
      },
      // Error callback
      (error) => {
        updateSnip(snipId, { status: 'error', error: error.message });
        announceToScreenReader(`OCR failed: ${error.message}`, 'error');
      },
      // Timeout callback
      () => {
        updateSnip(snipId, { status: 'error', error: 'Request timed out' });
        announceToScreenReader('OCR request timed out after 30 seconds', 'error');
      }
    );

    if (!requestId) {
      // Queue is full (more than 50 pending requests)
      updateSnip(snipId, { status: 'error', error: 'Too many pending requests' });
      announceToScreenReader('Too many pending OCR requests. Please wait for current requests to complete.', 'error');
    } else {
      // Update snip to processing status
      updateSnip(snipId, { status: 'processing' });
    }

    // Reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      role="application"
      aria-label="Snipping overlay - draw rectangles to select text regions"
    >
      {currentRect && (
        <div
          className={styles.selection}
          style={{
            left: `${currentRect.x}px`,
            top: `${currentRect.y}px`,
            width: `${currentRect.width}px`,
            height: `${currentRect.height}px`,
          }}
        />
      )}

      {/* Render all snips with resize handles */}
      {snips
        .filter((snip) => snip.pageNumber === pageNumber && snip.browserRect)
        .map((snip) => (
          <div key={snip.id}>
            {/* Snip rectangle */}
            <div
              className={`${styles.snipRect} ${snip.id === selectedSnipId ? styles.selected : ''} ${snip.status === 'processing' ? styles.processing : ''}`}
              style={{
                left: `${snip.browserRect.x}px`,
                top: `${snip.browserRect.y}px`,
                width: `${snip.browserRect.width}px`,
                height: `${snip.browserRect.height}px`,
              }}
              onClick={() => setSelectedSnipId(snip.id)}
              aria-label={`Selection ${snip.status === 'processing' ? 'processing' : 'completed'}`}
            >
              {snip.status === 'processing' && (
                <div className={styles.spinner} />
              )}
            </div>

            {/* Delete button */}
            <button
              className={styles.deleteButton}
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width - 24}px`,
                top: `${snip.browserRect.y - 12}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                deleteSnip(snip.id);
                if (selectedSnipId === snip.id) {
                  setSelectedSnipId(null);
                }
                announceToScreenReader('Selection deleted', 'status');
              }}
              aria-label="Delete selection"
              title="Delete selection (or press Delete key)"
            >
              ×
            </button>

            {/* Resize handles */}
            <div
              className={styles.resizeHandle}
              data-handle="nw"
              style={{
                left: `${snip.browserRect.x - 4}px`,
                top: `${snip.browserRect.y - 4}px`,
                cursor: 'nw-resize',
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="ne"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width - 4}px`,
                top: `${snip.browserRect.y - 4}px`,
                cursor: 'ne-resize',
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="sw"
              style={{
                left: `${snip.browserRect.x - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height - 4}px`,
                cursor: 'sw-resize',
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="se"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height - 4}px`,
                cursor: 'se-resize',
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="n"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width / 2 - 4}px`,
                top: `${snip.browserRect.y - 4}px`,
                cursor: 'n-resize',
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="s"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width / 2 - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height - 4}px`,
                cursor: 's-resize',
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="w"
              style={{
                left: `${snip.browserRect.x - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height / 2 - 4}px`,
                cursor: 'w-resize',
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="e"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height / 2 - 4}px`,
                cursor: 'e-resize',
              }}
            />
          </div>
        ))}
    </div>
  );
}

// Helper function to announce messages to screen readers
function announceToScreenReader(message, type = 'status') {
  const elementId = type === 'error' ? 'error-announcements' : 'status-announcements';
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    setTimeout(() => {
      element.textContent = '';
    }, 1000);
  }
}
