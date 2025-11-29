import { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography, ButtonGroup, Button, Tooltip } from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  FitScreen,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { thumbnailPlugin } from '@react-pdf-viewer/thumbnail';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/thumbnail/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppContext } from '../../contexts/AppContext';
import { extractPageDimensions } from '../../utils/coordinates';
import { SnipOverlay } from '../SnipOverlay/SnipOverlay';

// PDF.js worker URL (T027) - Must match pdfjs-dist version
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Configure PDF.js worker (same as PDFUploader)
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

// Zoom levels per FR-009 (8 preset levels)
const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

export function PDFViewerPane() {
  const { pdfDocument, pdfMetadata, currentPage, setCurrentPage } = useAppContext();
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [zoomLevelIndex, setZoomLevelIndex] = useState(2); // Start at 100%
  const [pageDimensions, setPageDimensions] = useState(null);
  const [enableSnipping, setEnableSnipping] = useState(true); // Toggle for snipping mode

  // Initialize plugins
  const thumbnailPluginInstance = thumbnailPlugin();
  const zoomPluginInstance = zoomPlugin();

  const { Thumbnails } = thumbnailPluginInstance;
  const { zoomTo } = zoomPluginInstance;

  // Extract page dimensions when document loads (T033)
  useEffect(() => {
    if (pdfDocument) {
      // Load the PDF document from URL to extract dimensions
      const loadingTask = pdfjsLib.getDocument(pdfDocument);
      loadingTask.promise
        .then((pdfDoc) => extractPageDimensions(pdfDoc, currentPage))
        .then((dimensions) => {
          setPageDimensions(dimensions);
          announceToScreenReader(
            `PDF loaded with ${pdfMetadata.pageCount} pages. Page dimensions: ${Math.round(dimensions.width)} by ${Math.round(dimensions.height)} points.`,
            'status'
          );
        })
        .catch((err) => {
          announceToScreenReader(`Failed to extract page dimensions: ${err.message}`, 'error');
        });
    }
  }, [pdfDocument, pdfMetadata, currentPage]);

  // Zoom in handler (T030)
  const handleZoomIn = useCallback(() => {
    if (zoomLevelIndex < ZOOM_LEVELS.length - 1) {
      const newIndex = zoomLevelIndex + 1;
      const newZoom = ZOOM_LEVELS[newIndex];
      setZoomLevelIndex(newIndex);
      setZoomLevel(newZoom);
      zoomTo(newZoom);
      announceToScreenReader(`Zoomed in to ${Math.round(newZoom * 100)}%`, 'status');
    }
  }, [zoomLevelIndex, zoomTo]);

  // Zoom out handler (T030)
  const handleZoomOut = useCallback(() => {
    if (zoomLevelIndex > 0) {
      const newIndex = zoomLevelIndex - 1;
      const newZoom = ZOOM_LEVELS[newIndex];
      setZoomLevelIndex(newIndex);
      setZoomLevel(newZoom);
      zoomTo(newZoom);
      announceToScreenReader(`Zoomed out to ${Math.round(newZoom * 100)}%`, 'status');
    }
  }, [zoomLevelIndex, zoomTo]);

  // Fit to width handler
  const handleFitToWidth = useCallback(() => {
    zoomTo(SpecialZoomLevel.PageWidth);
    announceToScreenReader('Fit to width', 'status');
  }, [zoomTo]);

  // Fit to page handler
  const handleFitToPage = useCallback(() => {
    zoomTo(SpecialZoomLevel.PageFit);
    announceToScreenReader('Fit to page', 'status');
  }, [zoomTo]);

  // Page navigation handlers (T029)
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      announceToScreenReader(`Page ${currentPage - 1} of ${pdfMetadata.pageCount}`, 'status');
    }
  }, [currentPage, pdfMetadata, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pdfMetadata.pageCount) {
      setCurrentPage(currentPage + 1);
      announceToScreenReader(`Page ${currentPage + 1} of ${pdfMetadata.pageCount}`, 'status');
    }
  }, [currentPage, pdfMetadata, setCurrentPage]);

  // Keyboard navigation (T031)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Page Up/Down for page navigation
      if (e.key === 'PageUp') {
        e.preventDefault();
        handlePreviousPage();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      }
      // Arrow keys for panning are handled by the PDF viewer
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviousPage, handleNextPage]);

  if (!pdfDocument || !pdfMetadata) {
    return null;
  }

  return (
    <Worker workerUrl={PDFJS_WORKER_URL}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Thumbnail sidebar (T032) */}
        <Box
          sx={{
            width: 200,
            borderRight: 1,
            borderColor: 'divider',
            overflowY: 'auto',
            backgroundColor: 'background.default',
          }}
          role="navigation"
          aria-label="Page thumbnails"
        >
          <Thumbnails />
        </Box>

        {/* Main PDF viewer */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 1,
              borderBottom: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
            role="toolbar"
            aria-label="PDF viewer controls"
          >
            {/* Page navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Previous page (Page Up)">
                <IconButton
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  size="small"
                >
                  <ChevronLeft />
                </IconButton>
              </Tooltip>

              <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'center' }}>
                Page {currentPage} of {pdfMetadata.pageCount}
              </Typography>

              <Tooltip title="Next page (Page Down)">
                <IconButton
                  onClick={handleNextPage}
                  disabled={currentPage === pdfMetadata.pageCount}
                  aria-label="Next page"
                  size="small"
                >
                  <ChevronRight />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Zoom controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Zoom out">
                  <Button
                    onClick={handleZoomOut}
                    disabled={zoomLevelIndex === 0}
                    aria-label="Zoom out"
                  >
                    <ZoomOut fontSize="small" />
                  </Button>
                </Tooltip>

                <Button disabled sx={{ minWidth: 80 }}>
                  {Math.round(zoomLevel * 100)}%
                </Button>

                <Tooltip title="Zoom in">
                  <Button
                    onClick={handleZoomIn}
                    disabled={zoomLevelIndex === ZOOM_LEVELS.length - 1}
                    aria-label="Zoom in"
                  >
                    <ZoomIn fontSize="small" />
                  </Button>
                </Tooltip>
              </ButtonGroup>

              <Tooltip title="Fit to width">
                <IconButton onClick={handleFitToWidth} aria-label="Fit to width" size="small">
                  <FitScreen />
                </IconButton>
              </Tooltip>

              <Tooltip title="Fit to page">
                <Button onClick={handleFitToPage} size="small" variant="outlined">
                  Fit
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* PDF Viewer */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: 'grey.200',
              position: 'relative',
            }}
          >
            <Viewer
              fileUrl={pdfDocument}
              plugins={[thumbnailPluginInstance, zoomPluginInstance]}
            />

            {/* Snip Overlay for drawing rectangles */}
            {enableSnipping && pageDimensions && (
              <SnipOverlay
                scale={zoomLevel}
                pageDimensions={pageDimensions}
                pageNumber={currentPage}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Worker>
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
