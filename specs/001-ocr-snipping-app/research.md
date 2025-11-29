# Research: OCR Snipping & Summarization Application

**Date**: 2025-10-29
**Feature**: OCR Snipping & Summarization Application
**Branch**: `001-ocr-snipping-app`

This document consolidates research findings to resolve implementation decisions and validate technology choices for the OCR application.

---

## 1. React PDF Viewer Plugin Architecture

### Decision
Use **@react-pdf-viewer/default-layout** plugin combined with **custom onCanvasLayerRender plugin** for snipping overlay.

### Rationale
- Default Layout plugin provides integrated UI with thumbnails, toolbar, and zoom controls out-of-the-box
- Built-in virtualization handles large PDFs (50-100 pages) efficiently
- Custom plugin via `onCanvasLayerRender` hook provides direct canvas access for drawing rectangles
- Plugin architecture ensures proper lifecycle management and coordinate scaling with zoom/pan

### Implementation Approach

**Core Setup:**
```javascript
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { thumbnailPlugin } from '@react-pdf-viewer/thumbnail';
import { zoomPlugin } from '@react-pdf-viewer/zoom';

const defaultLayoutPluginInstance = defaultLayoutPlugin();
const thumbnailPluginInstance = thumbnailPlugin({ thumbnailWidth: 120 });
const zoomPluginInstance = zoomPlugin();

<Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js">
  <Viewer
    fileUrl={fileUrl}
    plugins={[defaultLayoutPluginInstance, thumbnailPluginInstance, zoomPluginInstance]}
  />
</Worker>
```

**Custom Overlay for Snipping:**
- Create plugin using `onCanvasLayerRender` hook
- Access canvas element via `e.ele` and scale factor via `e.scale`
- Overlay canvas positioned absolutely over PDF canvas
- Mouse event handlers for mousedown, mousemove, mouseup
- Rectangle drawing with semi-transparent fill and colored stroke

**Page Dimensions:**
- Use `onDocumentLoad` callback to extract page dimensions via `doc.getPage()`
- Viewport API provides width/height in PDF points (72 points = 1 inch)
- Scale factor from `onCanvasLayerRender` converts points to pixels

### Alternatives Considered
- **PDF.js directly without React wrapper**: More control but loses React integration, requires manual lifecycle management
- **React-PDF library**: Simpler API but lacks full viewer UI, no built-in thumbnails or toolbar
- **HTML5 Canvas overlay without plugin**: Requires manual coordinate syncing with zoom/pan operations
- **Commercial viewer (Apryse WebViewer)**: Excellent features but introduces licensing costs and complexity unnecessary for MVP

---

## 2. Material UI Accessibility Features

### Decision
Use **MUI createTheme() with contrastThreshold: 4.5** for WCAG 2.1 AA compliance and **pre-rendered aria-live regions** for screen reader announcements.

### Rationale
- MUI's built-in theming system automatically calculates compliant color pairs when `contrastThreshold: 4.5` is set
- TextField, Button, and other MUI components include ARIA attributes by default (aria-labelledby, aria-describedby, aria-required)
- Keyboard activation (Enter, Space) works automatically on Button components - no manual setup needed
- FocusTrap component (from @mui/base) handles modal/dialog focus containment per WCAG requirements
- Pre-rendered aria-live regions work reliably with screen readers (dynamically added regions often fail)

### Implementation Approach

**High-Contrast Theme:**
```javascript
const accessibleTheme = createTheme({
  palette: {
    mode: 'light',
    contrastThreshold: 4.5,
    primary: { main: '#1976d2', contrastText: '#ffffff' },
    text: { primary: '#212121', secondary: '#424242' },
  },
});
```

**Accessible TextField:**
```javascript
<TextField
  label="Document Name"
  helperText="Enter descriptive name"
  required
  slotProps={{
    htmlInput: { 'aria-required': 'true' }
  }}
/>
```

**ARIA Live Regions (Pre-rendered on page load):**
```javascript
// Must exist in DOM before dynamic content injected
<div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
  {statusMessage}
</div>
<div aria-live="assertive" aria-atomic="true" role="alert" className="sr-only">
  {errorMessage}
</div>
```

