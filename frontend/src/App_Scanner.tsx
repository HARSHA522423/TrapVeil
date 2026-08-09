import "./App.css";
import Dashboard from "./Dashboard";
import { useState, useRef, type ChangeEvent } from "react";

interface Threat {
  name: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string;
}

interface HistoryItem {
  id: string;
  type: "message" | "image";
  input?: string | null;
  filename?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  riskScore: number;
  decision: "PROCEED" | "REVIEW" | "STOP";
  category: string;
  summary: string;
  createdAt: string;
}

interface TrapVeilReport {
  riskScore: number;
  decision: "PROCEED" | "REVIEW" | "STOP";
  category: string;
  summary: string;
  threats: Threat[];
  financialImpact: string;
  privacyImpact: string;
  explanation: string;
  recommendation: string;
}

function App() {
  // =========================================================
  // BASIC STATE
  // =========================================================

  const [message, setMessage] = useState("");
  const [report, setReport] = useState<TrapVeilReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // IMAGE STATE
  // =========================================================

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // =========================================================
  // HISTORY STATE
  // =========================================================

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const historyRef = useRef<HTMLElement | null>(null);

  // =========================================================
  // ACTIVE SCANNER
  // =========================================================

  const [activeScanner, setActiveScanner] = useState<
    "message" | "image"
  >("message");

  const [showDashboard, setShowDashboard] = useState(false);

  // =========================================================
  // LOAD HISTORY
  // =========================================================

  const loadHistory = async () => {
    setHistoryLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://192.168.0.100:8000/api/history"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load history."
        );
      }

      setHistory(data.history || []);
      setShowHistory(true);

      setTimeout(() => {
        historyRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // =========================================================
  // MESSAGE ANALYZER
  // =========================================================

  const analyzeMessage = async () => {
    if (!message.trim()) {
      setError("Please enter a message to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/analyze/message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Analysis failed."
        );
      }

      setReport(data.report);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // IMAGE SELECTION
  // =========================================================

  const handleImageSelect = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB.");
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setError("");
    setReport(null);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // =========================================================
  // IMAGE ANALYZER
  // =========================================================

  const analyzeImage = async () => {
    if (!selectedImage) {
      setError("Please upload a screenshot first.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const formData = new FormData();

      formData.append("file", selectedImage);

      const response = await fetch(
        "http://127.0.0.1:8000/api/analyze/image",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Screenshot analysis failed."
        );
      }

      setReport(data.report);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Screenshot analysis failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // DECISION ICON
  // =========================================================

  const getDecisionIcon = () => {
    if (!report) {
      return "";
    }

    if (report.decision === "STOP") {
      return "🛑";
    }

    if (report.decision === "REVIEW") {
      return "🟡";
    }

    return "🟢";
  };

  // =========================================================
  // DECISION CLASS
  // =========================================================

  const getDecisionClass = () => {
    if (!report) {
      return "";
    }

    return `decision-${report.decision.toLowerCase()}`;
  };

  // =========================================================
  // CLEAR IMAGE
  // =========================================================

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview(null);
    setReport(null);
    setError("");
  };

  // =========================================================
  // CLOSE HISTORY
  // =========================================================

  const closeHistory = () => {
    setShowHistory(false);
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  // =========================================================
  // SWITCH SCANNER
  // =========================================================

  const switchScanner = (
    scanner: "message" | "image"
  ) => {
    setActiveScanner(scanner);
    setError("");
    setReport(null);
  };

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">

        <div className="logo">
          <span className="logo-shield">🛡️</span>

          <span className="logo-text">
            Trap<span>Veil</span>
          </span>
        </div>

        <div className="tagline">
          AI Digital Decision Firewall
        </div>

        <button
          type="button"
          className="history-button"
          onClick={loadHistory}
          disabled={historyLoading}
        >
          <span className="history-icon">▤</span>

          <span>
            {historyLoading
              ? "Loading..."
              : "History"}
          </span>
        </button>

        <button
          type="button"
          className="dashboard-nav-button"
          onClick={() => setShowDashboard(true)}
        >
          <span className="dashboard-nav-icon">▦</span>
          <span>Dashboard</span>
        </button>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      {showDashboard ? (
        <Dashboard onBackToScanner={() => setShowDashboard(false)} />
      ) : (
        <main className="container">

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="hero">

          <div className="badge">
            <span className="badge-dot"></span>

            <span>
              AI-POWERED DIGITAL SAFETY
            </span>
          </div>

          <h1>
            See what's hidden
            <br />
            <span className="hero-gradient">
              before you act.
            </span>
          </h1>

          <p>
            TrapVeil analyzes messages and screenshots
            to reveal scams, manipulation, financial risks,
            and deceptive patterns before they cost you.
          </p>

          <div className="hero-meta">

            <div className="hero-meta-item">
              <span>✦</span>
              AI Risk Analysis
            </div>

            <div className="hero-meta-item">
              <span>◉</span>
              Real-time Detection
            </div>

            <div className="hero-meta-item">
              <span>⌁</span>
              Privacy Focused
            </div>

          </div>

        </section>

        {/* ===================================================
            PREMIUM SCANNER SWITCH
        =================================================== */}

        <div className="premium-scanner-switch">

          <button
            type="button"
            className={
              activeScanner === "message"
                ? "premium-scanner-tab active"
                : "premium-scanner-tab"
            }
            onClick={() => switchScanner("message")}
          >

            <span className="premium-scanner-icon">
              💬
            </span>

            <span className="premium-scanner-text">
              <strong>
                Message Scanner
              </strong>

              <small>
                Analyze text & messages
              </small>
            </span>

            {activeScanner === "message" && (
              <span className="scanner-active-dot"></span>
            )}

          </button>

          <button
            type="button"
            className={
              activeScanner === "image"
                ? "premium-scanner-tab active"
                : "premium-scanner-tab"
            }
            onClick={() => switchScanner("image")}
          >

            <span className="premium-scanner-icon">
              🖼️
            </span>

            <span className="premium-scanner-text">
              <strong>
                Screenshot Scanner
              </strong>

              <small>
                Analyze images & screenshots
              </small>
            </span>

            {activeScanner === "image" && (
              <span className="scanner-active-dot"></span>
            )}

          </button>

        </div>

        {/* ===================================================
            MESSAGE SCANNER
        =================================================== */}

        {activeScanner === "message" && (

          <section className="scanner-card premium-scanner-card">

            <div className="scanner-card-glow"></div>

            <div className="scanner-header">

              <div>

                <div className="scanner-eyebrow">
                  TEXT INTELLIGENCE
                </div>

                <h2>
                  Message Scanner
                </h2>

                <p>
                  Paste a suspicious message, offer,
                  job notification, payment request,
                  or social engineering attempt.
                </p>

              </div>

              <div className="premium-card-icon message-icon">
                💬
              </div>

            </div>

            <div className="textarea-wrapper">

              <div className="textarea-topbar">

                <span className="textarea-status">
                  <span></span>
                  Ready for analysis
                </span>

                <span className="textarea-security">
                  🔒 Secure
                </span>

              </div>

              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                placeholder="Paste the message you want TrapVeil to analyze..."
                rows={8}
              />

              <div className="textarea-footer">

                <span>
                  {message.length} characters
                </span>

                <span>
                  TrapVeil AI
                </span>

              </div>

            </div>

            {error && (

              <div className="premium-error">
                <span>⚠</span>

                <span>
                  {error}
                </span>
              </div>

            )}

            <button
              type="button"
              className="premium-analyze-button"
              onClick={analyzeMessage}
              disabled={loading}
            >

              <span className="analyze-sweep"></span>

              <span className="analyze-icon">
                🛡️
              </span>

              <span className="analyze-content">

                <strong>
                  {loading
                    ? "Analyzing with TrapVeil..."
                    : "Analyze with TrapVeil"}
                </strong>

                <small>
                  AI-powered digital safety analysis
                </small>

              </span>

              <span className="analyze-arrow">
                →
              </span>

            </button>

            <div className="scanner-trust-row">

              <span>
                ✓ Scam detection
              </span>

              <span>
                ✓ Manipulation analysis
              </span>

              <span>
                ✓ Risk scoring
              </span>

            </div>

          </section>

        )}

        {/* ===================================================
            SCREENSHOT SCANNER
        =================================================== */}

        {activeScanner === "image" && (

          <section className="scanner-card premium-scanner-card">

            <div className="scanner-card-glow"></div>

            <div className="scanner-header">

              <div>

                <div className="scanner-eyebrow">
                  VISUAL INTELLIGENCE
                </div>

                <h2>
                  Screenshot Scanner
                </h2>

                <p>
                  Upload a website, checkout page,
                  subscription, advertisement, payment
                  request, or suspicious screenshot.
                </p>

              </div>

              <div className="premium-card-icon image-icon">
                🖼️
              </div>

            </div>

            {/* Upload Area */}

            <label className="premium-upload-area">

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageSelect}
                hidden
              />

              {!imagePreview ? (

                <div className="premium-upload-content">

                  <div className="upload-orbit">

                    <div className="upload-icon">
                      ↑
                    </div>

                  </div>

                  <h3>
                    Drop your screenshot here
                  </h3>

                  <p>
                    or click to browse from your device
                  </p>

                  <div className="upload-format-row">

                    <span>PNG</span>
                    <span>JPG</span>
                    <span>WEBP</span>

                    <em>
                      Max 10 MB
                    </em>

                  </div>

                </div>

              ) : (

                <div className="premium-image-preview-container">

                  <img
                    src={imagePreview}
                    alt="Selected screenshot"
                    className="premium-image-preview"
                  />

                  <div className="image-overlay">

                    <span>
                      Screenshot ready
                    </span>

                  </div>

                </div>

              )}

            </label>

            {/* Selected File */}

            {selectedImage && (

              <div className="premium-selected-file">

                <div className="selected-file-info">

                  <span className="file-icon">
                    ◫
                  </span>

                  <div>

                    <strong>
                      {selectedImage.name}
                    </strong>

                    <small>
                      {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </small>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Remove image"
                >
                  ×
                </button>

              </div>

            )}

            {error && (

              <div className="premium-error">
                <span>⚠</span>

                <span>
                  {error}
                </span>
              </div>

            )}

            <button
              type="button"
              className="premium-analyze-button"
              onClick={analyzeImage}
              disabled={loading || !selectedImage}
            >

              <span className="analyze-sweep"></span>

              <span className="analyze-icon">
                🛡️
              </span>

              <span className="analyze-content">

                <strong>
                  {loading
                    ? "Scanning screenshot..."
                    : "Analyze with TrapVeil"}
                </strong>

                <small>
                  AI-powered visual safety analysis
                </small>

              </span>

              <span className="analyze-arrow">
                →
              </span>

            </button>

            <div className="scanner-trust-row">

              <span>
                ✓ Visual threat detection
              </span>

              <span>
                ✓ OCR analysis
              </span>

              <span>
                ✓ Risk scoring
              </span>

            </div>

          </section>

        )}

        {/* ===================================================
            HISTORY
        =================================================== */}

        {showHistory && (

          <section
            ref={historyRef}
            className="scanner-card history-section premium-history"
          >

            <div className="scanner-header">

              <div>

                <div className="scanner-eyebrow">
                  MONGODB STORAGE
                </div>

                <h2>
                  Scan History
                </h2>

                <p>
                  Previous TrapVeil analyses stored securely
                  in MongoDB.
                </p>

              </div>

              <button
                type="button"
                className="history-close"
                onClick={closeHistory}
              >
                ×
              </button>

            </div>

            {history.length === 0 ? (

              <div className="info-card">
                No scan history found.
              </div>

            ) : (

              <div className="threat-grid">

                {history.map((item) => (

                  <div
                    className="threat-card history-card"
                    key={item.id}
                  >

                    <div className="threat-top">

                      <strong>
                        {item.type === "image"
                          ? "🖼️ Screenshot Scan"
                          : "💬 Message Scan"}
                      </strong>

                      <span
                        className={`severity ${
                          item.decision === "STOP"
                            ? "critical"
                            : item.decision === "REVIEW"
                            ? "medium"
                            : "low"
                        }`}
                      >
                        {item.decision}
                      </span>

                    </div>

                    <p>
                      <strong>
                        Risk Score:
                      </strong>{" "}
                      <span className="history-score">
                        {item.riskScore}
                      </span>
                      /100
                    </p>

                    <p>
                      <strong>
                        Category:
                      </strong>{" "}
                      {item.category
                        ? item.category.replaceAll(
                            "_",
                            " "
                          )
                        : "Unknown"}
                    </p>

                    {item.input && (
                      <p>
                        {item.input}
                      </p>
                    )}

                    {item.filename && (
                      <p>
                        📎 {item.filename}
                      </p>
                    )}

                    <p>
                      {item.summary}
                    </p>

                    <small>
                      {formatDate(item.createdAt)}
                    </small>

                  </div>

                ))}

              </div>

            )}

          </section>

        )}

        {/* ===================================================
            LOADING
        =================================================== */}

        {loading && (

          <section className="loading-card premium-loading">

            <div className="loading-background-grid"></div>

            <div className="scan-animation">

              <div className="scan-ring ring-one"></div>

              <div className="scan-ring ring-two"></div>

              <div className="scan-ring ring-three"></div>

              <div className="scan-shield">
                🛡️
              </div>

            </div>

            <div className="loading-eyebrow">
              TRAPVEIL AI ENGINE
            </div>

            <h3>
              Analyzing beneath the surface...
            </h3>

            <p className="loading-main">
              Looking for hidden risks, deceptive patterns,
              and manipulation signals.
            </p>

            <div className="analysis-steps">

              <div className="analysis-step active">
                <span>✓</span>
                Reading content
              </div>

              <div className="analysis-step active">
                <span>✓</span>
                Detecting deceptive patterns
              </div>

              <div className="analysis-step scanning">
                <span>◌</span>
                Evaluating risk
              </div>

              <div className="analysis-step">
                <span>○</span>
                Building safety recommendation
              </div>

            </div>

            <div className="loading-warning">
              🧠 AI analysis may take a few seconds
            </div>

          </section>

        )}

        {/* ===================================================
            RESULT
        =================================================== */}

        {report && !loading && (

          <section className="result">

            {/* Result Header */}

            <div className="result-title">

              <div className="result-title-left">

                <span className="result-eyebrow">
                  TRAPVEIL ANALYSIS
                </span>

                <span className="result-live">
                  <span></span>
                  ANALYSIS COMPLETE
                </span>

              </div>

              <span className="category">
                {report.category
                  ? report.category.replaceAll(
                      "_",
                      " "
                    )
                  : "UNKNOWN"}
              </span>

            </div>

            {/* =================================================
                RISK SCORE
            ================================================= */}

            <div
              className={`risk-card premium-risk-card ${getDecisionClass()}`}
            >

              <div className="risk-score">

                <strong>
                  {report.riskScore}
                </strong>

                <span>
                  /100
                </span>

              </div>

              <div className="risk-info">

                <div className="decision">

                  <span className="decision-icon">
                    {getDecisionIcon()}
                  </span>

                  <span>
                    {report.decision}
                  </span>

                </div>

                <p>
                  {report.summary}
                </p>

              </div>

              <div className="risk-pulse"></div>

            </div>

            {/* =================================================
                THREATS
            ================================================= */}

            <div className="section">

              <div className="section-heading">

                <div>
                  <span className="section-eyebrow">
                    THREAT INTELLIGENCE
                  </span>

                  <h2>
                    🚨 Detected Threats
                  </h2>
                </div>

                <span className="threat-count">
                  {report.threats?.length || 0}
                </span>

              </div>

              <div className="threat-grid">

                {report.threats &&
                  report.threats.map(
                    (threat, index) => (

                      <div
                        className="threat-card premium-threat-card"
                        key={index}
                      >

                        <div className="threat-top">

                          <strong>
                            {threat.name}
                          </strong>

                          <span
                            className={`severity ${threat.severity.toLowerCase()}`}
                          >
                            {threat.severity}
                          </span>

                        </div>

                        <p>
                          {threat.evidence}
                        </p>

                      </div>

                    )
                  )}

              </div>

            </div>

            {/* =================================================
                EXPLANATION
            ================================================= */}

            <div className="section">

              <div className="section-heading">

                <div>

                  <span className="section-eyebrow">
                    AI REASONING
                  </span>

                  <h2>
                    🔎 Why is this risky?
                  </h2>

                </div>

              </div>

              <div className="info-card premium-info-card">
                {report.explanation}
              </div>

            </div>

            {/* =================================================
                IMPACT
            ================================================= */}

            <div className="impact-grid">

              <div className="impact-card premium-impact-card">

                <span>
                  💰 Financial Impact
                </span>

                <strong>
                  {report.financialImpact}
                </strong>

              </div>

              <div className="impact-card premium-impact-card">

                <span>
                  🔐 Privacy Impact
                </span>

                <strong>
                  {report.privacyImpact}
                </strong>

              </div>

            </div>

            {/* =================================================
                RECOMMENDATION
            ================================================= */}

            <div className="recommendation premium-recommendation">

              <div className="recommendation-icon">
                🛡️
              </div>

              <div>

                <span className="section-eyebrow">
                  SAFETY GUIDANCE
                </span>

                <h2>
                  What should you do?
                </h2>

                <p>
                  {report.recommendation}
                </p>

              </div>

            </div>

          </section>

        )}

      </main>

        
      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="premium-footer">

        <div>
          <span className="footer-shield">
            🛡️
          </span>

          <strong>
            TrapVeil
          </strong>
        </div>

        <span>
          AI-powered digital safety
        </span>

      </footer>

    </div>
  );
}

export default App;