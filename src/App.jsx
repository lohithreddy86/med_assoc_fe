import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, IconButton, Tooltip, Alert, Collapse } from "@mui/material";
import { Contrast, Close } from "@mui/icons-material";
import { AppProvider, useAppContext } from "./contexts/AppContext";
import { lightTheme, highContrastTheme } from "./theme";
import { PDFUploader } from "./components/PDFUploader/PDFUploader";
import { PDFViewerPane } from "./components/PDFViewerPane/PDFViewerPane";
import { SnipList } from "./components/SnipList/SnipList";
import { SummarizePanel } from "./components/SummarizePanel/SummarizePanel";
import { useEffect, useState } from "react";

function AppLayout() {
  const { pdfDocument } = useAppContext();

  if (!pdfDocument) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
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
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top section: PDF viewer and snip list */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
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
          borderTop: "1px solid #e0e0e0",
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
    highContrastMode,
    setHighContrastMode,
  } = useAppContext();

  // State for dismissible warnings
  const [showNoPersistenceWarning, setShowNoPersistenceWarning] = useState(
    () => {
      // Only show on first load if not previously dismissed
      return !sessionStorage.getItem("noPersistenceWarningDismissed");
    },
  );
  const [showAuthWarning, setShowAuthWarning] = useState(() => {
    return !sessionStorage.getItem("authWarningDismissed");
  });

  const handleDismissNoPersistenceWarning = () => {
    sessionStorage.setItem("noPersistenceWarningDismissed", "true");
    setShowNoPersistenceWarning(false);
  };

  const handleDismissAuthWarning = () => {
    sessionStorage.setItem("authWarningDismissed", "true");
    setShowAuthWarning(false);
  };

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Ctrl+Y: Redo
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }

      // Ctrl+N: Insert new text box
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        const newBox = {
          id: crypto.randomUUID(),
          text: "",
          pageNumber: null,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };
        insertTextBox(focusedBoxId, newBox);
      }

      // Delete: Remove focused text box
      if (e.key === "Delete" && focusedBoxId) {
        // Only if not inside an input/textarea
        if (!["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
          e.preventDefault();
          deleteTextBox(focusedBoxId);
        }
      }

      // Shift+M: Merge text boxes
      if (e.shiftKey && e.key === "M" && focusedBoxId) {
        e.preventDefault();
        mergeTextBoxes(focusedBoxId);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    canUndo,
    canRedo,
    insertTextBox,
    deleteTextBox,
    mergeTextBoxes,
    focusedBoxId,
  ]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Toolbar with accessibility toggle */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "8px 16px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#fafafa",
          flexShrink: 0,
        }}
      >
        <Tooltip
          title={
            highContrastMode
              ? "Disable high contrast mode"
              : "Enable high contrast mode"
          }
        >
          <IconButton
            onClick={() => setHighContrastMode(!highContrastMode)}
            aria-label={
              highContrastMode
                ? "Disable high contrast mode"
                : "Enable high contrast mode"
            }
            sx={{
              color: highContrastMode ? "#000" : "#1976d2",
            }}
          >
            <Contrast />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Warning banners */}
      <Collapse in={showNoPersistenceWarning}>
        <Alert
          severity="warning"
          onClose={handleDismissNoPersistenceWarning}
          sx={{ borderRadius: 0 }}
        >
          <strong>No Data Persistence:</strong> All data is lost on browser
          close or refresh. Do not use for permanent records.
        </Alert>
      </Collapse>

      <Collapse in={showAuthWarning}>
        <Alert
          severity="info"
          onClose={handleDismissAuthWarning}
          sx={{ borderRadius: 0 }}
        >
          <strong>Authentication Notice:</strong> This application has no
          authentication. Do not use with sensitive data without proper access
          controls.
        </Alert>
      </Collapse>

      {/* ARIA live regions for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        id="status-announcements"
        style={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      />
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        id="error-announcements"
        style={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
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