**Focus Management:**
- Dialog and Modal components include FocusTrap automatically
- Use `autoFocus` prop on first input in dialogs
- Implement `:focus-visible` CSS for keyboard-only focus indicators
- Restore focus to trigger element after closing overlays

### Alternatives Considered
- **Manual color contrast calculation**: Error-prone, reinvents MUI's built-in functionality
- **aria-label instead of label prop**: Loses visual label benefit for all users
- **Dynamically adding role="alert"**: Unreliable with screen readers, must pre-render regions
- **Custom button implementations**: Loses keyboard activation, focus management, and ARIA support

---

## 3. Mock Service Worker (MSW) Setup

### Decision
Use **domain-based handler organization** with `setupWorker()` initialized in index.js before React root render.

### Rationale
- Pre-render initialization ensures Service Worker is ready before React mounts (prevents race conditions)
- Domain-based modules (ocrHandlers.js, summaryHandlers.js) scale better than monolithic files
- Same handlers work across development, testing, and Storybook environments
- MSW v2 `http` namespace and `HttpResponse` API follows modern patterns (deprecated `rest` + `ctx`)
- Built-in `delay()` function simulates realistic network latency for testing loading states
- Runtime `worker.use()` enables dynamic error injection without modifying base handlers

### Implementation Approach

**Entry Point (index.js):**
```javascript
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'warn' });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
});
```

**Browser Worker Setup (mocks/browser.js):**
```javascript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

**OCR Handler Module (mocks/handlers/ocrHandlers.js):**
```javascript
import { http, HttpResponse, delay } from 'msw';

export const ocrHandlers = [
  http.post('/api/snip-crop', async ({ request }) => {
    await delay(1200); // Simulate 1.2s OCR processing

    const body = await request.json();

    // Simulate errors for testing
    if (body.testError === 'network') return HttpResponse.error();
    if (body.testError === 'server') {
      return HttpResponse.json({ error: 'OCR service unavailable' }, { status: 500 });
    }

    return HttpResponse.json({
      success: true,
      text: 'Extracted text from PDF region',
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    });
  }),
];
```

**Summarization Handler Module (mocks/handlers/summaryHandlers.js):**
```javascript
export const summaryHandlers = [
  http.post('/api/summarize', async ({ request }) => {
    await delay(1500); // Simulate 1.5s AI processing

    const body = await request.json();

    if (body.testError === 'timeout') {
      return HttpResponse.json({ error: 'Processing timeout' }, { status: 504 });
    }

    return HttpResponse.json({
      success: true,
      summary: `Summary: ${body.texts.join(' ').substring(0, 100)}...`,
      wordCount: body.texts.join(' ').split(' ').length,
    });
  }),
];
```

### Alternatives Considered
- **Single monolithic handlers.js**: Simpler for small APIs but difficult to maintain at scale
- **Feature-based co-location**: Better for 100+ endpoints but adds complexity and potential circular dependencies
- **No delay/error simulation**: Insufficient for testing loading states and error handling
- **setupServer for browser**: Works but not recommended; setupWorker is official MSW v2 approach for browsers

---

## 4. Coordinate Conversion Patterns

### Decision
**Normalize pixel coordinates to 0-1 range** relative to displayed page dimensions, then **invert y-axis** when sending to backend (PDF origin is bottom-left, browser is top-left).

### Rationale
- Normalized coordinates (fractions) are resolution-independent - backend can scale to any DPI
- Y-axis inversion required because PDF coordinate system originates at bottom-left while browser canvas originates at top-left
- Scale factor from React PDF Viewer's `onCanvasLayerRender` automatically accounts for zoom level
- This approach aligns with constitution Principle IV requirement for coordinate precision

### Implementation Approach

**Coordinate Conversion Utility (utils/coordinates.js):**
```javascript
/**
 * Convert browser canvas coordinates to normalized PDF coordinates
 *
 * @param {number} canvasX - X position in canvas pixels
 * @param {number} canvasY - Y position in canvas pixels (top-left origin)
 * @param {number} canvasWidth - Selection width in canvas pixels
 * @param {number} canvasHeight - Selection height in canvas pixels
 * @param {number} pageWidth - PDF page width in points
 * @param {number} pageHeight - PDF page height in points
 * @param {number} scale - Current zoom scale factor
 * @returns {object} Normalized coordinates {x, y, width, height} in 0-1 range
 */
