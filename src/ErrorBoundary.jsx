import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed during render:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            maxWidth: "760px",
            margin: "48px auto",
            padding: "24px",
            borderRadius: "20px",
            background: "#fff",
            color: "#2b2b2b",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.08)",
            fontFamily: "Inter, sans-serif"
          }}
        >
          <h1 style={{ marginTop: 0, fontSize: "1.4rem", color: "#b93258" }}>
            App failed to load
          </h1>
          <p style={{ marginBottom: "12px" }}>
            The React app hit a runtime error before it could render.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#f7f7f7",
              padding: "14px",
              borderRadius: "12px",
              overflow: "auto"
            }}
          >
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
