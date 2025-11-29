import { createContext, useContext, useState } from 'react';
import { useUndo } from '../hooks/useUndo';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Initialize state with useUndo hook for comprehensive undo/redo support
  const {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearHistory,
  } = useUndo({
    pdfDocument: null, // PDF.js document object
    pdfMetadata: null, // { fileName, fileSize, pageCount, uploadTimestamp }
    currentPage: 1,
    snips: [], // Array of snip objects
    textBoxes: [], // Array of text box objects
    focusedBoxId: null,
    summary: null, // Summary object
  });

  // High-contrast mode toggle (separate from undo/redo history)
  const [highContrastMode, setHighContrastMode] = useState(false);

  // Helper functions to update specific parts of state

  const setPDFDocument = (pdfDoc, metadata) => {
    setState((prevState) => ({
      ...prevState,
      pdfDocument: pdfDoc,
      pdfMetadata: metadata,
      currentPage: 1,
      snips: [],
      textBoxes: [],
      focusedBoxId: null,
      summary: null,
    }));
  };

  const setCurrentPage = (pageNumber) => {
    setState((prevState) => ({
      ...prevState,
      currentPage: pageNumber,
    }));
  };

  const addSnip = (snip) => {
    setState((prevState) => ({
      ...prevState,
      snips: [...prevState.snips, snip],
    }));
  };

  const updateSnip = (snipId, updates) => {
    setState((prevState) => ({
      ...prevState,
      snips: prevState.snips.map((snip) =>
        snip.id === snipId ? { ...snip, ...updates } : snip
      ),
    }));
  };

  const removeSnip = (snipId) => {
    setState((prevState) => ({
      ...prevState,
      snips: prevState.snips.filter((snip) => snip.id !== snipId),
    }));
  };

  const addTextBox = (textBox) => {
    setState((prevState) => ({
      ...prevState,
      textBoxes: [...prevState.textBoxes, textBox],
    }));
  };

  const updateTextBox = (boxId, updates) => {
    setState((prevState) => ({
      ...prevState,
      textBoxes: prevState.textBoxes.map((box) =>
        box.id === boxId ? { ...box, ...updates } : box
      ),
    }));
  };

  const insertTextBox = (afterBoxId, newTextBox) => {
    setState((prevState) => {
      const index = afterBoxId
        ? prevState.textBoxes.findIndex((box) => box.id === afterBoxId)
        : -1;

      const newBoxes = [...prevState.textBoxes];
      if (index >= 0) {
        newBoxes.splice(index + 1, 0, newTextBox);
      } else {
        newBoxes.push(newTextBox);
      }

      return {
        ...prevState,
        textBoxes: newBoxes,
        focusedBoxId: newTextBox.id,
      };
    });
  };

  const deleteTextBox = (boxId) => {
    setState((prevState) => {
      const newBoxes = prevState.textBoxes.filter((box) => box.id !== boxId);
      return {
        ...prevState,
        textBoxes: newBoxes,
        focusedBoxId:
          prevState.focusedBoxId === boxId ? null : prevState.focusedBoxId,
      };
    });
  };

  const mergeTextBoxes = (boxId) => {
    setState((prevState) => {
      const currentIndex = prevState.textBoxes.findIndex(
        (box) => box.id === boxId
      );

      if (currentIndex === -1 || currentIndex === prevState.textBoxes.length - 1) {
        // Cannot merge last box or box not found
        return prevState;
      }

      const currentBox = prevState.textBoxes[currentIndex];
      const nextBox = prevState.textBoxes[currentIndex + 1];

      // Merge text content
      const mergedBox = {
        ...currentBox,
        text: `${currentBox.text}\n${nextBox.text}`,
        modifiedAt: Date.now(),
      };

      const newBoxes = [
        ...prevState.textBoxes.slice(0, currentIndex),
        mergedBox,
        ...prevState.textBoxes.slice(currentIndex + 2),
      ];

      return {
        ...prevState,
        textBoxes: newBoxes,
      };
    });
  };

  const setFocusedBox = (boxId) => {
    setState((prevState) => ({
      ...prevState,
      focusedBoxId: boxId,
    }));
  };

  const setSummary = (summaryData) => {
    setState((prevState) => ({
      ...prevState,
      summary: summaryData,
    }));
  };

  const clearAll = () => {
    clearHistory();
  };

  const value = {
    // State
    ...state,
    highContrastMode,

    // State setters
    setPDFDocument,
    setCurrentPage,
    addSnip,
    updateSnip,
    removeSnip,
    addTextBox,
    updateTextBox,
    insertTextBox,
    deleteTextBox,
    mergeTextBoxes,
    setFocusedBox,
    setSummary,
    setHighContrastMode,

    // Undo/redo
    undo,
    redo,
    canUndo,
    canRedo,

    // Clear
    clearAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