export function convertToNormalizedPDFCoords(
  canvasX,
  canvasY,
  canvasWidth,
  canvasHeight,
  pageWidth,
  pageHeight,
  scale
) {
  // Step 1: Remove scale transformation (canvas pixels → PDF points)
  const pdfX = canvasX / scale;
  const pdfY = canvasY / scale;
  const pdfWidth = canvasWidth / scale;
  const pdfHeight = canvasHeight / scale;

  // Step 2: Invert Y-axis (browser top-left → PDF bottom-left)
  const invertedY = pageHeight - (pdfY + pdfHeight);

  // Step 3: Normalize to 0-1 range (resolution-independent)
  return {
    x: pdfX / pageWidth,
    y: invertedY / pageHeight,
    width: pdfWidth / pageWidth,
    height: pdfHeight / pageHeight,
  };
}

/**
 * Get page dimensions from React PDF Viewer
 */
export function extractPageDimensions(doc, pageIndex) {
  return doc.getPage(pageIndex + 1).then(page => {
    const viewport = page.getViewport({ scale: 1 });
    return {
      width: viewport.width,  // In PDF points (72 points = 1 inch)
      height: viewport.height,
    };
  });
}
```

**Usage in SnipOverlay Component:**
```javascript
const onMouseUp = (e) => {
  const rect = canvasOverlay.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;

  const normalizedCoords = convertToNormalizedPDFCoords(
    Math.min(startX, endX),
    Math.min(startY, endY),
    Math.abs(endX - startX),
    Math.abs(endY - startY),
    pageWidth,
    pageHeight,
    scale
  );

  // Send normalized coordinates to backend
  api.cropAndExtract({ page: currentPage, rect: normalizedCoords });
};
```

### Alternatives Considered
- **Sending pixel coordinates directly**: Fails when backend renders at different DPI (e.g., 300 DPI for high-quality OCR)
- **Hardcoding standard page sizes**: Fails for non-standard PDF dimensions
- **Using only canvas dimensions without scale factor**: Ignores zoom level, leads to incorrect coordinate mapping
- **Not inverting Y-axis**: Coordinates would be upside-down from PDF perspective

---

## 5. Undo/Redo Implementation

### Decision
Use **command pattern with state snapshots** stored in memory (no persistence per FR-061). Undo stack includes all user actions: snip creation/deletion, text box operations (insert, delete, merge), and text edits.

### Rationale
- Command pattern allows undoing diverse operation types (snips, text boxes, edits) with a unified interface
- State snapshots capture entire application state at each action for reliable undo/redo
- Memory-only storage aligns with constitution requirement (FR-061: no client-side persistence of medical data)
- History stack size limit (50 actions) prevents memory overflow while covering typical session usage

### Implementation Approach

**Undo Hook (hooks/useUndo.js):**
```javascript
import { useState, useCallback } from 'react';

export function useUndo(initialState, maxHistory = 50) {
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((newState) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newState);

    // Limit history size
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    } else {
      setCurrentIndex(currentIndex + 1);
    }

    setHistory(newHistory);
    setState(newState);
  }, [history, currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setState(history[newIndex]);
    }
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setState(history[newIndex]);
    }
  }, [canRedo, currentIndex, history]);

  return { state, setState: pushState, undo, redo, canUndo, canRedo };
}
```

**Usage in App Context:**
```javascript
const initialState = { snips: [], textBoxes: [], focusedBoxId: null };
const { state, setState, undo, redo, canUndo, canRedo } = useUndo(initialState);

// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);
```

### Alternatives Considered
- **Incremental change tracking**: More memory-efficient but complex to implement for diverse operation types
- **Event sourcing pattern**: Overkill for single-user session without persistence
- **Browser history API**: Not suitable for application state undo/redo
- **Limited undo to text edits only**: Doesn't meet clarification #2 requirement (all user actions including snips)

---

## 6. Non-Blocking UI with Queued OCR Processing

### Decision
Use **in-memory queue** to manage OCR requests sequentially while allowing immediate snip creation (non-blocking UI).

### Rationale
- Clarification #4 specifies users can draw new snips immediately while OCR processes previous requests
- Sequential processing (FIFO queue) ensures text boxes appear in order of snip creation (FR-026)
- In-memory queue is sufficient - no persistence needed per FR-061
- Loading indicators per snip provide feedback without blocking UI interactions

### Implementation Approach

**OCR Queue Manager (services/ocrQueue.js):**
```javascript
class OCRQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async enqueue(snip, onSuccess, onError) {
    this.queue.push({ snip, onSuccess, onError });

    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { snip, onSuccess, onError } = this.queue.shift();

