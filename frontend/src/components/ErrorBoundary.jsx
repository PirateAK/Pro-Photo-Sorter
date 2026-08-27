import React from "react";

/**
 * Prevents the whole app from unmounting into a black screen when a component
 * throws. Renders a legible error card with details + a Reload button.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[PPS ErrorBoundary]", error, info);
    this.setState({ info });
  }
  componentDidMount() {
    // Catch async errors and unhandled promise rejections that React can't see —
    // this is where the "black screen after clicking a sub-folder" comes from.
    this._onError = (e) => {
      const err = e?.error || new Error(e?.message || "Unknown runtime error");
      this.setState({ error: err, info: { componentStack: `\n(global error) ${e?.filename || ""}:${e?.lineno || ""}` } });
    };
    this._onRejection = (e) => {
      const reason = e?.reason;
      const err = reason instanceof Error ? reason : new Error(String(reason || "Unhandled promise rejection"));
      this.setState({ error: err, info: { componentStack: "\n(unhandled promise rejection)" } });
    };
    window.addEventListener("error", this._onError);
    window.addEventListener("unhandledrejection", this._onRejection);
  }
  componentWillUnmount() {
    window.removeEventListener("error", this._onError);
    window.removeEventListener("unhandledrejection", this._onRejection);
  }
  reset = () => this.setState({ error: null, info: null });
  reload = () => window.location.reload();
  copyDetails = () => {
    const msg = String(this.state.error?.message || this.state.error || "Unknown error");
    const stack = this.state.info?.componentStack || this.state.error?.stack || "";
    const text = `Pro Photo Sorter Error\n\n${msg}\n${stack}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  };
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error?.message || this.state.error || "Unknown error");
    const stack = this.state.info?.componentStack || "";
    return (
      <div
        style={{
          position: "fixed", inset: 0, background: "#1a1715", color: "#f2ebe5",
          padding: 24, overflow: "auto", fontFamily: "IBM Plex Sans, sans-serif", zIndex: 9999,
        }}
        data-testid="error-boundary"
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.14em", color: "#c68a53", marginBottom: 8 }}>
            PRO PHOTO SORTER · ERROR
          </div>
          <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, marginBottom: 8 }}>
            Something went wrong loading the last action
          </h1>
          <p style={{ color: "#a69c95", marginBottom: 20, lineHeight: 1.5 }}>
            The app caught an error so it wouldn't crash silently. You can try again — most of the time a reload clears it.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button
              onClick={this.reset}
              style={{ padding: "8px 14px", background: "#c68a53", color: "#1a1715", border: 0, borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
              data-testid="error-boundary-retry"
            >
              Try again
            </button>
            <button
              onClick={this.reload}
              style={{ padding: "8px 14px", background: "transparent", color: "#f2ebe5", border: "1px solid #423a35", borderRadius: 6, cursor: "pointer" }}
              data-testid="error-boundary-reload"
            >
              Reload app
            </button>
            <button
              onClick={this.copyDetails}
              style={{ padding: "8px 14px", background: "transparent", color: "#a69c95", border: "1px solid #423a35", borderRadius: 6, cursor: "pointer" }}
              data-testid="error-boundary-copy"
            >
              Copy details
            </button>
          </div>
          <div style={{ background: "#26221f", border: "1px solid #423a35", borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#a69c95", marginBottom: 6 }}>DETAILS</div>
            <pre style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#f2ebe5", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
{msg}
{stack ? `\n\nComponent stack:${stack}` : ""}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}
