import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

async function enableMocking() {
  // Only enable MSW in development
  if (process.env.NODE_ENV !== "development") {
    return;
  }

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
