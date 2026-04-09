import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(String(apiUrl));
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>렌더링 오류</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {err.message}
            {"\n\n"}
            {err.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
