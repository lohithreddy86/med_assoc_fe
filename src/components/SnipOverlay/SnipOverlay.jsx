import { useState, useRef, useEffect, useCallback } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { ocrQueue } from "../../services/ocrQueue";
import styles from "./SnipOverlay.module.css";

export function SnipOverlay({ scale, pageDimensions, pageNumber }) {
  const { addSnip, updateSnip, addTextBox, deleteSnip, snips, pdfId } =
    useAppContext();
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [selectedSnipId, setSelectedSnipId] = useState(null);
  const [resizing, setResizing] = useState(null);
  const overlayRef = useRef(null);

  // Helper: Get the current page canvas element and its dimensions
  // CRITICAL: Must find the canvas for the CURRENT PAGE, not just any canvas
  // In a multi-page PDF, querySelector returns the first canvas (page 1),
  // but we need the canvas for pageNumber (e.g., page 6)
  const getPageInfo = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return null;
    }

    const overlayRect = overlay.getBoundingClientRect();
    const parent = overlay.parentElement;

    // Strategy 1: Find the canvas that's currently visible in the viewport
    // This is more reliable than trying to find by page number attribute
    const allCanvases = parent?.querySelectorAll('canvas') || [];
    let bestCanvas = null;
    let bestVisibility = 0;

    for (const canvas of allCanvases) {
      const rect = canvas.getBoundingClientRect();

      // Check how much of this canvas is visible in the overlay
      const overlapTop = Math.max(rect.top, overlayRect.top);
      const overlapBottom = Math.min(rect.bottom, overlayRect.bottom);
      const overlapLeft = Math.max(rect.left, overlayRect.left);
      const overlapRight = Math.min(rect.right, overlayRect.right);

      if (overlapBottom > overlapTop && overlapRight > overlapLeft) {
        const visibleArea = (overlapBottom - overlapTop) * (overlapRight - overlapLeft);
        const canvasArea = rect.width * rect.height;
        const visibility = canvasArea > 0 ? visibleArea / canvasArea : 0;

        // Pick the canvas with most visibility
        if (visibility > bestVisibility) {
          bestVisibility = visibility;
          bestCanvas = canvas;
        }
      }
    }

    if (bestCanvas) {
      const canvasRect = bestCanvas.getBoundingClientRect();
      const result = {
        offsetX: canvasRect.left - overlayRect.left,
        offsetY: canvasRect.top - overlayRect.top,
        pageWidth: canvasRect.width,
        pageHeight: canvasRect.height,
        found: true,
        visibility: bestVisibility,
        canvasCount: allCanvases.length,
      };
      console.log("[SnipOverlay] Found visible page canvas:", result);
      return result;
    }

    // Fallback: use pageDimensions prop scaled by zoom
    const fallback = {
      offsetX: 0,
      offsetY: 0,
      pageWidth: pageDimensions.width * scale,
      pageHeight: pageDimensions.height * scale,
      found: false,
      canvasCount: allCanvases.length,
    };
    console.warn("[SnipOverlay] No visible canvas found, using fallback:", fallback);
    return fallback;
  }, [pageDimensions, scale]);

  // Helper: Convert overlay-relative rect to normalized PDF coordinates
  const convertToNormalizedPDFCoords = useCallback((browserRect) => {
    const pageInfo = getPageInfo();

    if (!pageInfo) {
      console.error("[SnipOverlay] Cannot convert coordinates - no page info");
      return { x: 0, y: 0, width: 0.1, height: 0.1 };
    }

    // Calculate position relative to the page canvas (not the overlay)
    const pageRelativeX = browserRect.x - pageInfo.offsetX;
    const pageRelativeY = browserRect.y - pageInfo.offsetY;

    // Normalize to 0-1 range relative to page dimensions
    const normalizedX = pageRelativeX / pageInfo.pageWidth;
    const normalizedY = pageRelativeY / pageInfo.pageHeight;
    const normalizedWidth = browserRect.width / pageInfo.pageWidth;
    const normalizedHeight = browserRect.height / pageInfo.pageHeight;

    // CRITICAL: Convert browser Y to PDF Y coordinate system
    // Browser: Y=0 at TOP, increases downward
    // PDF: Y=0 at BOTTOM, increases upward
    //
    // Browser selection at top (normalizedY ≈ 0) should map to PDF top (high Y)
    // Browser selection at bottom (normalizedY ≈ 1) should map to PDF bottom (low Y)
    //
    // The PDF rect.y represents the BOTTOM edge of the selection
    // Browser bottom edge = normalizedY + normalizedHeight
    // PDF bottom edge = 1.0 - browserBottomEdge = 1.0 - (normalizedY + normalizedHeight)
    const pdfBottomEdge = 1.0 - (normalizedY + normalizedHeight);

    // Clamp helper
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    const result = {
      x: clamp(normalizedX, 0, 1),
      y: clamp(pdfBottomEdge, 0, 1),  // PDF y = bottom edge
      width: clamp(normalizedWidth, 0.001, 1),
      height: clamp(normalizedHeight, 0.001, 1),
    };

    // Ensure selection doesn't exceed page bounds
    if (result.x + result.width > 1.0) result.width = 1.0 - result.x;
    if (result.y + result.height > 1.0) result.height = 1.0 - result.y;

    // Detailed debug logging
    console.log("[SnipOverlay] Coordinate conversion:", {
      input: {
        browserRect,
        pageInfo: { ...pageInfo },
      },
      calculation: {
        pageRelativeX,
        pageRelativeY,
        normalizedX: normalizedX.toFixed(3),
        normalizedY: normalizedY.toFixed(3),
        normalizedWidth: normalizedWidth.toFixed(3),
        normalizedHeight: normalizedHeight.toFixed(3),
        browserTopEdge: `${(normalizedY * 100).toFixed(1)}% from browser top`,
        browserBottomEdge: `${((normalizedY + normalizedHeight) * 100).toFixed(1)}% from browser top`,
        pdfBottomEdge: `${(pdfBottomEdge * 100).toFixed(1)}% from PDF bottom`,
      },
      output: result,
    });

    return result;
  }, [getPageInfo]);

  // Helper: Re-send OCR request after resizing
  const resendOCRRequest = useCallback(
    (snip) => {
      const normalizedCoords = convertToNormalizedPDFCoords(snip.browserRect);

      updateSnip(snip.id, {
        rect: normalizedCoords,
        status: "pending",
      });

      const requestId = ocrQueue.enqueue(
        {
          pdf_id: pdfId,
          page: pageNumber,
          rect: normalizedCoords,
        },
        (extractedText) => {
          updateSnip(snip.id, { status: "success" });
          const textBox = {
            id: crypto.randomUUID(),
            text: extractedText || "",
            pageNumber,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
          };
          addTextBox(textBox);
          if (extractedText) {
            announceToScreenReader(
              `OCR complete. Text extracted: ${extractedText.substring(0, 50)}...`,
              "status",
            );
          } else {
            announceToScreenReader(
              "OCR complete. No text detected in this region.",
              "status",
            );
          }
        },
        (error) => {
          updateSnip(snip.id, { status: "error", error: error.message });
          announceToScreenReader(`OCR failed: ${error.message}`, "error");
        },
        () => {
          updateSnip(snip.id, { status: "error", error: "Request timed out" });
          announceToScreenReader(
            "OCR request timed out after 30 seconds",
            "error",
          );
        },
      );

      if (!requestId) {
        updateSnip(snip.id, {
          status: "error",
          error: "Too many pending requests",
        });
        announceToScreenReader(
          "Too many pending OCR requests. Please wait for current requests to complete.",
          "error",
        );
      } else {
        updateSnip(snip.id, { status: "processing" });
        announceToScreenReader(`Selection resized. Processing OCR...`, "status");
      }
    },
    [convertToNormalizedPDFCoords, pageNumber, updateSnip, addTextBox, pdfId],
  );

  // Keyboard handler for moving/resizing selections
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedSnipId) return;

      const snip = snips.find((s) => s.id === selectedSnipId);
      if (!snip || !snip.browserRect) return;

      const moveStep = 5;
      const resizeStep = 5;
      let newRect = { ...snip.browserRect };
      let changed = false;

      if (e.shiftKey) {
        switch (e.key) {
          case "ArrowUp":
            newRect.height = Math.max(10, newRect.height - resizeStep);
            changed = true;
            break;
          case "ArrowDown":
            newRect.height = newRect.height + resizeStep;
            changed = true;
            break;
          case "ArrowLeft":
            newRect.width = Math.max(10, newRect.width - resizeStep);
            changed = true;
            break;
          case "ArrowRight":
            newRect.width = newRect.width + resizeStep;
            changed = true;
            break;
          default:
            break;
        }
      } else {
        switch (e.key) {
          case "ArrowUp":
            newRect.y = Math.max(0, newRect.y - moveStep);
            changed = true;
            break;
          case "ArrowDown":
            newRect.y = newRect.y + moveStep;
            changed = true;
            break;
          case "ArrowLeft":
            newRect.x = Math.max(0, newRect.x - moveStep);
            changed = true;
            break;
          case "ArrowRight":
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

        if (window.resizeOCRTimeout) {
          clearTimeout(window.resizeOCRTimeout);
        }
        window.resizeOCRTimeout = setTimeout(() => {
          resendOCRRequest({ ...snip, browserRect: newRect });
        }, 500);

        const action = e.shiftKey ? "resized" : "moved";
        announceToScreenReader(`Selection ${action} using arrow keys`, "status");
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSnip(selectedSnipId);
        setSelectedSnipId(null);
        announceToScreenReader("Selection deleted", "status");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (window.resizeOCRTimeout) {
        clearTimeout(window.resizeOCRTimeout);
      }
    };
  }, [selectedSnipId, snips, updateSnip, deleteSnip, resendOCRRequest]);

  // Helper: Get handle at position
  const getHandleAtPosition = useCallback(
    (x, y) => {
      const currentPageSnips = snips.filter(
        (s) => s.pageNumber === pageNumber && s.browserRect,
      );

      for (const snip of currentPageSnips) {
        const { browserRect } = snip;
        const handleSize = 8;
        const handles = {
          nw: { x: browserRect.x, y: browserRect.y },
          ne: { x: browserRect.x + browserRect.width, y: browserRect.y },
          sw: { x: browserRect.x, y: browserRect.y + browserRect.height },
          se: {
            x: browserRect.x + browserRect.width,
            y: browserRect.y + browserRect.height,
          },
          n: { x: browserRect.x + browserRect.width / 2, y: browserRect.y },
          s: {
            x: browserRect.x + browserRect.width / 2,
            y: browserRect.y + browserRect.height,
          },
          w: { x: browserRect.x, y: browserRect.y + browserRect.height / 2 },
          e: {
            x: browserRect.x + browserRect.width,
            y: browserRect.y + browserRect.height / 2,
          },
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
    },
    [snips, pageNumber],
  );

  // Mouse down - start drawing or resizing
  // Use OVERLAY-relative coordinates for visual feedback
  const handleMouseDown = (e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handle = getHandleAtPosition(x, y);
    if (handle) {
      setResizing(handle);
      setSelectedSnipId(handle.snipId);
      return;
    }

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

    if (resizing) {
      const snip = snips.find((s) => s.id === resizing.snipId);
      if (!snip || !snip.browserRect) return;

      const { browserRect } = snip;
      let newRect = { ...browserRect };

      switch (resizing.handle) {
        case "nw":
          newRect = {
            x: currentX,
            y: currentY,
            width: browserRect.x + browserRect.width - currentX,
            height: browserRect.y + browserRect.height - currentY,
          };
          break;
        case "ne":
          newRect = {
            x: browserRect.x,
            y: currentY,
            width: currentX - browserRect.x,
            height: browserRect.y + browserRect.height - currentY,
          };
          break;
        case "sw":
          newRect = {
            x: currentX,
            y: browserRect.y,
            width: browserRect.x + browserRect.width - currentX,
            height: currentY - browserRect.y,
          };
          break;
        case "se":
          newRect = {
            x: browserRect.x,
            y: browserRect.y,
            width: currentX - browserRect.x,
            height: currentY - browserRect.y,
          };
          break;
        case "n":
          newRect = {
            x: browserRect.x,
            y: currentY,
            width: browserRect.width,
            height: browserRect.y + browserRect.height - currentY,
          };
          break;
        case "s":
          newRect = {
            x: browserRect.x,
            y: browserRect.y,
            width: browserRect.width,
            height: currentY - browserRect.y,
          };
          break;
        case "w":
          newRect = {
            x: currentX,
            y: browserRect.y,
            width: browserRect.x + browserRect.width - currentX,
            height: browserRect.height,
          };
          break;
        case "e":
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

      if (newRect.width < 0) {
        newRect.x = newRect.x + newRect.width;
        newRect.width = Math.abs(newRect.width);
      }
      if (newRect.height < 0) {
        newRect.y = newRect.y + newRect.height;
        newRect.height = Math.abs(newRect.height);
      }

      updateSnip(resizing.snipId, { browserRect: newRect });
      return;
    }

    if (!isDrawing || !startPoint) return;

    const width = currentX - startPoint.x;
    const height = currentY - startPoint.y;

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
    if (resizing) {
      const snip = snips.find((s) => s.id === resizing.snipId);
      if (snip && snip.browserRect) {
        resendOCRRequest(snip);
      }
      setResizing(null);
      return;
    }

    if (
      !isDrawing ||
      !currentRect ||
      currentRect.width < 10 ||
      currentRect.height < 10
    ) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentRect(null);
      return;
    }

    // Convert to normalized PDF coordinates (accounting for page offset)
    const normalizedCoords = convertToNormalizedPDFCoords(currentRect);

    const snipId = crypto.randomUUID();

    const newSnip = {
      id: snipId,
      pageNumber,
      rect: normalizedCoords,
      browserRect: currentRect,
      status: "pending",
      createdAt: Date.now(),
    };

    addSnip(newSnip);

    announceToScreenReader(
      `Snip created on page ${pageNumber}. Processing OCR...`,
      "status",
    );

    const requestId = ocrQueue.enqueue(
      {
        pdf_id: pdfId,
        page: pageNumber,
        rect: normalizedCoords,
      },
      (extractedText) => {
        updateSnip(snipId, { status: "success" });

        const textBox = {
          id: crypto.randomUUID(),
          text: extractedText || "",
          pageNumber,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        addTextBox(textBox);

        if (extractedText) {
          announceToScreenReader(
            `OCR complete. Text extracted: ${extractedText.substring(0, 50)}...`,
            "status",
          );
        } else {
          announceToScreenReader(
            "OCR complete. No text detected in this region.",
            "status",
          );
        }
      },
      (error) => {
        updateSnip(snipId, { status: "error", error: error.message });
        announceToScreenReader(`OCR failed: ${error.message}`, "error");
      },
      () => {
        updateSnip(snipId, { status: "error", error: "Request timed out" });
        announceToScreenReader(
          "OCR request timed out after 30 seconds",
          "error",
        );
      },
    );

    if (!requestId) {
      updateSnip(snipId, {
        status: "error",
        error: "Too many pending requests",
      });
      announceToScreenReader(
        "Too many pending OCR requests. Please wait for current requests to complete.",
        "error",
      );
    } else {
      updateSnip(snipId, { status: "processing" });
    }

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

      {snips
        .filter((snip) => snip.pageNumber === pageNumber && snip.browserRect)
        .map((snip) => (
          <div key={snip.id}>
            <div
              className={`${styles.snipRect} ${snip.id === selectedSnipId ? styles.selected : ""} ${snip.status === "processing" ? styles.processing : ""}`}
              style={{
                left: `${snip.browserRect.x}px`,
                top: `${snip.browserRect.y}px`,
                width: `${snip.browserRect.width}px`,
                height: `${snip.browserRect.height}px`,
              }}
              onClick={() => setSelectedSnipId(snip.id)}
              aria-label={`Selection ${snip.status === "processing" ? "processing" : "completed"}`}
            >
              {snip.status === "processing" && (
                <div className={styles.spinner} />
              )}
            </div>

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
                announceToScreenReader("Selection deleted", "status");
              }}
              aria-label="Delete selection"
              title="Delete selection (or press Delete key)"
            >
              ×
            </button>

            <div
              className={styles.resizeHandle}
              data-handle="nw"
              style={{
                left: `${snip.browserRect.x - 4}px`,
                top: `${snip.browserRect.y - 4}px`,
                cursor: "nw-resize",
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="ne"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width - 4}px`,
                top: `${snip.browserRect.y - 4}px`,
                cursor: "ne-resize",
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="sw"
              style={{
                left: `${snip.browserRect.x - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height - 4}px`,
                cursor: "sw-resize",
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="se"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height - 4}px`,
                cursor: "se-resize",
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="n"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width / 2 - 4}px`,
                top: `${snip.browserRect.y - 4}px`,
                cursor: "n-resize",
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="s"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width / 2 - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height - 4}px`,
                cursor: "s-resize",
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="w"
              style={{
                left: `${snip.browserRect.x - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height / 2 - 4}px`,
                cursor: "w-resize",
              }}
            />
            <div
              className={styles.resizeHandle}
              data-handle="e"
              style={{
                left: `${snip.browserRect.x + snip.browserRect.width - 4}px`,
                top: `${snip.browserRect.y + snip.browserRect.height / 2 - 4}px`,
                cursor: "e-resize",
              }}
            />
          </div>
        ))}
    </div>
  );
}

// Helper function to announce messages to screen readers
function announceToScreenReader(message, type = "status") {
  const elementId =
    type === "error" ? "error-announcements" : "status-announcements";
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    setTimeout(() => {
      element.textContent = "";
    }, 1000);
  }
}
