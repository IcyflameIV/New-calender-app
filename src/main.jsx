import React from "react";
import { createRoot } from "react-dom/client";
import "../style.css";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const rootElement = document.getElementById("root");

window.addEventListener("error", (event) => {
  console.error("Unhandled window error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
