import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Summarize as SummarizeIcon,
  ContentCopy,
  FileDownload,
} from "@mui/icons-material";
import { useAppContext } from "../../contexts/AppContext";
import { summarizeTexts } from "../../services/api";
import { sanitizeSummary } from "../../utils/sanitize";
import styles from "./SummarizePanel.module.css";

export function SummarizePanel() {
  const { textBoxes, summary, setSummary } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  // Check if summarize button should be disabled
  const canSummarize = textBoxes.length > 0 && !isLoading;

  // Handle summarization
  const handleSummarize = async () => {
    if (!canSummarize) return;

    setIsLoading(true);
    setError(null);
    announceToScreenReader("Summarization in progress", "status");

    try {
      // Collect all text from text boxes
      const texts = textBoxes
        .map((box) => box.text)
        .filter((text) => text.trim().length > 0);

      if (texts.length === 0) {
        setError("No text content to summarize");
        announceToScreenReader("Error: No text content to summarize", "error");
        return;
      }

      // Call summarization API
      const summaryResult = await summarizeTexts(texts);

      // Sanitize summary text to prevent XSS attacks (FR-051)
      const sanitizedSummary = sanitizeSummary(summaryResult.summary);

      setSummary({
        text: sanitizedSummary,
        createdAt: Date.now(),
        sourceTextCount: texts.length,
      });

      announceToScreenReader("Summary generated successfully", "status");
    } catch (err) {
      const errorMessage =
        err.message || "Failed to generate summary. Please try again.";
      setError(errorMessage);
      announceToScreenReader(`Error: ${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!summary?.text) return;

    try {
      await navigator.clipboard.writeText(summary.text);
      setCopySuccess(true);
      announceToScreenReader("Summary copied to clipboard", "status");

      // Reset copy success message after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      announceToScreenReader("Failed to copy to clipboard", "error");
    }
  };

  // Handle export menu
  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  // Export as plain text
  const handleExportText = () => {
    if (!summary?.text) return;

    const blob = new Blob([summary.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    announceToScreenReader("Summary exported as text file", "status");
    handleExportClose();
  };

  // Export as JSON
  const handleExportJSON = () => {
    if (!summary) return;

    const exportData = {
      summary: summary.text,
      createdAt: new Date(summary.createdAt).toISOString(),
      sourceTextCount: summary.sourceTextCount,
      textBoxes: textBoxes.map((box) => ({
        id: box.id,
        text: box.text,
        pageNumber: box.pageNumber,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    announceToScreenReader("Summary exported as JSON file", "status");
    handleExportClose();
  };

  // Keyboard shortcut handler (Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (canSummarize) {
          handleSummarize();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canSummarize, handleSummarize]);

  return (
    <Box className={styles.container} role="region" aria-label="Summary panel">
      <Box className={styles.header}>
        <Typography variant="h6" className={styles.title}>
          Summary
        </Typography>

        <Box className={styles.actions}>
          <Tooltip
            title={
              textBoxes.length === 0
                ? "No text boxes to summarize"
                : "Summarize all text (Ctrl+Enter)"
            }
          >
            <span>
              <Button
                variant="contained"
                startIcon={
                  isLoading ? <CircularProgress size={20} /> : <SummarizeIcon />
                }
                onClick={handleSummarize}
                disabled={!canSummarize}
                aria-label="Summarize all text boxes"
                className={styles.summarizeButton}
              >
                {isLoading ? "Summarizing..." : "Summarize"}
              </Button>
            </span>
          </Tooltip>

          {summary && (
            <>
              <Tooltip title={copySuccess ? "Copied!" : "Copy to clipboard"}>
                <IconButton
                  onClick={handleCopy}
                  aria-label="Copy summary to clipboard"
                  size="small"
                  className={styles.iconButton}
                >
                  <ContentCopy />
                </IconButton>
              </Tooltip>

              <Tooltip title="Export summary">
                <IconButton
                  onClick={handleExportClick}
                  aria-label="Export summary"
                  size="small"
                  className={styles.iconButton}
                >
                  <FileDownload />
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={exportAnchorEl}
                open={Boolean(exportAnchorEl)}
                onClose={handleExportClose}
              >
                <MenuItem onClick={handleExportText}>
                  Export as Text (.txt)
                </MenuItem>
                <MenuItem onClick={handleExportJSON}>
                  Export as JSON (.json)
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>

      <Box
        className={styles.content}
        role="log"
        aria-live="polite"
        aria-atomic="true"
      >
        {error && (
          <Box className={styles.error} role="alert">
            <Typography variant="body2" color="error">
              {error}
            </Typography>
            <Button
              size="small"
              onClick={handleSummarize}
              disabled={!canSummarize}
              className={styles.retryButton}
            >
              Retry
            </Button>
          </Box>
        )}

        {isLoading && (
          <Box className={styles.loading}>
            <CircularProgress size={24} />
            <Typography variant="body2" className={styles.loadingText}>
              Generating summary...
            </Typography>
          </Box>
        )}

        {!isLoading && !error && summary && (
          <Box className={styles.summaryDisplay}>
            <Typography variant="body1" className={styles.summaryText}>
              {summary.text}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              className={styles.metadata}
            >
              Generated from {summary.sourceTextCount} text box
              {summary.sourceTextCount !== 1 ? "es" : ""} •{" "}
              {new Date(summary.createdAt).toLocaleTimeString()}
            </Typography>
          </Box>
        )}

        {!isLoading && !error && !summary && (
          <Box className={styles.emptyState}>
            <Typography variant="body2" color="text.secondary">
              {textBoxes.length === 0
                ? "Extract some text from the PDF first, then click Summarize."
                : "Click Summarize to generate a concise summary of all extracted text."}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
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
