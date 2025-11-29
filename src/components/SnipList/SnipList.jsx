import { useEffect, useRef } from 'react';
import { Box, TextField, Typography, IconButton, Tooltip } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import styles from './SnipList.module.css';

export function SnipList() {
  const { textBoxes, focusedBoxId, setFocusedBox, updateTextBox, deleteTextBox } = useAppContext();
  const focusedRef = useRef(null);

  // Auto-focus the focused text box
  useEffect(() => {
    if (focusedRef.current) {
      focusedRef.current.focus();
    }
  }, [focusedBoxId]);

  // Handle text change
  const handleTextChange = (boxId, newText) => {
    updateTextBox(boxId, { text: newText, modifiedAt: Date.now() });
  };

  // Handle focus (single-click focus model per clarification #1)
  const handleFocus = (boxId) => {
    setFocusedBox(boxId);
  };

  // Handle delete
  const handleDelete = (boxId) => {
    deleteTextBox(boxId);
    announceToScreenReader('Text box deleted', 'status');
  };

  // Keyboard navigation (Tab/Shift+Tab)
  const handleKeyDown = (e, index) => {
    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move to previous text box
        if (index > 0) {
          setFocusedBox(textBoxes[index - 1].id);
        }
      } else {
        // Tab: Move to next text box
        if (index < textBoxes.length - 1) {
          setFocusedBox(textBoxes[index + 1].id);
        }
      }
    }
  };

  if (textBoxes.length === 0) {
    return (
      <Box
        className={styles.emptyState}
        role="region"
        aria-label="Extracted text boxes"
      >
        <Typography variant="body2" color="text.secondary">
          No text boxes yet. Draw rectangles on the PDF to extract text.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className={styles.container}
      role="region"
      aria-label="Extracted text boxes"
    >
      <Typography variant="h6" className={styles.header}>
        Extracted Text ({textBoxes.length})
      </Typography>

      <Box className={styles.list}>
        {textBoxes.map((box, index) => (
          <Box
            key={box.id}
            className={`${styles.textBoxItem} ${
              box.id === focusedBoxId ? styles.focused : ''
            }`}
            data-box-id={box.id}
          >
            <Box className={styles.textBoxHeader}>
              <Typography
                variant="caption"
                className={styles.pageLabel}
                id={`textbox-label-${box.id}`}
              >
                Page {box.pageNumber} • Box {index + 1}
              </Typography>
              <Tooltip title="Delete text box (Delete key)">
                <IconButton
                  size="small"
                  onClick={() => handleDelete(box.id)}
                  aria-label={`Delete text box ${index + 1}`}
                  className={styles.deleteButton}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              multiline
              fullWidth
              minRows={3}
              maxRows={10}
              value={box.text}
              onChange={(e) => handleTextChange(box.id, e.target.value)}
              onFocus={() => handleFocus(box.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              inputRef={box.id === focusedBoxId ? focusedRef : null}
              aria-labelledby={`textbox-label-${box.id}`}
              aria-describedby={`textbox-help-${box.id}`}
              className={styles.textField}
              placeholder="Extracted text will appear here..."
            />

            <Typography
              variant="caption"
              color="text.secondary"
              id={`textbox-help-${box.id}`}
              className={styles.helpText}
            >
              Press Tab to move to next box • Shift+Tab for previous
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
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