    try {
      const result = await fetch('/api/snip-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: snip.page, rect: snip.rect }),
      });

      const data = await result.json();
      onSuccess({ ...snip, text: data.text, id: data.id });
    } catch (error) {
      onError(snip, error);
    }

    // Process next item
    this.processQueue();
  }
}

export const ocrQueue = new OCRQueue();
```

**Usage in SnipOverlay:**
```javascript
const handleSnipComplete = (normalizedRect) => {
  const snip = {
    id: `snip-${Date.now()}`,
    page: currentPage,
    rect: normalizedRect,
    status: 'pending', // 'pending' | 'processing' | 'success' | 'error'
  };

  // Add to state immediately (non-blocking)
  setSnips(prev => [...prev, snip]);

  // Queue OCR request
  ocrQueue.enqueue(
    snip,
    (completedSnip) => {
      // Update snip with extracted text
      setSnips(prev => prev.map(s => s.id === completedSnip.id ? completedSnip : s));
    },
    (failedSnip, error) => {
      // Mark snip as failed
      setSnips(prev => prev.map(s => s.id === failedSnip.id ? { ...s, status: 'error', error } : s));
    }
  );
};
```

### Alternatives Considered
- **Parallel OCR requests**: Results may arrive out of order, violating FR-026 requirement
- **Blocking UI until OCR completes**: Poor UX, violates clarification #4 non-blocking requirement
- **Limited concurrency (e.g., 3 simultaneous requests)**: More complex, unnecessary for typical single-user workflow
- **External queue library (Bull, BeeQueue)**: Overkill for frontend-only, in-memory queue

---

## Summary: Technology Stack Decisions

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | React | 18.2+ | Constitution-mandated, modern hooks API |
| **PDF Rendering** | @react-pdf-viewer/core | 3.12.0 | Accessibility-focused, built-in virtualization |
| **UI Library** | Material UI (MUI) | 5.x | WCAG 2.1 AA compliant out-of-box, rich components |
| **State Management** | React Context API | Built-in | Sufficient for single-user sessions, no Redux needed |
| **API Stubbing** | Mock Service Worker (MSW) | 2.x | Service Worker approach, works across all environments |
| **Testing** | Jest + Cypress/Playwright + axe-core | Latest | Unit, E2E, accessibility testing as mandated |
| **Coordinate System** | Custom utility + PDF.js viewport API | N/A | Normalized coords with y-axis inversion |
| **Undo/Redo** | Custom useUndo hook with command pattern | N/A | Comprehensive history (snips + text + operations) |
| **OCR Queue** | Custom in-memory queue | N/A | Non-blocking UI with sequential processing |

---

## Installation Commands

```bash
# Core dependencies
npm install react@18.2.0 react-dom@18.2.0

# PDF rendering
npm install @react-pdf-viewer/core@3.12.0 pdfjs-dist@3.4.120
npm install @react-pdf-viewer/default-layout@3.12.0
npm install @react-pdf-viewer/thumbnail@3.12.0
npm install @react-pdf-viewer/zoom@3.12.0

# UI library
npm install @mui/material@5.14.0 @mui/icons-material@5.14.0
npm install @emotion/react@11.11.0 @emotion/styled@11.11.0

# Development tools
npm install --save-dev msw@2.0.0
npm install --save-dev jest@29.6.0 @testing-library/react@14.0.0
npm install --save-dev cypress@13.0.0  # OR playwright@1.40.0
npm install --save-dev axe-core@4.8.0 @axe-core/react@4.8.0

# Initialize MSW
npx msw init ./public
```

---

## Next Steps

All research tasks resolved. Proceed to Phase 1:
1. Generate data-model.md (entity definitions, state shape)
2. Generate API contracts (OpenAPI specs for /api/snip-crop, /api/summarize)
3. Generate quickstart.md (local development guide)
4. Update agent context file with technology stack
