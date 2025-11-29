import { createTheme } from "@mui/material/styles";

// Light theme with WCAG 2.1 AA compliance
const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#dc004e",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "rgba(0, 0, 0, 0.87)", // Contrast ratio 14.9:1 on white
      secondary: "rgba(0, 0, 0, 0.60)", // Contrast ratio 7.3:1 on white
    },
    error: {
      main: "#d32f2f",
    },
    warning: {
      main: "#ed6c02",
    },
    info: {
      main: "#0288d1",
    },
    success: {
      main: "#2e7d32",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h1: {
      fontSize: "2.5rem",
      fontWeight: 500,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 500,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          minHeight: 44, // Touch target size for accessibility
          minWidth: 44,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
      },
    },
  },
});

// High-contrast theme for accessibility
const highContrastTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9", // Lighter blue for better contrast
      contrastText: "#000000",
    },
    secondary: {
      main: "#f48fb1",
      contrastText: "#000000",
    },
    background: {
      default: "#000000",
      paper: "#121212",
    },
    text: {
      primary: "#ffffff", // Contrast ratio 21:1 on black
      secondary: "#cccccc", // Contrast ratio 12.6:1 on black
    },
    error: {
      main: "#f44336",
    },
    warning: {
      main: "#ffa726",
    },
    info: {
      main: "#29b6f6",
    },
    success: {
      main: "#66bb6a",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 16, // Larger default font size for high contrast mode
    h1: {
      fontSize: "2.75rem",
      fontWeight: 600,
    },
    h2: {
      fontSize: "2.25rem",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1.125rem",
      lineHeight: 1.6,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          minHeight: 48,
          minWidth: 48,
          border: "2px solid currentColor",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
  },
});

export { lightTheme, highContrastTheme };
