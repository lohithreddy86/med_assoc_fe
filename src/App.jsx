import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { lightTheme, highContrastTheme } from './theme';
import { PDFUploader } from './components/PDFUploader/PDFUploader';
import { PDFViewerPane } from './components/PDFViewerPane/PDFViewerPane';
import { SnipList } from './components/SnipList/SnipList';
import { SummarizePanel } from './components/SummarizePanel/SummarizePanel';
import { useEffect } from 'react';

function AppLayout() {
  const { pdfDocument } = useAppContext();

  if (!pdfDocument) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <PDFUploader />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top section: PDF viewer and snip list */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <PDFViewerPane />
        <Box
          sx={{
            width: 400,
            flexShrink: 0,
          }}
        >
          <SnipList />
        </Box>
      </Box>

      {/* Bottom section: Summary panel */}
      <Box
        sx={{
          height: 250,
          flexShrink: 0,
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <SummarizePanel />
      </Box>
    </Box>
  );
}

function AppContent() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    insertTextBox,
    deleteTextBox,
    mergeTextBoxes,
    focusedBoxId,
  } = useAppContext();

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Ctrl+Y: Redo
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }

      // Ctrl+N: Insert new text box
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const newBox = {
          id: crypto.randomUUID(),
          text: '',
          pageNumber: null,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };
        insertTextBox(focusedBoxId, newBox);
      }

      // Delete: Remove focused text box
      if (e.key === 'Delete' && focusedBoxId) {
        // Only if not inside an input/textarea
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault();
          deleteTextBox(focusedBoxId);
        }
      }

      // Shift+M: Merge text boxes
      if (e.shiftKey && e.key === 'M' && focusedBoxId) {
        e.preventDefault();
        mergeTextBoxes(focusedBoxId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, insertTextBox, deleteTextBox, mergeTextBoxes, focusedBoxId]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* ARIA live regions for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        id="status-announcements"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        id="error-announcements"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />

      {/* Main application content */}
      <AppLayout />
    </Box>
  );
}

function App() {
  return (
    <AppProvider>
      <AppWithTheme />
    </AppProvider>
  );
}

function AppWithTheme() {
  const { highContrastMode } = useAppContext();
  const theme = highContrastMode ? highContrastTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
