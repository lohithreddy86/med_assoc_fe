import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

/**
 * Conditionally enable MSW (Mock Service Worker) for API mocking
 *
 * MSW is enabled when:
 * - NODE_ENV is "development" AND
 * - REACT_APP_USE_MOCK_API is "true"
 *
 * To use real backend API, set REACT_APP_USE_MOCK_API=false in .env.local
 */
async function enableMocking() {
  // Only enable MSW in development when explicitly requested
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  // Check if mock API is enabled (defaults to false for real backend)
  const useMockApi = process.env.REACT_APP_USE_MOCK_API === "true";

  if (!useMockApi) {
    console.log(
      "[API] Using real backend at:",
      process.env.REACT_APP_API_BASE_URL || "http://localhost:8000",
    );
    return;
  }

  console.log("[API] Using mock API (MSW)");
  const { worker } = await import("./mocks/browser");

  // Start the worker
  return worker.start({
    onUnhandledRequest: "bypass",
  });
}

enableMocking().then(() => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
