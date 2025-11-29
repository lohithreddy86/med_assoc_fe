import { useState, useCallback } from 'react';

/**
 * useUndo - Comprehensive undo/redo hook using command pattern
 *
 * Maintains a 50-action FIFO circular buffer for undo history.
 * When the 51st action is added, the oldest action is dropped.
 *
 * Supports all user actions:
 * - Snip creation/deletion
 * - Text box operations (insert, delete, merge)
 * - Text edits
 *
 * @param {*} initialState - Initial state value
 * @returns {Object} { state, setState, undo, redo, canUndo, canRedo, clear }
 */
export function useUndo(initialState) {
  const [state, setStateInternal] = useState(initialState);
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const HISTORY_LIMIT = 50;

  /**
   * Set new state and add to history
   * Implements FIFO circular buffer with 50-action limit
   */
  const setState = useCallback(
    (newState) => {
      setStateInternal((prevState) => {
        const nextState =
          typeof newState === 'function' ? newState(prevState) : newState;

        setHistory((prevHistory) => {
          // Remove any future history if we're not at the end
          const truncatedHistory = prevHistory.slice(0, currentIndex + 1);

          // Add new state
          let newHistory = [...truncatedHistory, nextState];

          // Implement FIFO circular buffer - drop oldest if exceeds limit
          if (newHistory.length > HISTORY_LIMIT) {
            newHistory = newHistory.slice(newHistory.length - HISTORY_LIMIT);
            // Adjust currentIndex since we dropped the oldest item
            setCurrentIndex(HISTORY_LIMIT - 1);
          } else {
            setCurrentIndex(truncatedHistory.length);
          }

          return newHistory;
        });

        return nextState;
      });
    },
    [currentIndex]
  );

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setStateInternal(history[newIndex]);
    }
  }, [currentIndex, history]);

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setStateInternal(history[newIndex]);
    }
  }, [currentIndex, history]);

  /**
   * Check if undo is available
   */
  const canUndo = currentIndex > 0;

  /**
   * Check if redo is available
   */
  const canRedo = currentIndex < history.length - 1;

  /**
   * Clear history and reset to initial state
   */
  const clear = useCallback(() => {
    setHistory([initialState]);
    setCurrentIndex(0);
    setStateInternal(initialState);
  }, [initialState]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  };
}
