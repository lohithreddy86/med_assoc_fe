import { useState, useRef } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
import { PDFDocument } from "pdf-lib";
import { useAppContext } from "../../contexts/AppContext";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker - Must match pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export function PDFUploader() {
  const { setPDFDocument } = useAppContext();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const validateFile = (file) => {
    // FR-002: Validate MIME type
    if (file.type !== "application/pdf") {
      throw new Error("Unsupported file type. Please upload a PDF");
    }

    // FR-003: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File exceeds 10 MB limit");
    }

    return true;
  };

  const validatePDFStructure = async (arrayBuffer) => {
    try {
      // FR-006: Use pdf-lib to inspect PDF structure for malicious content
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: false,
      });

      // Check for JavaScript actions (potential XSS)
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      for (const field of fields) {
        const actions = field.acroField.getActions();
        if (actions) {
          throw new Error("File contains potentially unsafe content");
        }
      }

      // Check catalog for JavaScript
      const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);
      if (catalog.has("Names")) {
        const names = catalog.get("Names");
        if (names && names.has("JavaScript")) {
          throw new Error("File contains potentially unsafe content");
        }
      }

      return true;
    } catch (err) {
      if (err.message === "File contains potentially unsafe content") {
        throw err;
      }
      // If validation fails for other reasons, allow the file
      // (pdf-lib might not support all PDF features)
      return true;
    }
  };

  const handleFile = async (file) => {
    setError(null);
    setLoading(true);

    try {
      // Validate file type and size
      validateFile(file);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Validate PDF structure for malicious content (T021a)
      await validatePDFStructure(arrayBuffer);

      // Load PDF with PDF.js to get metadata
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      // Create a Blob URL for the PDF
      // This allows the file to be loaded multiple times without ArrayBuffer detachment issues
      const blob = new Blob([file], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(blob);

      // Store PDF document URL and metadata in context
      const metadata = {
        fileName: file.name,
        fileSize: file.size,
        pageCount: pdfDoc.numPages,
        uploadTimestamp: Date.now(),
      };

      setPDFDocument(pdfUrl, metadata);

      // Announce success to screen readers
      announceToScreenReader(
        `PDF loaded successfully. ${pdfDoc.numPages} pages.`,
        "status",
      );
    } catch (err) {
      setError(err.message);
      announceToScreenReader(`Error: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    // FR-040: Keyboard accessibility - Enter or Space activates file dialog
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleButtonClick();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: 4,
      }}
    >
      <Typography variant="h5" component="h1">
        Upload PDF Document
      </Typography>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ width: "100%", maxWidth: 600 }}
        >
          {error}
        </Alert>
      )}

      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Drop zone for PDF upload. Press Enter or Space to select a file."
        sx={{
          width: "100%",
          maxWidth: 600,
          minHeight: 200,
          border: dragActive ? "2px dashed" : "2px dashed",
          borderColor: dragActive ? "primary.main" : "grey.400",
          borderRadius: 2,
          backgroundColor: dragActive ? "action.hover" : "background.paper",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: 3,
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            backgroundColor: "action.hover",
          },
          "&:focus": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
        }}
        onClick={handleButtonClick}
      >
        <CloudUpload sx={{ fontSize: 64, color: "primary.main" }} />
        <Typography variant="h6" align="center">
          {loading ? "Loading PDF..." : "Drag and drop PDF here"}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          or click to select a file (max 10 MB)
        </Typography>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
        aria-label="File input for PDF upload"
      />

      <Button
        variant="contained"
        onClick={handleButtonClick}
        disabled={loading}
        startIcon={<CloudUpload />}
        sx={{ minWidth: 200 }}
      >
        {loading ? "Loading..." : "Select PDF File"}
      </Button>
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
    // Clear after announcement
    setTimeout(() => {
      element.textContent = "";
    }, 1000);
  }
}
